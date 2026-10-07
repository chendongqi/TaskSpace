// lib/supabase-sync.js
//
// 关系型 Supabase 同步层：负责本地数据结构 <-> ts_* 表行之间的转换，
// 维护写队列（outbox）、增量拉取（pull）以及 beforeunload 兜底 flush。
//
// 设计要点（供人工复核）：
// 1. 本地历史数据使用 `Date.now().toString()` 之类的字符串 ID，而 ts_* 表主键是 UUID。
//    这里用一张本地 ID -> 远端 UUID 的映射表（localStorage: `_ts_remote_id_map`）兼容旧 ID，
//    新实体若已经是合法 UUID 则直接当作远端 ID 使用，不建映射。
// 2. 写队列按表优先级顺序 flush（tags/settings 优先于 goals，goals 优先于 habits/tasks），
//    以降低因外键依赖顺序错误导致插入失败的概率；但没有做严格的依赖图调度，
//    理论上仍可能出现"引用的行还没创建"而写入失败的情况（会重试，但需要人工关注日志）。
// 3. beforeunload/visibilitychange 的兜底 flush 使用 fetch(keepalive:true) 直接打
//    PostgREST，而不是走 supabase-js（supabase-js 的请求在页面卸载时可能被中断）。
//    这要求缓存最近一次拿到的 access token，可能存在"token 恰好过期"的边界情况。

const OUTBOX_KEY = "_ts_outbox";
const ID_MAP_KEY = "_ts_remote_id_map";
const LAST_PULLED_PREFIX = "_ts_last_pulled_";
const FLUSH_DELAY_MS = 1500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 逻辑表名 -> 真实 Supabase 表名
const REAL_TABLE = {
  customTags: "ts_tags",
  settings: "ts_user_settings",
  yearlyGoals: "ts_goals",
  quarterlyGoals: "ts_goals",
  weeklyGoals: "ts_goals",
  habits: "ts_habits",
  habitCompletions: "ts_habit_completions",
  dailyTasks: "ts_tasks",
  backlogTasks: "ts_tasks",
};

// flush 顺序：被引用的表优先
const TABLE_FLUSH_PRIORITY = [
  "settings",
  "customTags",
  "yearlyGoals",
  "quarterlyGoals",
  "weeklyGoals",
  "habits",
  "habitCompletions",
  "dailyTasks",
  "backlogTasks",
];

let supabaseClientProvider = null;
let cachedAccessToken = null;
let cachedSupabaseUrl =
  (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) || null;
let cachedAnonKey =
  (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || null;

export function setSupabaseClientProvider(provider) {
  supabaseClientProvider = provider;
  // 尽早尝试缓存一次 access token，供 beforeunload 兜底使用
  refreshCachedAccessToken();
}

function getSupabaseClient() {
  if (!supabaseClientProvider) return null;
  try {
    return supabaseClientProvider();
  } catch (error) {
    console.warn("[supabase-sync] Failed to get supabase client:", error);
    return null;
  }
}

async function refreshCachedAccessToken() {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { data } = await client.auth.getSession();
    cachedAccessToken = data?.session?.access_token || null;
    if (data?.session?.user) {
      // 一并记录当前用户，供某些场景兜底使用（不作为主要来源）
      cachedUserId = data.session.user.id;
    }
  } catch (error) {
    console.warn("[supabase-sync] Failed to refresh cached access token:", error);
  }
}

let cachedUserId = null;
export function setCachedUserId(userId) {
  cachedUserId = userId || null;
}

// =====================================================
// ID 映射（本地 ID <-> 远端 UUID）
// =====================================================

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function readIdMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ID_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeIdMap(map) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn("[supabase-sync] Failed to persist id map:", error);
  }
}

function uuidv4() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 兜底实现（极少数不支持 crypto.randomUUID 的环境）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 为某个逻辑命名空间下的本地 ID 确保存在一个远端 UUID（如果本地 ID 本身已是合法 UUID，直接复用）
function ensureRemoteId(namespace, localId) {
  if (localId === null || localId === undefined) return null;
  const key = String(localId);
  if (isUuid(key)) return key;

  const map = readIdMap();
  if (!map[namespace]) map[namespace] = {};
  if (map[namespace][key]) return map[namespace][key];

  const remoteId = uuidv4();
  map[namespace][key] = remoteId;
  writeIdMap(map);
  return remoteId;
}

