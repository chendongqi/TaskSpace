// lib/topic-tree.js
// 课题拆解树 - 独立功能
// 不与 dailyTasks/goals 等现有业务数据关联。
// 直接对 Supabase 表 `ts_topic_nodes` 做 CRUD，数据以扁平行(rows)的形式
// 从服务端返回，这里提供：
//   1. 扁平数组 <-> 树结构 互转
//   2. 递归进度汇总（post-order，自底向上）
//   3. 对 ts_topic_nodes 表的递归 CRUD 辅助函数（增删改、任意深度查找）
//
// 使用方式：组件内通过 `useSupabaseClient()` 拿到 supabase client 实例，
// 传入下面的函数即可，本文件不直接 import 任何 supabase 包。

/**
 * 叶子节点进度：由 status 推导
 * todo = 0, in_progress = 50, done = 100
 */
export function statusToProgress(status) {
  if (status === "done") return 100;
  if (status === "in_progress") return 50;
  return 0;
}

/**
 * 由 0-100 的进度推导三态 status（用于兜底展示，非强制写回）
 */
export function progressToStatus(progress) {
  if (progress >= 100) return "done";
  if (progress > 0) return "in_progress";
  return "todo";
}

/**
 * 将数据库返回的扁平行数组（同一棵课题树内的所有节点）组装成树结构。
 * 每个节点会被赋予 children 数组（按 sort_order 升序排列）。
 *
 * @param {Array} rows - 扁平行数组，每行至少包含 id/parent_id/sort_order
 * @returns {Array} 根节点数组（parent_id 为 null 的节点，通常只有一个）
 */
export function buildTree(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const nodeMap = new Map();
  rows.forEach((row) => {
    nodeMap.set(row.id, { ...row, children: [] });
  });

  const roots = [];
  nodeMap.forEach((node) => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 递归按 sort_order 排序
  const sortChildren = (node) => {
    node.children.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    node.children.forEach(sortChildren);
  };
  roots.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  roots.forEach(sortChildren);

  return roots;
}

/**
 * 将树结构转回扁平数组（深度优先），用于批量写回/统计等场景。
 * 不会修改原节点对象上的 children 字段。
 *
 * @param {Array} tree - 树结构（buildTree 的输出，或兼容结构）
 * @returns {Array} 扁平行数组（不含 children 字段）
 */
export function flattenTree(tree) {
  const result = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      const { children, ...rest } = node;
      result.push(rest);
      if (children && children.length > 0) {
        walk(children);
      }
    });
  };
  walk(tree || []);
  return result;
}

/**
 * 递归进度汇总（post-order，自底向上）。
 * - 叶子节点：进度 = statusToProgress(status)
 * - 父节点：进度 = 子节点进度的简单平均（四舍五入到整数）
 *
 * 返回一棵「新树」，每个节点带有计算后的 `progress` 字段（不修改入参）。
 * 同时在每个节点上附加统计字段，供详情视图统计行使用：
 *   nodeCount: 该节点为根的子树节点总数（含自身）
 *   doneCount: 该节点为根的子树中 status === 'done' 的节点数
 *   depth: 该节点为根的子树最大深度（叶子自身深度为1）
 *
 * @param {Array} tree - buildTree() 的输出
 * @returns {Array} 带汇总字段的新树
 */
export function calculateTreeProgress(tree) {
  const visit = (node) => {
    if (!node.children || node.children.length === 0) {
      return {
        ...node,
        children: [],
        progress: statusToProgress(node.status),
        nodeCount: 1,
        doneCount: node.status === "done" ? 1 : 0,
        depth: 1,
      };
    }

    const computedChildren = node.children.map(visit);
    const avgProgress =
      computedChildren.reduce((sum, c) => sum + c.progress, 0) /
      computedChildren.length;

    return {
      ...node,
      children: computedChildren,
      progress: Math.round(avgProgress),
      nodeCount:
        1 + computedChildren.reduce((sum, c) => sum + c.nodeCount, 0),
      doneCount: computedChildren.reduce((sum, c) => sum + c.doneCount, 0) +
        (node.status === "done" ? 1 : 0),
      depth: 1 + Math.max(...computedChildren.map((c) => c.depth)),
    };
  };

  return (tree || []).map(visit);
}

/**
 * 在树中递归查找指定 id 的节点。
 */
