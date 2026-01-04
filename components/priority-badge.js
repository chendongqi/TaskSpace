"use client";

import { motion } from "framer-motion";

// 优先级配置 - 带圈数字，直观简洁
const PRIORITY_CONFIG = {
  P0: {
    label: "①",
    description: "最高优先级 - 紧急重要",
  },
  P1: {
    label: "②",
    description: "高优先级 - 重要",
  },
  P2: {
    label: "③",
    description: "中优先级 - 一般",
  },
  P3: {
    label: "④",
    description: "低优先级 - 次要",
  },
};

/**
 * 优先级徽章组件 - 带圈数字
 * @param {Object} props
 * @param {"P0"|"P1"|"P2"|"P3"} props.priority - 优先级等级
 * @param {"sm"|"md"|"lg"} props.size - 徽章大小
 * @param {string} props.className - 额外的 CSS 类名
 */
export function PriorityBadge({
  priority,
  size = "sm",
  className = "",
}) {
  // 如果没有优先级,不显示徽章
  if (!priority || !PRIORITY_CONFIG[priority]) {
    return null;
  }

  const config = PRIORITY_CONFIG[priority];

  // 根据大小定义样式
  const sizeClasses = {
    sm: "text-[14px]",  // 稍微大一点让圈数字清晰
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center font-normal text-gray-600 dark:text-gray-100 ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      {config.label}
    </motion.span>
  );
}

/**
 * 优先级选择器组件 - 带圈数字
 * @param {Object} props
 * @param {"P0"|"P1"|"P2"|"P3"|undefined} props.value - 当前选中的优先级
 * @param {Function} props.onChange - 优先级变化回调 (priority) => void
 * @param {boolean} props.allowNone - 是否允许选择"无"
 * @param {string} props.className - 额外的 CSS 类名
 */
export function PrioritySelector({
  value,
  onChange,
  allowNone = true,
  className = "",
}) {
  const priorities = ["P0", "P1", "P2", "P3"];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            value === undefined
              ? "bg-primary text-primary-foreground"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          无
        </button>
      )}
      {priorities.map((priority) => {
        const config = PRIORITY_CONFIG[priority];
        const isSelected = value === priority;

        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            title={config.description}
          >
            {/* 带圈数字 */}
            <span className="text-base">
              {config.label}
            </span>
            <span>P{priority.slice(-1)}</span>
          </button>
        );
      })}
    </div>
  );
}