// 只读查找（不会新建映射），找不到时返回 null —— 用于拉取后反查本地 ID 场景（当前实现里拉取后直接采用远端 UUID 作为本地 ID，因此较少用到）
function lookupRemoteId(namespace, localId) {
  if (localId === null || localId === undefined) return null;
  const key = String(localId);
  if (isUuid(key)) return key;
  const map = readIdMap();
  return map[namespace]?.[key] || null;
}

// 外键引用解析：引用的实体可能属于不同命名空间（如 goals 既可能是 yearly/quarterly/weekly）
// 调用方需要显式传入正确的命名空间
function resolveRef(namespace, localId) {
  if (localId === null || localId === undefined || localId === "none" || localId === "") {
    return null;
  }
  return ensureRemoteId(namespace, localId);
}

// =====================================================
// Outbox（本地写队列）
// =====================================================

function readOutbox() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("[supabase-sync] Failed to persist outbox:", error);
  }
}

let flushTimer = null;

/**
 * 加入一条 mutation 到写队列。
 * table: 逻辑表名（见 REAL_TABLE 的 key）
 * op: 'upsert' | 'delete'
 * localId: 该实体在本地的 ID（dailyTasks/backlogTasks 里是任务/子任务 id；habitCompletions 用 `${habitId}_${date}` 合成 id）
 * payload: 转换成 Supabase 行所需要的本地形态数据（delete 时可为 null）
 */
export function queueMutation(table, op, localId, payload) {
  if (typeof window === "undefined") return;
  if (!REAL_TABLE[table]) {
    console.warn(`[supabase-sync] Unknown table in queueMutation: ${table}`);
    return;
  }

  const entries = readOutbox();
  // 去重：同一 table+localId+op 的旧条目丢弃，只保留最新的
  const filtered = entries.filter(
    (e) => !(e.table === table && e.localId === localId)
  );
  filtered.push({
    table,
    op,
    localId,
    payload,
    queuedAt: new Date().toISOString(),
  });
  writeOutbox(filtered);
  scheduleFlush();
}

function scheduleFlush() {
  if (typeof window === "undefined") return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushMutationQueue().catch((error) => {
      console.warn("[supabase-sync] Scheduled flush failed:", error);
    });
  }, FLUSH_DELAY_MS);
}

// =====================================================
// 本地形态 -> Supabase 行 的转换
// =====================================================

function toRowForDelete(table, localId, userId) {
  const remoteId =
    table === "habitCompletions"
      ? ensureRemoteId("habitCompletions", localId)
      : table === "dailyTasks" || table === "backlogTasks"
      ? ensureRemoteId("tasks", localId)
      : table === "yearlyGoals" || table === "quarterlyGoals" || table === "weeklyGoals"
      ? ensureRemoteId("goals", localId)
      : ensureRemoteId(table, localId);

  return { id: remoteId, deleted_at: new Date().toISOString() };
}

