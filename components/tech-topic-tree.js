"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth, useSupabaseClient } from "@wonder-lab/auth-sdk";
import { X, ArrowLeft, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiblingList } from "@/components/ui/tree-node";
import {
  buildTree,
  flattenTree,
  calculateTreeProgress,
  createTopicRoot,
  createChildNode,
  updateNodeTitle,
  updateNodeStatus,
  updateNodeFields,
  reorderSiblings,
  deleteNodeAndDescendants,
  deleteTopicRoot,
  fetchAllTopicNodes,
} from "@/lib/topic-tree";

const TOPIC_EMOJIS = ["📚", "🚀", "🤖", "🧩", "🛠️", "🧠", "🌳", "🧪", "🗂️", "🔭"];

function emojiForTopic(id) {
  if (!id) return TOPIC_EMOJIS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TOPIC_EMOJIS[hash % TOPIC_EMOJIS.length];
}

function formatUpdatedAt(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "更新于今天";
  if (diffDays === 1) return "更新于昨天";
  if (diffDays < 30) return `更新于${diffDays}天前`;
  return `更新于 ${date.toLocaleDateString("zh-CN")}`;
}

/**
 * SVG 环形进度（根视图卡片右上角小环 / 详情视图大环通用）
 */
function ProgressRing({ progress, size = 40, strokeWidth = 4, textClassName = "text-[11px]" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-extrabold text-primary ${textClassName}`}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
}

export function TechTopicTree({ onClose }) {
  const { user } = useAuth();
  const supabase = useSupabaseClient();

  const [allRows, setAllRows] = useState([]); // 所有课题树的扁平行（跨所有课题）
  const [loading, setLoading] = useState(true);
  const [activeTopicRootId, setActiveTopicRootId] = useState(null); // null = 根视图
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const userId = user?.id;

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const rows = await fetchAllTopicNodes(supabase, userId);
      setAllRows(rows);
    } catch (err) {
      console.error("加载课题拆解树失败:", err);
      toast.error("加载课题拆解树失败");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 按课题根 id 分组
  const topicGroups = useMemo(() => {
    const groups = new Map();
    allRows.forEach((row) => {
      if (!groups.has(row.topic_root_id)) groups.set(row.topic_root_id, []);
      groups.get(row.topic_root_id).push(row);
    });
    return groups;
  }, [allRows]);

  const topicSummaries = useMemo(() => {
    return Array.from(topicGroups.entries()).map(([rootId, rows]) => {
      const tree = calculateTreeProgress(buildTree(rows));
      const root = tree[0] || rows.find((r) => r.id === rootId) || rows[0];
      return {
        id: rootId,
        root,
        tree,
        title: root?.title || "未命名课题",
        description: root?.description || "",
        progress: tree[0]?.progress ?? 0,
        nodeCount: tree[0]?.nodeCount ?? rows.length,
        doneCount: tree[0]?.doneCount ?? 0,
        depth: tree[0]?.depth ?? 1,
        updatedAt: rows.reduce(
          (latest, r) => (!latest || r.updated_at > latest ? r.updated_at : latest),
          null
        ),
      };
    });
  }, [topicGroups]);

  const activeTopic = useMemo(
    () => topicSummaries.find((t) => t.id === activeTopicRootId) || null,
    [topicSummaries, activeTopicRootId]
  );

  // ------------------- 操作 -------------------

  const refreshRowsLocally = useCallback((updater) => {
    setAllRows((prev) => updater(prev));
  }, []);

  const handleCreateTopic = async () => {
    const title = newTopicTitle.trim();
    if (!title || !userId) return;
    try {
      const created = await createTopicRoot(supabase, userId, { title });
      refreshRowsLocally((prev) => [...prev, created]);
      setNewTopicTitle("");
      setShowNewTopicInput(false);
      setActiveTopicRootId(created.topic_root_id);
      toast.success("课题已创建");
    } catch (err) {
      console.error("创建课题失败:", err);
      toast.error("创建课题失败");
    }
  };

  const handleToggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCycleStatus = async (id, status) => {
    refreshRowsLocally((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    try {
      await updateNodeStatus(supabase, id, status);
    } catch (err) {
      console.error("更新状态失败:", err);
      toast.error("更新状态失败");
      loadAll();
    }
  };

  const handleRename = async (id, title) => {
    refreshRowsLocally((prev) =>
      prev.map((r) => (r.id === id ? { ...r, title } : r))
    );
    try {
      await updateNodeTitle(supabase, id, title);
    } catch (err) {
      console.error("重命名失败:", err);
      toast.error("重命名失败");
      loadAll();
    }
  };

  const handleUpdateNodeFields = async (id, fields) => {
    refreshRowsLocally((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...("priority" in fields ? { priority: fields.priority } : {}),
              ...("assignee" in fields ? { assignee: fields.assignee } : {}),
              ...("plannedStart" in fields ? { planned_start: fields.plannedStart } : {}),
              ...("plannedEnd" in fields ? { planned_end: fields.plannedEnd } : {}),
              ...("dependsOn" in fields ? { depends_on: fields.dependsOn } : {}),
              ...("comment" in fields ? { comment: fields.comment } : {}),
            }
          : r
      )
    );
    try {
      await updateNodeFields(supabase, id, fields);
    } catch (err) {
      console.error("更新节点字段失败:", err);
      toast.error("更新节点字段失败");
      loadAll();
    }
  };

  const handleReorderSiblings = async (_parentId, orderedIds) => {
    const previousRows = allRows;
    refreshRowsLocally((prev) =>
      prev.map((r) => {
        const idx = orderedIds.indexOf(r.id);
        return idx === -1 ? r : { ...r, sort_order: idx };
      })
    );
    try {
      await reorderSiblings(
        supabase,
        orderedIds.map((id, idx) => ({ id, sortOrder: idx }))
      );
    } catch (err) {
      console.error("调整节点顺序失败:", err);
      toast.error("调整节点顺序失败");
      setAllRows(previousRows);
    }
  };

  const handleAddChild = async (parentId) => {
    if (!userId || !activeTopicRootId) return;
    const siblingCount = allRows.filter((r) => r.parent_id === parentId).length;
    try {
      const created = await createChildNode(supabase, userId, {
        parentId,
        topicRootId: activeTopicRootId,
        title: "新节点",
        sortOrder: siblingCount,
      });
      refreshRowsLocally((prev) => [...prev, created]);
      // 添加子节点时自动展开父节点
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    } catch (err) {
      console.error("添加子节点失败:", err);
      toast.error("添加子节点失败");
    }
  };

  const handleAddRootLevelChild = async () => {
    if (!activeTopic) return;
    await handleAddChild(activeTopic.root.id);
  };

  const handleDeleteNode = async (id) => {
    if (!activeTopicRootId) return;
    const rowsInTree = allRows.filter((r) => r.topic_root_id === activeTopicRootId);
    try {
      const deletedIds = await deleteNodeAndDescendants(supabase, rowsInTree, id);
      refreshRowsLocally((prev) => prev.filter((r) => !deletedIds.includes(r.id)));
      toast.success("已删除");
    } catch (err) {
      console.error("删除节点失败:", err);
      toast.error("删除节点失败");
    }
  };

  const handleDeleteTopic = async (rootId) => {
    if (!userId) return;
    try {
      await deleteTopicRoot(supabase, userId, rootId);
      refreshRowsLocally((prev) => prev.filter((r) => r.topic_root_id !== rootId));
      toast.success("课题已删除");
    } catch (err) {
      console.error("删除课题失败:", err);
      toast.error("删除课题失败");
    }
  };

  // ------------------- 动画 -------------------
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const modalVariants = {
    hidden: { y: "100%", opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
    exit: { y: "100%", opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="bg-background rounded-t-3xl shadow-2xl max-w-4xl mx-auto overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-dashed px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold">课题拆解树</h2>
                  <p className="text-sm text-muted-foreground">
                    把一个大课题拆成可执行的任意深度任务树 · 独立于日常任务系统
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-96px)] px-6 py-5">
            {loading ? (
              <div className="text-center py-16 text-muted-foreground font-semibold">
                加载中...
              </div>
            ) : activeTopic ? (
              <DetailView
                topic={activeTopic}
                collapsedIds={collapsedIds}
                onBack={() => setActiveTopicRootId(null)}
                onToggleCollapse={handleToggleCollapse}
                onCycleStatus={handleCycleStatus}
                onRename={handleRename}
                onAddChild={handleAddChild}
                onDelete={handleDeleteNode}
                onAddRootLevelChild={handleAddRootLevelChild}
                onUpdateFields={handleUpdateNodeFields}
                onReorderChildren={handleReorderSiblings}
              />
            ) : (
              <GridView
                topics={topicSummaries}
                onOpen={setActiveTopicRootId}
                onDeleteTopic={handleDeleteTopic}
                showNewTopicInput={showNewTopicInput}
                newTopicTitle={newTopicTitle}
                onNewTopicTitleChange={setNewTopicTitle}
                onStartNewTopic={() => setShowNewTopicInput(true)}
                onCancelNewTopic={() => {
                  setShowNewTopicInput(false);
                  setNewTopicTitle("");
                }}
                onCreateTopic={handleCreateTopic}
              />
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function GridView({
  topics,
  onOpen,
  onDeleteTopic,
  showNewTopicInput,
  newTopicTitle,
  onNewTopicTitleChange,
  onStartNewTopic,
  onCancelNewTopic,
  onCreateTopic,
}) {
  return (
    <div className="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {topics.map((topic) => (
        <div
          key={topic.id}
          onClick={() => onOpen(topic.id)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-transparent bg-card p-[18px] shadow-md transition-all hover:-translate-y-0.5 hover:border-primary"
        >
          <button
            type="button"
            title="删除课题"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTopic(topic.id);
            }}
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="mb-2 block text-[26px] leading-none">
            {emojiForTopic(topic.id)}
          </span>
          <h3 className="mb-1 pr-8 text-[15px] font-extrabold">{topic.title}</h3>
          <div className="mb-3 text-xs font-medium text-muted-foreground">
            {topic.depth} 层 · {topic.nodeCount} 个节点 · {formatUpdatedAt(topic.updatedAt)}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
              style={{ width: `${topic.progress}%` }}
            />
          </div>
          <div className="absolute right-[14px] top-[14px]">
            <ProgressRing progress={topic.progress} size={40} strokeWidth={4} />
          </div>
        </div>
      ))}

      {showNewTopicInput ? (
        <div className="flex min-h-[110px] flex-col items-stretch justify-center gap-2 rounded-2xl border-2 border-primary bg-transparent p-4">
          <Input
            autoFocus
            placeholder="课题标题，例如：企业知识库建设"
            value={newTopicTitle}
            onChange={(e) => onNewTopicTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateTopic();
              if (e.key === "Escape") onCancelNewTopic();
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={onCreateTopic}>
              创建
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onCancelNewTopic}>
              取消
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartNewTopic}
          className="flex min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:bg-card/50 hover:text-primary"
        >
          <span className="text-[22px]">＋</span>
          新建课题
        </button>
      )}

      {topics.length === 0 && !showNewTopicInput && (
        <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
          还没有课题拆解树，点击「新建课题」开始拆解你的第一个大课题
        </div>
      )}
    </div>
  );
}

function DetailView({
  topic,
  collapsedIds,
  onBack,
  onToggleCollapse,
  onCycleStatus,
  onRename,
  onAddChild,
  onDelete,
  onAddRootLevelChild,
  onUpdateFields,
  onReorderChildren,
}) {
  const allNodesInTopic = useMemo(() => flattenTree(topic.tree), [topic.tree]);
  const nodeTitleById = useMemo(
    () => new Map(allNodesInTopic.map((n) => [n.id, n.title])),
    [allNodesInTopic]
  );
  const dependencyCandidates = useMemo(
    () => allNodesInTopic.map((n) => ({ id: n.id, title: n.title })),
    [allNodesInTopic]
  );

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回全部课题
      </button>

      <div className="mb-5 rounded-2xl bg-card p-6 shadow-md">
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 flex items-center gap-2 text-xl font-extrabold">
              <span>{emojiForTopic(topic.id)}</span>
              {topic.title}
            </h2>
            {topic.description && (
              <p className="max-w-[560px] text-sm text-muted-foreground">
                {topic.description}
              </p>
            )}
            <div className="mt-3 flex gap-5 text-xs font-bold text-muted-foreground">
              <span>
                <b className="text-sm text-foreground">{topic.nodeCount}</b> 个节点
              </span>
              <span>
                <b className="text-sm text-foreground">{topic.doneCount}</b> 已完成
              </span>
              <span>
                <b className="text-sm text-foreground">{topic.depth}</b> 层深度
              </span>
            </div>
          </div>

          <div className="flex min-w-[200px] flex-shrink-0 items-center gap-3.5">
            <ProgressRing progress={topic.progress} size={64} strokeWidth={6} textClassName="text-base" />
            <div className="text-xs font-bold text-muted-foreground">
              整体进度
              <br />
              由子节点自动汇总
            </div>
          </div>
        </div>

        <div className="relative">
          <SiblingList
            parentId={topic.root?.id}
            childNodes={topic.root?.children || []}
            collapsedIds={collapsedIds}
            onToggleCollapse={onToggleCollapse}
            onCycleStatus={onCycleStatus}
            onRename={onRename}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onUpdateFields={onUpdateFields}
            onReorderChildren={onReorderChildren}
            dependencyCandidates={dependencyCandidates}
            nodeTitleById={nodeTitleById}
          />
        </div>

        <div className="pl-[20px] pt-1">
          <button
            type="button"
            onClick={onAddRootLevelChild}
            className="rounded-md px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent/40 hover:text-primary"
          >
            ＋ 添加一级节点
          </button>
        </div>
      </div>
    </div>
  );
}
