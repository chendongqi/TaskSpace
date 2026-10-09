"use client";

import * as React from "react";
import { Reorder, useDragControls, type DragControls } from "framer-motion";
import { Plus, X, Pencil, User, CalendarDays, Link2, MessageSquare, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge, PrioritySelector } from "@/components/priority-badge";

export type TopicNodeStatus = "todo" | "in_progress" | "done";
export type TopicNodePriority = "P0" | "P1" | "P2" | "P3";

export interface TopicTreeNodeData {
  id: string;
  title: string;
  status: TopicNodeStatus;
  progress?: number;
  children?: TopicTreeNodeData[];
  assignee?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  depends_on?: string[];
  comment?: string | null;
  priority?: TopicNodePriority | null;
  sort_order?: number;
  [key: string]: unknown;
}

export interface NodeFieldsUpdate {
  assignee?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  dependsOn?: string[];
  comment?: string | null;
}

export interface DependencyCandidate {
  id: string;
  title: string;
}

const STATUS_ORDER: TopicNodeStatus[] = ["todo", "in_progress", "done"];

function nextStatus(status: TopicNodeStatus): TopicNodeStatus {
  const idx = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

/**
 * 状态圆点：三态循环 todo(空心) -> in_progress(半色块) -> done(实心+勾)
 */
function StatusDot({
  status,
  onCycle,
}: {
  status: TopicNodeStatus;
  onCycle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCycle}
      title="点击切换状态"
      aria-label={`状态：${status}`}
      className={cn(
        "relative flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
        status === "todo" && "bg-card border-border",
        status === "in_progress" && "border-primary",
        status === "done" && "bg-primary border-primary"
      )}
      style={
        status === "in_progress"
          ? {
              background:
                "conic-gradient(hsl(var(--primary)) 0% 50%, hsl(var(--muted)) 50% 100%)",
            }
          : undefined
      }
    >
      {status === "done" && (
        <span className="text-[10px] font-black leading-none text-primary-foreground">
          ✓
        </span>
      )}
    </button>
  );
}

export interface TreeNodeProps {
  node: TopicTreeNodeData;
  depth?: number;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onCycleStatus: (id: string, nextStatus: TopicNodeStatus) => void;
  onRename: (id: string, title: string) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateFields?: (id: string, fields: NodeFieldsUpdate & { priority?: TopicNodePriority | null }) => void;
  /** 同级节点换序：(parentId, orderedChildIds) => void */
  onReorderChildren?: (parentId: string, orderedIds: string[]) => void;
  /** 同一棵课题树内所有节点（用于依赖选择器 + 依赖标题展示），不含自身 */
  dependencyCandidates?: DependencyCandidate[];
  /** id -> title，用于把 depends_on 的 id 列表渲染成可读标题 */
  nodeTitleById?: Map<string, string>;
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (start && end) return `${start} ~ ${end}`;
  if (start) return `${start} 起`;
  if (end) return `截止 ${end}`;
  return "";
}

/**
 * TreeNode - 课题拆解树的单个节点行，递归渲染自身的子节点列表。
 *
 * 还原 demo.html 的交互细节：
 * - 展开箭头（▾），无子节点隐藏，折叠时 rotate(-90deg)
 * - 状态圆点三态循环
 * - 标题 contenteditable 编辑，done 态删除线+变灰
 * - 有子节点时右侧展示自动汇总的百分比徽章
 * - hover 整行才淡入「+/×」增删按钮
 * - 子节点容器 margin-left:28px + 左侧细竖线，折叠时 max-height:0 过渡
 */
