"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TopicNodeStatus = "todo" | "in_progress" | "done";

export interface TopicTreeNodeData {
  id: string;
  title: string;
  status: TopicNodeStatus;
  progress?: number;
  children?: TopicTreeNodeData[];
  [key: string]: unknown;
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
}

/**
 * TreeNode - 技术课题拆解树的单个节点行，递归渲染自身的子节点列表。
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
}: TreeNodeProps) {
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const hasChildren = !!node.children && node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const badgePct =
    hasChildren && typeof node.progress === "number"
      ? Math.round(node.progress)
      : null;

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
        <div className="flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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

      {hasChildren && (
        <div
          className={cn(
            "ml-[13px] overflow-hidden border-l-2 border-muted/60 pl-[14px] transition-[max-height,opacity] duration-[250ms] ease-in-out",
            isCollapsed ? "max-h-0 opacity-0" : "max-h-[10000px] opacity-100"
          )}
        >
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onCycleStatus={onCycleStatus}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