export function findNodeInTree(tree, id) {
  for (const node of tree || []) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 汇总整棵课题树（给卡片网格用）：节点数/已完成数/层级深度/整体进度。
 * @param {Array} rows - 单棵课题树的扁平行
 */
export function summarizeTopicTree(rows) {
  const tree = calculateTreeProgress(buildTree(rows));
  if (tree.length === 0) {
    return { nodeCount: 0, doneCount: 0, depth: 0, progress: 0, tree: [] };
  }
  // 一棵课题树理论上只有一个根节点
  const root = tree[0];
  return {
    nodeCount: root.nodeCount,
    doneCount: root.doneCount,
    depth: root.depth,
    progress: root.progress,
    tree,
    root,
  };
}

// =====================================================
// 对 ts_topic_nodes 表的递归 CRUD 辅助函数
// =====================================================
// 以下函数均接收 supabase client 作为第一个参数（由调用方通过
// useSupabaseClient() 拿到），不在本文件内创建 client。

const TABLE = "ts_topic_nodes";

/**
 * 拉取某用户所有未删除的课题节点（扁平行），按 topic_root_id 分组后
 * 即可在前端用 buildTree 还原出多棵课题树。
 */
export async function fetchAllTopicNodes(supabase, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * 拉取单棵课题树的所有节点（根节点 + 所有后代）。
 */
export async function fetchTopicTree(supabase, userId, topicRootId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("topic_root_id", topicRootId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * 新建一个根节点（新课题）。topic_root_id 需要在插入后回填为自身 id，
 * 这里采用「先插入拿到 id，再 update 回填 topic_root_id」的两步法，
 * 避免依赖数据库端触发器。
 */
export async function createTopicRoot(
  supabase,
  userId,
  { title, description = "", assignee = null, plannedStart = null, plannedEnd = null, dependsOn = [], comment = null, priority = null } = {}
) {
  const { data: inserted, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      parent_id: null,
      topic_root_id: "00000000-0000-0000-0000-000000000000", // 占位，立刻回填
      title,
      description,
      status: "todo",
      progress: 0,
      sort_order: 0,
      assignee,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      depends_on: dependsOn,
      comment,
      priority,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const { data: updated, error: updateError } = await supabase
    .from(TABLE)
    .update({ topic_root_id: inserted.id })
    .eq("id", inserted.id)
    .select()
    .single();
  if (updateError) throw updateError;

  return updated;
}

/**
 * 在指定父节点下新建子节点（任意深度）。
 */
export async function createChildNode(
  supabase,
  userId,
  {
    parentId,
    topicRootId,
    title,
    sortOrder = 0,
    assignee = null,
    plannedStart = null,
    plannedEnd = null,
    dependsOn = [],
    comment = null,
    priority = null,
  }
) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      parent_id: parentId,
      topic_root_id: topicRootId,
      title,
      status: "todo",
      progress: 0,
      sort_order: sortOrder,
      assignee,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      depends_on: dependsOn,
      comment,
      priority,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 更新节点标题。
 */
export async function updateNodeTitle(supabase, nodeId, title) {
  const { error } = await supabase
    .from(TABLE)
    .update({ title })
    .eq("id", nodeId);
  if (error) throw error;
}

/**
 * 更新节点的责任人/计划时间/依赖/备注（预留字段，批量导入场景使用）。
 * fields 可包含：assignee / plannedStart / plannedEnd / dependsOn / comment，
 * 未传的字段不会被更新。
 */
export async function updateNodeFields(supabase, nodeId, fields = {}) {
  const payload = {};
  if ("assignee" in fields) payload.assignee = fields.assignee;
  if ("plannedStart" in fields) payload.planned_start = fields.plannedStart;
  if ("plannedEnd" in fields) payload.planned_end = fields.plannedEnd;
  if ("dependsOn" in fields) payload.depends_on = fields.dependsOn;
  if ("comment" in fields) payload.comment = fields.comment;
  if ("priority" in fields) payload.priority = fields.priority;
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from(TABLE).update(payload).eq("id", nodeId);
  if (error) throw error;
}

/**
 * 更新节点优先级（P0-P3，或 null 表示无优先级）。
 */
export async function updateNodePriority(supabase, nodeId, priority) {
  const { error } = await supabase
    .from(TABLE)
    .update({ priority })
    .eq("id", nodeId);
  if (error) throw error;
}

/**
 * 批量更新一组同级节点的 sort_order（用于拖拽排序后持久化）。
 * @param {Array<{id: string, sortOrder: number}>} orderedUpdates
 */
export async function reorderSiblings(supabase, orderedUpdates) {
  await Promise.all(
    orderedUpdates.map(({ id, sortOrder }) =>
      supabase.from(TABLE).update({ sort_order: sortOrder }).eq("id", id)
    )
  ).then((results) => {
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
  });
}

/**
 * 更新节点状态（同时按三态推导出 progress，保持数据库字段一致，
 * 但不影响前端用 calculateTreeProgress 做的实时递归汇总）。
 */
export async function updateNodeStatus(supabase, nodeId, status) {
  const { error } = await supabase
    .from(TABLE)
    .update({ status, progress: statusToProgress(status) })
    .eq("id", nodeId);
  if (error) throw error;
}

/**
 * 软删除一个节点及其所有后代（墓碑机制：deleted_at = now()）。
 * 由于 parent_id 有 ON DELETE CASCADE 的物理外键约束，但这里走软删除，
 * 需要前端先递归收集所有后代 id 再一次性 UPDATE。
 *
 * @param {Array} allRowsInTree - 该课题树当前的全部扁平行（用于递归查找后代）
 */
export async function deleteNodeAndDescendants(supabase, allRowsInTree, nodeId) {
  const idsToDelete = collectDescendantIds(allRowsInTree, nodeId);
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .in("id", idsToDelete);
  if (error) throw error;
  return idsToDelete;
}

/**
 * 递归收集某节点自身 + 所有后代的 id（基于扁平行数组，不依赖已 build 的树）。
 */
export function collectDescendantIds(rows, nodeId) {
  const ids = [nodeId];
  const children = (rows || []).filter((r) => r.parent_id === nodeId);
  children.forEach((child) => {
    ids.push(...collectDescendantIds(rows, child.id));
  });
  return ids;
}

/**
 * 软删除整棵课题树（根视图卡片删除课题）。
 */
export async function deleteTopicRoot(supabase, userId, topicRootId) {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("topic_root_id", topicRootId);
  if (error) throw error;
}