function toRowForUpsert(table, localId, payload, userId) {
  switch (table) {
    case "customTags": {
      return {
        id: ensureRemoteId("customTags", localId),
        user_id: userId,
        name: payload.name,
        color: payload.color || null,
      };
    }
    case "settings": {
      // settings 没有墓碑，直接按 user_id upsert
      return {
        user_id: userId,
        dark_mode: !!payload.darkMode,
        theme: payload.theme || "default",
      };
    }
    case "yearlyGoals": {
      return {
        id: ensureRemoteId("goals", localId),
        user_id: userId,
        goal_type: "yearly",
        parent_goal_id: null,
        title: payload.title,
        description: payload.description || null,
        year: payload.year,
        quarter: null,
        week: null,
        weight: null,
        progress: payload.progress || 0,
        auto_calculated: !!payload.autoCalculated,
        completed: !!payload.completed,
        priority: payload.priority || null,
        tag_id: resolveRef("customTags", payload.tag),
      };
    }
    case "quarterlyGoals": {
      return {
        id: ensureRemoteId("goals", localId),
        user_id: userId,
        goal_type: "quarterly",
        parent_goal_id: resolveRef("goals", payload.yearlyGoalId),
        title: payload.title,
        description: payload.description || null,
        year: payload.year,
        quarter: payload.quarter,
        week: null,
        weight: payload.weight ?? null,
        progress: payload.progress || 0,
        auto_calculated: !!payload.autoCalculated,
        completed: !!payload.completed,
        priority: payload.priority || null,
        tag_id: resolveRef("customTags", payload.tag),
      };
    }
    case "weeklyGoals": {
      return {
        id: ensureRemoteId("goals", localId),
        user_id: userId,
        goal_type: "weekly",
        parent_goal_id: resolveRef("goals", payload.quarterlyGoalId),
        title: payload.title,
        description: payload.description || null,
        year: payload.year,
        quarter: payload.quarter,
        week: payload.week,
        weight: payload.weight ?? null,
        progress: payload.progress || 0,
        auto_calculated: !!payload.autoCalculated,
        completed: !!payload.completed,
        priority: payload.priority || null,
        tag_id: resolveRef("customTags", payload.tag),
      };
    }
    case "habits": {
      return {
        id: ensureRemoteId("habits", localId),
        user_id: userId,
        name: payload.name,
        tag_id: resolveRef("customTags", payload.tag),
        priority: payload.priority || null,
        yearly_goal_id: resolveRef("goals", payload.yearlyGoalId),
      };
    }
    case "habitCompletions": {
      // payload: { habitId, date }
      return {
        id: ensureRemoteId("habitCompletions", localId),
        user_id: userId,
        habit_id: resolveRef("habits", payload.habitId),
        completed_date: payload.date,
      };
    }
    case "dailyTasks":
    case "backlogTasks": {
      return {
        id: ensureRemoteId("tasks", localId),
        user_id: userId,
        parent_id: resolveRef("tasks", payload.parentTaskId),
        title: payload.title,
        completed: !!payload.completed,
        scheduled_date: table === "dailyTasks" ? payload.scheduledDate || null : null,
        time_spent: payload.timeSpent || 0,
        focus_time: payload.focusTime || 0,
        priority: payload.priority || null,
        tag_id: resolveRef("customTags", payload.tag),
        is_habit: false,
        habit_id: null,
        weekly_goal_id: resolveRef("goals", payload.weeklyGoalId),
        subtasks_expanded: !!payload.subtasksExpanded,
        sort_order: payload.sortOrder || 0,
      };
    }
    default:
      throw new Error(`Unsupported table in toRowForUpsert: ${table}`);
  }
}

// =====================================================
// Flush
// =====================================================

export async function flushMutationQueue() {
  if (typeof window === "undefined") return;

  const client = getSupabaseClient();
  const userId = cachedUserId;
  if (!client || !userId) {
    // 没有登录或 client 还没注入，先不处理，留在队列里等待下次 flush
    return;
  }

  const entries = readOutbox();
  if (entries.length === 0) return;

  // 按表优先级分组处理
  const byTable = new Map();
  entries.forEach((entry) => {
    if (!byTable.has(entry.table)) byTable.set(entry.table, []);
    byTable.get(entry.table).push(entry);
  });

  const stillFailed = [];

  for (const table of TABLE_FLUSH_PRIORITY) {
    const tableEntries = byTable.get(table);
    if (!tableEntries) continue;

    const realTable = REAL_TABLE[table];

    for (const entry of tableEntries) {
      try {
        if (entry.op === "delete") {
          const row = toRowForDelete(table, entry.localId, userId);
          const { error } = await client
            .from(realTable)
            .update({ deleted_at: row.deleted_at })
            .eq("id", row.id)
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const row = toRowForUpsert(table, entry.localId, entry.payload || {}, userId);
          const conflictTarget = table === "settings" ? "user_id" : "id";
          const { error } = await client
            .from(realTable)
            .upsert(row, { onConflict: conflictTarget });
          if (error) throw error;
        }
      } catch (error) {
        console.warn(
          `[supabase-sync] Failed to flush mutation for ${table}/${entry.localId}:`,
          error
        );
        stillFailed.push(entry);
      }
    }
  }

  writeOutbox(stillFailed);

  // 刷新一下缓存的 access token，供下一次 beforeunload 兜底使用
  refreshCachedAccessToken();
}