export function TreeNode({
  node,
  depth = 0,
  collapsedIds,
  onToggleCollapse,
  onCycleStatus,
  onRename,
  onAddChild,
  onDelete,
  onUpdateFields,
  onReorderChildren,
  dependencyCandidates = [],
  nodeTitleById,
  dragControls,
}: TreeNodeProps & { dragControls?: DragControls }) {
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const hasChildren = !!node.children && node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const badgePct =
    hasChildren && typeof node.progress === "number"
      ? Math.round(node.progress)
      : null;

  const [showFields, setShowFields] = React.useState(false);
  const dependsOn = node.depends_on || [];
  const hasExtraFields =
    !!node.assignee || !!node.planned_start || !!node.planned_end || dependsOn.length > 0 || !!node.comment;

  const handleTitleBlur = () => {
    const text = titleRef.current?.innerText.trim();
    if (text && text !== node.title) {
      onRename(node.id, text);
    } else if (titleRef.current) {
      // 恢复原文案，避免空白提交
      titleRef.current.innerText = node.title;
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (titleRef.current) titleRef.current.innerText = node.title;
      titleRef.current?.blur();
    }
  };

  return (
    <div className="relative" data-node-id={node.id}>
      <div className="group flex items-center gap-2 rounded-lg px-2.5 py-[9px] transition-colors hover:bg-accent/40">
        {/* 拖拽把手（仅同级换序场景下传入 dragControls 才渲染） */}
        {dragControls && (
          <span
            onPointerDown={(e) => dragControls.start(e)}
            title="拖动调整顺序"
            className="flex h-5 w-5 flex-shrink-0 cursor-grab touch-none select-none items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}

        {/* 展开箭头 */}
        <span
          onClick={() => hasChildren && onToggleCollapse(node.id)}
          className={cn(
            "flex h-5 w-5 flex-shrink-0 select-none items-center justify-center rounded text-muted-foreground transition-transform duration-200",
            hasChildren ? "cursor-pointer" : "invisible",
            isCollapsed && "-rotate-90"
          )}
        >
          {hasChildren ? "▾" : ""}
        </span>

        {/* 状态圆点 */}
        <StatusDot
          status={node.status}
          onCycle={() => onCycleStatus(node.id, nextStatus(node.status))}
        />

        {/* 优先级徽章 */}
        {node.priority && <PriorityBadge priority={node.priority} size="sm" className="" />}

        {/* 标题（contenteditable） */}
        <span
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          className={cn(
            "flex-1 cursor-text rounded px-1 py-0.5 text-sm font-semibold outline-none focus:bg-background focus:ring-2 focus:ring-primary",
            node.status === "done" &&
              "text-muted-foreground line-through opacity-75"
          )}
        >
          {node.title}
        </span>

        {/* 子节点汇总百分比徽章 */}
        {hasChildren && badgePct !== null && (
          <span className="flex-shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-extrabold text-muted-foreground">
            {badgePct}%
          </span>
        )}

        {/* hover 才淡入的增删按钮 */}
        <div
          className={cn(
            "flex flex-shrink-0 gap-0.5 transition-opacity group-hover:opacity-100",
            showFields || hasExtraFields ? "opacity-100" : "opacity-0"
          )}
        >
          {onUpdateFields && (
            <button
              type="button"
              title="优先级/责任人/时间/依赖/备注"
              onClick={() => setShowFields((v) => !v)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                showFields && "bg-accent text-foreground"
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="添加子节点"
            onClick={() => onAddChild(node.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="删除"
            onClick={() => onDelete(node.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 责任人/时间/依赖 徽章（折叠态展示） */}
      {hasExtraFields && !showFields && (
        <div className="ml-[46px] mb-1 flex flex-wrap items-center gap-1.5">
          {node.assignee && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <User className="h-3 w-3" />
              {node.assignee}
            </span>
          )}
          {(node.planned_start || node.planned_end) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDateRange(node.planned_start, node.planned_end)}
            </span>
          )}
          {dependsOn.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <Link2 className="h-3 w-3" />
              依赖 {dependsOn.map((id) => nodeTitleById?.get(id) || "未知节点").join("、")}
            </span>
          )}
          {node.comment && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {node.comment}
            </span>
          )}
        </div>
      )}

      {/* 字段编辑面板 */}
      {showFields && onUpdateFields && (
        <NodeFieldsEditor
          node={node}
          dependencyCandidates={dependencyCandidates.filter((c) => c.id !== node.id)}
          onSave={(fields) => {
            onUpdateFields(node.id, fields);
            setShowFields(false);
          }}
          onCancel={() => setShowFields(false)}
        />
      )}

      {hasChildren && (
        <div
          className={cn(
            "ml-[13px] overflow-hidden border-l-2 border-muted/60 pl-[14px] transition-[max-height,opacity] duration-[250ms] ease-in-out",
            isCollapsed ? "max-h-0 opacity-0" : "max-h-[10000px] opacity-100"
          )}
        >
          <SiblingList
            parentId={node.id}
            childNodes={node.children!}
            depth={depth + 1}
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
      )}
    </div>
  );
}

/**
 * 同级子节点列表：当传入 onReorderChildren 时，用 framer-motion 的
 * Reorder.Group/Reorder.Item 支持拖拽换序；否则退化为普通 map 渲染。
 */
export function SiblingList({
  parentId,
  childNodes,
  depth = 0,
  collapsedIds,
  onToggleCollapse,
  onCycleStatus,
  onRename,
  onAddChild,
  onDelete,
  onUpdateFields,
  onReorderChildren,
  dependencyCandidates,
  nodeTitleById,
}: {
  parentId: string;
  childNodes: TopicTreeNodeData[];
} & Omit<TreeNodeProps, "node">) {
  if (!onReorderChildren) {
    return (
      <>
        {childNodes.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth}
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
        ))}
      </>
    );
  }

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={childNodes}
      onReorder={(newOrder) =>
        onReorderChildren(parentId, newOrder.map((n) => n.id))
      }
    >
      {childNodes.map((child) => (
        <SortableChild
          key={child.id}
          child={child}
          depth={depth}
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
      ))}
    </Reorder.Group>
  );
}

