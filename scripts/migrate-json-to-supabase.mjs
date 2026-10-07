#!/usr/bin/env node
// scripts/migrate-json-to-supabase.mjs
//
// 一次性迁移脚本：把旧的 JSON 文件备份（`./data/backups/<userId>/<key>.json`，
// 由已废弃的 app/api/backup/route.js 产出）迁移到新的 Supabase 关系表
// （ts_tags / ts_goals / ts_habits / ts_habit_completions / ts_tasks）。
//
// ⚠️ 本脚本必须用 service_role key 在服务端/CI 运行，绝不能打进前端 bundle：
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-json-to-supabase.mjs <userId> [--dry-run]
//
// 字段映射与 lib/supabase-sync.js 的 toRowForUpsert() 保持一致（同一套表结构）。
//
// 幂等性：脚本开始时会先把该用户在新表里的所有行物理删除（不是软删除——
// 这是一次性迁移，不是日常同步，不需要墓碑语义），然后重新从 JSON 完整插入。
// 这样重复运行该脚本是安全的，不会产生重复数据或残留脏数据。
//
// 依赖顺序（必须保证被引用的表先插入，拿到新 UUID 后才能让引用方使用）：
//   tags -> goals(yearly -> quarterly -> weekly) -> habits(+habit_completions)
//   -> tasks(backlog + daily；每个任务里父任务先插，拿到新 UUID 后再插子任务)
//
// isHabit: true 的"虚拟任务"（由习惯在当天动态生成，不是真实存储的任务行）不迁移。

import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const userId = args.find((a) => !a.startsWith("--"));

const BACKUP_DIR =
  process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups");

function usageAndExit(message) {
  if (message) console.error(`❌ ${message}`);
  console.error(
    "Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-json-to-supabase.mjs <userId> [--dry-run]"
  );
  process.exit(1);
}