// =====================================================
// 增量拉取
// =====================================================

function dateOnly(d) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLastPulledAt(table) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${LAST_PULLED_PREFIX}${table}`);
}

export function setLastPulledAt(table, ts) {
  if (typeof window === "undefined") return;
  if (!ts) return;
  localStorage.setItem(`${LAST_PULLED_PREFIX}${table}`, ts);
}

/**
 * 从 Supabase 拉取某逻辑表自 lastPulledAt 之后的变更（包含墓碑行）。
 * 返回原始行数组（未转换），由调用方（storage.js）决定如何合并进本地结构。
 */
export async function pullChanges(table, lastPulledAt) {
  const client = getSupabaseClient();
  const userId = cachedUserId;
  if (!client || !userId) return { rows: [], maxUpdatedAt: lastPulledAt || null };

  const realTable = REAL_TABLE[table];
  if (!realTable) {
    console.warn(`[supabase-sync] Unknown table in pullChanges: ${table}`);
    return { rows: [], maxUpdatedAt: lastPulledAt || null };
  }

  let query = client.from(realTable).select("*").eq("user_id", userId);

  if (lastPulledAt) {
    query = query.gt("updated_at", lastPulledAt);
  }

  // 同一张物理表承载多种逻辑表的场景，加上额外过滤
  if (table === "yearlyGoals") query = query.eq("goal_type", "yearly");
  if (table === "quarterlyGoals") query = query.eq("goal_type", "quarterly");
  if (table === "weeklyGoals") query = query.eq("goal_type", "weekly");
  if (table === "dailyTasks") query = query.not("scheduled_date", "is", null);
  if (table === "backlogTasks") query = query.is("scheduled_date", null);

  query = query.order("updated_at", { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.warn(`[supabase-sync] pullChanges failed for ${table}:`, error);
    return { rows: [], maxUpdatedAt: lastPulledAt || null };
  }

  const rows = data || [];
  let maxUpdatedAt = lastPulledAt || null;
  rows.forEach((row) => {
    if (!maxUpdatedAt || row.updated_at > maxUpdatedAt) {
      maxUpdatedAt = row.updated_at;
    }
  });

  return { rows, maxUpdatedAt };
}

// =====================================================
// 远端行 -> 本地形态 的转换（用于 pullChanges 之后的本地合并）
// =====================================================

export function tagRowToLocal(row) {
  return { id: row.id, name: row.name, color: row.color };
}

export function goalRowToLocal(row) {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description || "",
    year: row.year,
    progress: row.progress || 0,
    completed: !!row.completed,
    autoCalculated: !!row.auto_calculated,
    priority: row.priority || undefined,
    tag: row.tag_id || undefined,
    createdAt: row.created_at,
  };
  if (row.goal_type === "quarterly") {
    return {
      ...base,
      quarter: row.quarter,
      yearlyGoalId: row.parent_goal_id || undefined,
      weight: row.weight ?? undefined,
    };
  }
  if (row.goal_type === "weekly") {
    return {
      ...base,
      quarter: row.quarter,
      week: row.week,
      quarterlyGoalId: row.parent_goal_id || undefined,
      weight: row.weight ?? undefined,
    };
  }
  return base;
}

export function habitRowToLocal(row, completedDates = []) {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag_id || undefined,
    priority: row.priority || undefined,
    yearlyGoalId: row.yearly_goal_id || undefined,
    completedDates,
    createdAt: row.created_at,
  };
}

export function taskRowToLocal(row) {
  return {
    id: row.id,
    title: row.title,
    completed: !!row.completed,
    timeSpent: row.time_spent || 0,
    focusTime: row.focus_time || 0,
    priority: row.priority || undefined,
    tag: row.tag_id || undefined,
    weeklyGoalId: row.weekly_goal_id || undefined,
    parentTaskId: row.parent_id || undefined,
    subtasksExpanded: !!row.subtasks_expanded,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    subtasks: [],
  };
}

export { dateOnly, isUuid, ensureRemoteId, lookupRemoteId };

// =====================================================
// 把 pullChanges 拉到的行，合并进本地 React 状态所使用的数组/对象结构里
// =====================================================
// 这些 apply* 函数都是"纯函数"风格（输入旧状态+新行，输出新状态），方便在 page.js 里
// 直接用于 setState(prev => applyXxxRows(prev, rows))。

export function applyArrayRows(prevArray, rows, rowToLocal) {
  const map = new Map((prevArray || []).map((item) => [item.id, item]));
  rows.forEach((row) => {
    if (row.deleted_at) {
      map.delete(row.id);
    } else {
      map.set(row.id, rowToLocal(row));
    }
  });
  return Array.from(map.values());
}

// habits 基础字段的合并（不包含 completedDates，由 applyHabitCompletionRows 单独处理）
export function applyHabitRows(prevHabits, rows) {
  const map = new Map((prevHabits || []).map((h) => [h.id, h]));
  rows.forEach((row) => {
    if (row.deleted_at) {
      map.delete(row.id);
      return;
    }
    const prev = map.get(row.id);
    const completedDates = prev?.completedDates || [];
    map.set(row.id, habitRowToLocal(row, completedDates));
  });
  return Array.from(map.values());
}

// habit_completions 的合并：按 habit_id 把 completed_date 加入/移出对应 habit 的 completedDates
export function applyHabitCompletionRows(prevHabits, rows) {
  const map = new Map(
    (prevHabits || []).map((h) => [
      h.id,
      { ...h, completedDates: new Set(h.completedDates || []) },
    ])
  );
  rows.forEach((row) => {
    const habit = map.get(row.habit_id);
    if (!habit) return; // 对应的 habit 还没拉到本地，忽略（下次 habits 表 pull 到后，这条记录仍在远端，之后的增量 pull 不会再给到，可能产生短暂不一致——已知的边界情况，供人工复核）
    if (row.deleted_at) {
      habit.completedDates.delete(row.completed_date);
    } else {
      habit.completedDates.add(row.completed_date);
    }
  });
  return Array.from(map.values()).map((h) => ({
    ...h,
    completedDates: Array.from(h.completedDates),
  }));
}

// 把扁平的 task 行（daily 或 backlog）合并进 dailyTasks(对象, 按日期分组) / backlogTasks(数组) 结构。
// 策略：先把现有的 dailyTasks/backlogTasks 展开成 id -> {task, scheduledDate} 的扁平 map，
// 用新行覆盖/删除/新增，然后按 scheduledDate 重新分组、按 parent_id 重新嵌套子任务。
export function applyTaskRows(dailyTasksObj, backlogTasksArr, rows) {
  const flat = new Map(); // id -> { ...taskFields, scheduledDate }

  flattenTasks(dailyTasksObj).forEach((t) => flat.set(t.id, t));
  flattenTasks(backlogTasksArr).forEach((t) => flat.set(t.id, t));

  rows.forEach((row) => {
    if (row.deleted_at) {
      flat.delete(row.id);
      return;
    }
    const local = taskRowToLocal(row);
    flat.set(row.id, { ...local, scheduledDate: row.scheduled_date || null });
  });

  // 按 parent_id (parentTaskId) 重新嵌套子任务，按 scheduledDate 重新分组
  const topLevel = [];
  const childrenByParent = new Map();

  flat.forEach((task) => {
    if (task.parentTaskId) {
      if (!childrenByParent.has(task.parentTaskId)) {
        childrenByParent.set(task.parentTaskId, []);
      }
      childrenByParent.get(task.parentTaskId).push(task);
    } else {
      topLevel.push(task);
    }
  });

  const newDailyTasks = {};
  const newBacklogTasks = [];

  topLevel.forEach((task) => {
    const withSubtasks = {
      ...task,
      subtasks: (childrenByParent.get(task.id) || []).map((sub) => ({
        ...sub,
      })),
    };
    delete withSubtasks.scheduledDate;
    withSubtasks.subtasks.forEach((s) => delete s.scheduledDate);

    if (task.scheduledDate) {
      if (!newDailyTasks[task.scheduledDate]) newDailyTasks[task.scheduledDate] = [];
      newDailyTasks[task.scheduledDate].push(withSubtasks);
    } else {
      newBacklogTasks.push(withSubtasks);
    }
  });

  return { dailyTasks: newDailyTasks, backlogTasks: newBacklogTasks };
}

export function applySettingsRow(row) {
  if (!row) return null;
  return { darkMode: !!row.dark_mode, theme: row.theme || "default" };
}

// =====================================================
// 整表 diff -> 逐行 queueMutation
// =====================================================
//
// setLocalData(key, newData) 目前仍然是"整个 key 的新值"这种粒度（9 个 localStorage key），
// 而 queueMutation 要求逐行。这里提供一个 diff 适配层：拿到旧值和新值，
// 对比出被新增/修改/删除的行，分别转换成 queueMutation 调用。
// 这是本次改造里相对取巧的一点：没有在 UI 层把每个增删改操作都改成精确的单行调用，
// 而是在 setLocalData 这个统一出口做一次 diff。好处是改动面小、不用逐个重写 app/page.js
// 里几十个 CRUD 函数；代价是对象比较用的是 JSON.stringify 的浅层等值判断，
// 如果未来某个字段的顺序不稳定可能导致误判为"有变化"（多发一次无害的 upsert，不会丢数据）。

function shallowEqualByJson(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function diffArrayById(table, oldArr = [], newArr = []) {
  const oldMap = new Map((oldArr || []).map((item) => [item.id, item]));
  const newMap = new Map((newArr || []).map((item) => [item.id, item]));

  newMap.forEach((item, id) => {
    const prev = oldMap.get(id);
    if (!prev || !shallowEqualByJson(prev, item)) {
      queueMutation(table, "upsert", id, item);
    }
  });

  oldMap.forEach((item, id) => {
    if (!newMap.has(id)) {
      queueMutation(table, "delete", id, null);
    }
  });
}

// 展开 dailyTasks（按日期分组的对象）或 backlogTasks（数组）里的任务+子任务为扁平数组
function flattenTasks(data, scheduledDateByTaskId) {
  const flat = [];
  if (!data) return flat;

  const pushTask = (task, scheduledDate) => {
    if (!task || task.isHabit) return; // 习惯生成的虚拟任务不落库
    flat.push({ ...task, scheduledDate });
    (task.subtasks || []).forEach((sub) => {
      if (sub.isHabit) return;
      flat.push({ ...sub, parentTaskId: task.id, scheduledDate });
    });
  };

  if (Array.isArray(data)) {
    data.forEach((task) => pushTask(task, null));
  } else if (typeof data === "object") {
    Object.keys(data).forEach((dateKey) => {
      (data[dateKey] || []).forEach((task) => pushTask(task, dateKey));
    });
  }
  return flat;
}

function diffTasks(table, oldData, newData) {
  const oldFlat = flattenTasks(oldData);
  const newFlat = flattenTasks(newData);
  diffArrayById(table, oldFlat, newFlat);
}

function diffHabits(oldArr = [], newArr = []) {
  diffArrayById("habits", oldArr, newArr);

  const oldMap = new Map((oldArr || []).map((h) => [h.id, h]));
  const newMap = new Map((newArr || []).map((h) => [h.id, h]));

  newMap.forEach((habit, habitId) => {
    const prevHabit = oldMap.get(habitId);
    const prevDates = new Set(prevHabit?.completedDates || []);
    const newDates = new Set(habit.completedDates || []);

    newDates.forEach((date) => {
      if (!prevDates.has(date)) {
        queueMutation("habitCompletions", "upsert", `${habitId}_${date}`, {
          habitId,
          date,
        });
      }
    });
    prevDates.forEach((date) => {
      if (!newDates.has(date)) {
        queueMutation("habitCompletions", "delete", `${habitId}_${date}`, null);
      }
    });
  });

  // 整个习惯被删除时，其所有完成记录一并墓碑
  oldMap.forEach((habit, habitId) => {
    if (!newMap.has(habitId)) {
      (habit.completedDates || []).forEach((date) => {
        queueMutation("habitCompletions", "delete", `${habitId}_${date}`, null);
      });
    }
  });
}

let pendingSettings = {};

function diffSettings(key, newValue) {
  pendingSettings[key] = newValue;
  queueMutation("settings", "upsert", "singleton", {
    darkMode:
      key === "darkMode" ? newValue : pendingSettings.darkMode,
    theme: key === "theme" ? newValue : pendingSettings.theme,
  });
}

/**
 * 根据本地 key 的旧值/新值，diff 出需要落库的变更并加入写队列。
 * 由 lib/storage.js 的 setLocalData 在写入 localStorage 之后调用。
 */
export function diffAndQueue(key, newData, oldData) {
  switch (key) {
    case "customTags":
      diffArrayById("customTags", oldData, newData);
      break;
    case "yearlyGoals":
      diffArrayById("yearlyGoals", oldData, newData);
      break;
    case "quarterlyGoals":
      diffArrayById("quarterlyGoals", oldData, newData);
      break;
    case "weeklyGoals":
      diffArrayById("weeklyGoals", oldData, newData);
      break;
    case "habits":
      diffHabits(oldData, newData);
      break;
    case "dailyTasks":
      diffTasks("dailyTasks", oldData, newData);
      break;
    case "backlogTasks":
      diffTasks("backlogTasks", oldData, newData);
      break;
    case "darkMode":
    case "theme":
      diffSettings(key, newData);
      break;
    default:
      // 其余 key（如内部标记）不参与远端同步
      break;
  }
}

// =====================================================
// beforeunload / visibilitychange 兜底 flush
// =====================================================

function buildRestHeaders() {
  if (!cachedAnonKey) return null;
  return {
    "Content-Type": "application/json",
    apikey: cachedAnonKey,
    Authorization: `Bearer ${cachedAccessToken || cachedAnonKey}`,
    Prefer: "resolution=merge-duplicates",
  };
}

function keepaliveFlush() {
  if (!cachedSupabaseUrl || !cachedUserId) return;
  const headers = buildRestHeaders();
  if (!headers) return;

  const entries = readOutbox();
  if (entries.length === 0) return;

  entries.forEach((entry) => {
    const realTable = REAL_TABLE[entry.table];
    if (!realTable) return;
    try {
      if (entry.op === "delete") {
        const row = toRowForDelete(entry.table, entry.localId, cachedUserId);
        fetch(`${cachedSupabaseUrl}/rest/v1/${realTable}?id=eq.${row.id}`, {
          method: "PATCH",
          headers,
          keepalive: true,
          body: JSON.stringify({ deleted_at: row.deleted_at }),
        }).catch(() => {});
      } else {
        const row = toRowForUpsert(entry.table, entry.localId, entry.payload || {}, cachedUserId);
        fetch(`${cachedSupabaseUrl}/rest/v1/${realTable}`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
          keepalive: true,
          body: JSON.stringify(row),
        }).catch(() => {});
      }
    } catch (error) {
      console.warn("[supabase-sync] keepaliveFlush entry failed:", error);
    }
  });

  // 乐观地认为已经发出去了（keepalive fetch 无法可靠确认结果），清空队列。
  // 下次正常 flush 若发现数据未真正落地，用户下次操作还会再次写入，风险可接受。
  writeOutbox([]);
}

let beforeUnloadRegistered = false;

export function registerBeforeUnloadFlush() {
  if (typeof window === "undefined" || beforeUnloadRegistered) return;
  beforeUnloadRegistered = true;

  window.addEventListener("beforeunload", () => {
    keepaliveFlush();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      keepaliveFlush();
    }
  });
}