function SortableChild({
  child,
  depth,
  collapsedIds,
  onToggleCollapse,
  onCycleStatus,
  onRename,
  onAddChild,
  onDelete,
  onUpdateFields,
  onReorderChildren,
  dependencyCandidates,
  nodeTitleById,
}: {
  child: TopicTreeNodeData;
} & Omit<TreeNodeProps, "node">) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={child} dragListener={false} dragControls={dragControls}>
      <TreeNode
        node={child}
        depth={depth}
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
        dragControls={dragControls}
      />
    </Reorder.Item>
  );
}

interface NodeFieldsEditorProps {
  node: TopicTreeNodeData;
  dependencyCandidates: DependencyCandidate[];
  onSave: (fields: NodeFieldsUpdate & { priority?: TopicNodePriority | null }) => void;
  onCancel: () => void;
}

/**
 * 节点字段编辑面板：优先级 / 责任人 / 计划开始-结束日期 / 依赖的其他节点 / 备注。
 * 展开后以表单形式编辑，保存时一次性 PATCH 这几个预留字段。
 */
function NodeFieldsEditor({
  node,
  dependencyCandidates,
  onSave,
  onCancel,
}: NodeFieldsEditorProps) {
  const [priority, setPriority] = React.useState<TopicNodePriority | undefined>(
    node.priority || undefined
  );
  const [assignee, setAssignee] = React.useState(node.assignee || "");
  const [plannedStart, setPlannedStart] = React.useState(node.planned_start || "");
  const [plannedEnd, setPlannedEnd] = React.useState(node.planned_end || "");
  const [dependsOn, setDependsOn] = React.useState<string[]>(node.depends_on || []);
  const [comment, setComment] = React.useState(node.comment || "");

  const toggleDependency = (id: string) => {
    setDependsOn((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="ml-[46px] mb-2 space-y-2.5 rounded-xl border border-dashed border-border bg-muted/30 p-3">
      <div>
        <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
          优先级
        </span>
        <PrioritySelector value={priority} onChange={setPriority} allowNone className="" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <User className="h-3 w-3" /> 责任人
          </span>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="例如：张三"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> 开始
            </span>
            <input
              type="date"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
              结束
            </span>
            <input
              type="date"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
      </div>

      <div>
        <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
          <Link2 className="h-3 w-3" /> 依赖的其他节点
        </span>
        {dependencyCandidates.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">暂无可选节点</p>
        ) : (
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {dependencyCandidates.map((c) => {
              const active = dependsOn.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleDependency(c.id)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
          <MessageSquare className="h-3 w-3" /> 备注
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="备注信息（可选）"
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-accent/60"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              priority: priority || null,
              assignee: assignee.trim() || null,
              plannedStart: plannedStart || null,
              plannedEnd: plannedEnd || null,
              dependsOn,
              comment: comment.trim() || null,
            })
          }
          className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          保存
        </button>
      </div>
    </div>
  );
}