if (!userId) usageAndExit("缺少 <userId> 参数（对应 ./data/backups/<userId>/ 目录名）");
if (!SUPABASE_URL) usageAndExit("缺少环境变量 SUPABASE_URL");
if (!SERVICE_ROLE_KEY) usageAndExit("缺少环境变量 SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =====================================================
// 本地 ID -> 新 UUID 映射（迁移过程内存态，不落盘；与 lib/supabase-sync.js
// 的 localStorage 映射是两套独立的东西，互不影响）
// =====================================================
const idMaps = {
  tags: new Map(),
  goals: new Map(),
  habits: new Map(),
  habitCompletions: new Map(),
  tasks: new Map(),
};

function newUuid() {
  return crypto.randomUUID();
}

function mapId(namespace, oldId) {
  if (oldId === null || oldId === undefined || oldId === "" || oldId === "none") {
    return null;
  }
  const key = String(oldId);
  const map = idMaps[namespace];
  if (!map.has(key)) {
    map.set(key, newUuid());
  }
  return map.get(key);
}

function lookupId(namespace, oldId) {
  if (oldId === null || oldId === undefined || oldId === "" || oldId === "none") {
    return null;
  }
  return idMaps[namespace].get(String(oldId)) || null;
}

async function readJson(key) {
  const filePath = path.join(BACKUP_DIR, userId, `${key}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    // 备份文件格式是 { key, data, timestamp, userId }（见 app/api/backup/route.js POST）
    return parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`  (跳过) 未找到备份文件: ${filePath}`);
      return null;
    }
    throw error;
  }
}

async function clearExistingRows() {
  if (DRY_RUN) {
    console.log("🧪 [dry-run] 跳过清空已存在的新表数据");
    return;
  }
  console.log("🧹 清空该用户在新表中的已有数据（保证脚本可重复执行）...");
  const tables = [
    "ts_tasks",
    "ts_habit_completions",
    "ts_habits",
    "ts_goals",
    "ts_tags",
    "ts_user_settings",
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      throw new Error(`清空 ${table} 失败: ${error.message}`);
    }
  }
}

async function insertRows(table, rows, label) {
  if (rows.length === 0) {
    console.log(`  (无数据) ${label}`);
    return;
  }
  console.log(`  → 插入 ${rows.length} 行到 ${table} (${label})`);
  if (DRY_RUN) return;

  // 分批插入，避免单次请求过大
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      throw new Error(`插入 ${table} 第 ${i}-${i + batch.length} 行失败: ${error.message}`);
    }
  }
}

// =====================================================
// 1. Tags
// =====================================================
async function migrateTags() {
  console.log("\n📌 1/4 迁移 customTags -> ts_tags");
  const customTags = await readJson("customTags");
  if (!customTags || !Array.isArray(customTags)) return;

  const rows = customTags.map((tag) => ({
    id: mapId("tags", tag.id),
    user_id: userId,
    name: tag.name,
    color: tag.color || null,
    created_at: tag.createdAt ? new Date(tag.createdAt).toISOString() : undefined,
  }));

  await insertRows("ts_tags", rows, "customTags");
}

// =====================================================
// 2. Goals (yearly -> quarterly -> weekly，必须按此顺序，因为
// quarterly 引用 yearly 的新 UUID，weekly 引用 quarterly 的新 UUID)
// =====================================================
async function migrateGoals() {
  console.log("\n📌 2/4 迁移 yearlyGoals / quarterlyGoals / weeklyGoals -> ts_goals");

  const yearlyGoals = (await readJson("yearlyGoals")) || [];
  const quarterlyGoals = (await readJson("quarterlyGoals")) || [];
  const weeklyGoals = (await readJson("weeklyGoals")) || [];

  const yearlyRows = (Array.isArray(yearlyGoals) ? yearlyGoals : []).map((goal) => ({
    id: mapId("goals", goal.id),
    user_id: userId,
    goal_type: "yearly",
    parent_goal_id: null,
    title: goal.title,
    description: goal.description || null,
    year: goal.year,
    quarter: null,
    week: null,
    weight: null,
    progress: goal.progress || 0,
    auto_calculated: !!goal.autoCalculated,
    completed: !!goal.completed,
    priority: goal.priority || null,
    tag_id: lookupId("tags", goal.tag),
    created_at: goal.createdAt ? new Date(goal.createdAt).toISOString() : undefined,
  }));
  await insertRows("ts_goals", yearlyRows, "yearlyGoals");

  const quarterlyRows = (Array.isArray(quarterlyGoals) ? quarterlyGoals : []).map((goal) => ({
    id: mapId("goals", goal.id),
    user_id: userId,
    goal_type: "quarterly",
    parent_goal_id: goal.yearlyGoalId ? lookupId("goals", goal.yearlyGoalId) : null,
    title: goal.title,
    description: goal.description || null,
    year: goal.year,
    quarter: goal.quarter,
    week: null,
    weight: goal.weight ?? null,
    progress: goal.progress || 0,
    auto_calculated: !!goal.autoCalculated,
    completed: !!goal.completed,
    priority: goal.priority || null,
    tag_id: lookupId("tags", goal.tag),
    created_at: goal.createdAt ? new Date(goal.createdAt).toISOString() : undefined,
  }));
  await insertRows("ts_goals", quarterlyRows, "quarterlyGoals");

  const weeklyRows = (Array.isArray(weeklyGoals) ? weeklyGoals : []).map((goal) => ({
    id: mapId("goals", goal.id),
    user_id: userId,
    goal_type: "weekly",
    parent_goal_id: goal.quarterlyGoalId ? lookupId("goals", goal.quarterlyGoalId) : null,
    title: goal.title,
    description: goal.description || null,
    year: goal.year,
    quarter: goal.quarter,
    week: goal.week,
    weight: goal.weight ?? null,
    progress: goal.progress || 0,
    auto_calculated: !!goal.autoCalculated,
    completed: !!goal.completed,
    priority: goal.priority || null,
    tag_id: lookupId("tags", goal.tag),
    created_at: goal.createdAt ? new Date(goal.createdAt).toISOString() : undefined,
  }));
  await insertRows("ts_goals", weeklyRows, "weeklyGoals");
}

// =====================================================
// 3. Habits (+ habit_completions)
// =====================================================
async function migrateHabits() {
  console.log("\n📌 3/4 迁移 habits (+completedDates) -> ts_habits / ts_habit_completions");

  const habits = await readJson("habits");
  if (!habits || !Array.isArray(habits)) return;

  const habitRows = habits.map((habit) => ({
    id: mapId("habits", habit.id),
    user_id: userId,
    name: habit.name,
    tag_id: lookupId("tags", habit.tag),
    priority: habit.priority || null,
    yearly_goal_id: habit.yearlyGoalId ? lookupId("goals", habit.yearlyGoalId) : null,
    created_at: habit.createdAt ? new Date(habit.createdAt).toISOString() : undefined,
  }));
  await insertRows("ts_habits", habitRows, "habits");

  const completionRows = [];
  habits.forEach((habit) => {
    const habitUuid = lookupId("habits", habit.id);
    (habit.completedDates || []).forEach((date) => {
      // 用合成 key `${habitId}_${date}` 走 mapId，纯粹是为了让统计计数（idMaps.habitCompletions.size）
      // 能反映真实迁移的完成记录条数；实际 Supabase 主键取的是这个映射值本身。
      const completionId = mapId("habitCompletions", `${habit.id}_${date}`);
      completionRows.push({
        id: completionId,
        user_id: userId,
        habit_id: habitUuid,
        completed_date: date,
      });
    });
  });
  await insertRows("ts_habit_completions", completionRows, "habit_completions");
}

// =====================================================
// 4. Tasks (backlog + daily；父任务先插，拿到新 UUID 后再插子任务)
// isHabit: true 的虚拟任务跳过（运行时动态生成，不落库）
// =====================================================
async function migrateTasks() {
  console.log("\n📌 4/4 迁移 backlogTasks / dailyTasks -> ts_tasks");

  const backlogTasks = (await readJson("backlogTasks")) || [];
  const dailyTasks = (await readJson("dailyTasks")) || {};

  // 展开成扁平列表：{ ...task, scheduledDate }
  const flatTasks = [];

  (Array.isArray(backlogTasks) ? backlogTasks : []).forEach((task) => {
    if (task.isHabit) return;
    flatTasks.push({ task, scheduledDate: null });
  });

  if (dailyTasks && typeof dailyTasks === "object") {
    Object.keys(dailyTasks).forEach((dateKey) => {
      (dailyTasks[dateKey] || []).forEach((task) => {
        if (task.isHabit) return;
        flatTasks.push({ task, scheduledDate: dateKey });
      });
    });
  }

  // 第一轮：只插父任务（parentTaskId 为空的），确保它们的新 UUID 已经分配好
  const parentEntries = flatTasks.filter(({ task }) => !task.parentTaskId);
  const parentRows = parentEntries.map(({ task, scheduledDate }) =>
    buildTaskRow(task, scheduledDate)
  );
  await insertRows("ts_tasks", parentRows, "父任务（backlog + daily）");

  // 第二轮：插子任务（它们各自内嵌在父任务的 subtasks 数组里，且父任务此时已有映射好的新 UUID）
  const childRows = [];
  parentEntries.forEach(({ task, scheduledDate }) => {
    (task.subtasks || []).forEach((sub) => {
      if (sub.isHabit) return;
      childRows.push(buildTaskRow({ ...sub, parentTaskId: task.id }, scheduledDate));
    });
  });
  await insertRows("ts_tasks", childRows, "子任务");
}

function buildTaskRow(task, scheduledDate) {
  return {
    id: mapId("tasks", task.id),
    user_id: userId,
    parent_id: task.parentTaskId ? lookupId("tasks", task.parentTaskId) : null,
    title: task.title,
    completed: !!task.completed,
    scheduled_date: scheduledDate,
    time_spent: task.timeSpent || 0,
    focus_time: task.focusTime || 0,
    priority: task.priority || null,
    tag_id: lookupId("tags", task.tag),
    is_habit: false,
    habit_id: null,
    weekly_goal_id: task.weeklyGoalId ? lookupId("goals", task.weeklyGoalId) : null,
    subtasks_expanded: !!task.subtasksExpanded,
    sort_order: task.sortOrder || 0,
    created_at: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
  };
}

// =====================================================
// main
// =====================================================
async function main() {
  console.log(`🚀 开始迁移用户 ${userId} 的 JSON 备份数据到 Supabase`);
  console.log(`   备份目录: ${path.join(BACKUP_DIR, userId)}`);
  if (DRY_RUN) console.log("🧪 Dry-run 模式：只打印将要执行的操作，不写入数据库");

  await clearExistingRows();

  await migrateTags();
  await migrateGoals();
  await migrateHabits();
  await migrateTasks();

  console.log("\n✅ 迁移完成");
  console.log(
    `   映射统计: tags=${idMaps.tags.size}, goals=${idMaps.goals.size}, habits=${idMaps.habits.size}, habitCompletions=${idMaps.habitCompletions.size}, tasks=${idMaps.tasks.size}`
  );
  if (DRY_RUN) {
    console.log("🧪 以上为 dry-run 预览，没有真正写入数据库。");
  }
}

main().catch((error) => {
  console.error("\n🔥 迁移失败:", error);
  process.exit(1);
});
