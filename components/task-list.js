"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Check,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Plus,
  Target,
} from "lucide-react";
import { formatFocusTime } from "@/utils/time";
import { PriorityBadge } from "@/components/priority-badge";

export function TaskList({
  tasks,
  customTags,
  onToggleTask,
  onDeleteTask,
  onTaskClick,
  onAddSubtask,
  weeklyGoals = [], // 周目标数组（用于任务）
  yearlyGoals = [], // 年度目标数组（用于习惯）
  isBacklog = false, // 是否是 Backlog 区域
  title = null, // 自定义标题
  noPaddingTop = false, // 是否移除顶部 padding
  noPaddingBottom = false, // 是否移除底部 padding
}) {
  // Use simple object instead of Set for better state management
  const [expandedTasks, setExpandedTasks] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    habits: false,
    tasks: false,
  });

  // Audio refs for sound effects
  const completeAudioRef = useRef(null);

  // Initialize audio elements
  if (typeof window !== "undefined") {
    if (!completeAudioRef.current) {
      completeAudioRef.current = new Audio("/music/complete.mp3");
      completeAudioRef.current.volume = 0.3;
    }
  }

  const playCompleteSound = () => {
    if (completeAudioRef.current) {
      completeAudioRef.current.currentTime = 0;
      completeAudioRef.current
        .play()
        .catch((e) => console.log("Complete sound play failed:", e));
    }
  };

  const handleTaskClick = (task, event) => {
    onTaskClick(task);
  };

  const handleToggleTask = (taskId, event) => {
    event.stopPropagation();
    const task = findTaskById(taskId);
    if (!task.completed) {
      playCompleteSound();
    }
    onToggleTask(taskId);
  };

  const toggleExpanded = (taskId, event) => {
    event.stopPropagation();
    event.preventDefault();

    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAddSubtask = (taskId, event) => {
    event.stopPropagation();
    onAddSubtask(taskId);
  };

  const findTaskById = (taskId) => {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      if (task.subtasks) {
        for (const subtask of task.subtasks) {
          if (subtask.id === taskId) return subtask;
        }
      }
    }
    return null;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTagInfo = (tagId) => {
    return customTags.find((tag) => tag.id === tagId);
  };

  // Calculate total time including subtasks
  const getTotalTime = (task) => {
    const subtaskTime = (task.subtasks || []).reduce(
      (sum, subtask) => sum + (subtask.timeSpent || 0),
      0
    );
    return (task.timeSpent || 0) + subtaskTime;
  };

  const getTotalFocusTime = (task) => {
    const subtaskFocusTime = (task.subtasks || []).reduce(
      (sum, subtask) => sum + (subtask.focusTime || 0),
      0
    );
    return (task.focusTime || 0) + subtaskFocusTime;
  };

  // Filter and sort tasks
  const mainTasks = tasks.filter((task) => !task.parentTaskId);
  const regularTasks = mainTasks.filter((task) => !task.isHabit);
  const habitTasks = mainTasks.filter((task) => task.isHabit);

  // Sort tasks: incomplete first, then by priority (P0 > P1 > P2 > P3 > none), then completed
  const sortTasksByCompletion = (taskList) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    
    return [...taskList].sort((a, b) => {
      // First sort by completion status (incomplete first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // Then sort by priority (higher priority first)
      const aPriority = a.priority ? priorityOrder[a.priority] : 999;
      const bPriority = b.priority ? priorityOrder[b.priority] : 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority and completion status, keep original order (by creation time)
      return 0;
    });
  };

  const sortedRegularTasks = sortTasksByCompletion(regularTasks);
  const sortedHabitTasks = sortTasksByCompletion(habitTasks);
  
  // For Backlog mode, sort all tasks
  const sortedTasks = isBacklog ? sortTasksByCompletion(tasks) : [];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15,
      },
    },
  };

  const taskVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      x: -30,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  const sectionVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.2, delay: 0.1 },
      },
    },
    exit: {
      height: 0,
      opacity: 0,
      transition: {
        opacity: { duration: 0.1 },
        height: { duration: 0.2, delay: 0.1 },
      },
    },
  };

  // 动态构建 className
  let rootClassName = "h-full overflow-y-auto hide-scroll overflow-x-hidden";
  
  if (!noPaddingTop && !noPaddingBottom) {
    // 默认：所有 padding
    rootClassName += " p-4 px-0 pb-[3.54rem]";
  } else if (noPaddingTop && !noPaddingBottom) {
    // 移除顶部 padding，保留底部
    rootClassName += " px-0 pb-[3.54rem]";
  } else if (!noPaddingTop && noPaddingBottom) {
    // 移除底部 padding，保留顶部
    rootClassName += " p-4 px-0";
  } else {
    // 移除所有 padding
    rootClassName += " px-0";
  }

  return (
    <div className={rootClassName}>
      <AnimatePresence>
        {/* Backlog Section */}
        {isBacklog ? (
          <motion.div
            key="backlog-section"
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => toggleSection("tasks")}
              className="w-full text-left text-sm text-primary font-extrabold uppercase tracking-wide mb-3 flex items-center gap-2 hover:text-primary/80 transition-colors"
              variants={headerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div
                animate={{ rotate: collapsedSections.tasks ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
              <Calendar className="h-4 w-4" />
              {title || "待办"} ({sortedTasks.filter((t) => t.completed).length}/
              {sortedTasks.length})
            </motion.button>

            <AnimatePresence>
              {!collapsedSections.tasks && (
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <motion.div
                    className=""
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {sortedTasks.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onTaskClick={handleTaskClick}
                        onToggleTask={handleToggleTask}
                        onToggleExpanded={toggleExpanded}
                        onAddSubtask={handleAddSubtask}
                        formatTime={formatTime}
                        getTagInfo={getTagInfo}
                        getTotalTime={getTotalTime}
                        getTotalFocusTime={getTotalFocusTime}
                        isHabit={false}
                        variants={taskVariants}
                        isLastTask={index === sortedTasks.length - 1}
                        isExpanded={expandedTasks[task.id] || false}
                        expandedTasks={expandedTasks}
                        level={0}
                        weeklyGoals={weeklyGoals}
                        yearlyGoals={yearlyGoals}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {sortedTasks.length === 0 && (
              <motion.div
                key="no-backlog-message"
                className="text-center py-8 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-sm">还没有待办任务</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Habits Section */}
            {sortedHabitTasks.length > 0 && (
          <motion.div
            key="habits-section"
            className="mb-6 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => toggleSection("habits")}
              className="w-full text-left text-sm text-primary font-extrabold uppercase tracking-wide mb-3 flex items-center gap-2 hover:text-primary/80 transition-colors"
              variants={headerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div
                animate={{ rotate: collapsedSections.habits ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
              <RotateCcw className="h-4 w-4" />
              习惯 ({sortedHabitTasks.filter((t) => t.completed).length}/
              {sortedHabitTasks.length})
            </motion.button>

            <AnimatePresence>
              {!collapsedSections.habits && (
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <motion.div
                    className=""
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {sortedHabitTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onTaskClick={handleTaskClick}
                        onToggleTask={handleToggleTask}
                        onToggleExpanded={toggleExpanded}
                        onAddSubtask={handleAddSubtask}
                        formatTime={formatTime}
                        getTagInfo={getTagInfo}
                        getTotalTime={getTotalTime}
                        getTotalFocusTime={getTotalFocusTime}
                        isHabit={true}
                        variants={taskVariants}
                        isLastTask={
                          task.id ===
                          sortedHabitTasks[sortedHabitTasks.length - 1].id
                        }
                        isExpanded={expandedTasks[task.id] || false}
                        expandedTasks={expandedTasks}
                        level={0}
                        weeklyGoals={weeklyGoals}
                        yearlyGoals={yearlyGoals}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Regular Tasks Section */}
        {sortedRegularTasks.length > 0 && (
          <motion.div
            key="tasks-section"
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => toggleSection("tasks")}
              className="w-full text-left text-sm text-primary font-extrabold uppercase tracking-wide mb-3 flex items-center gap-2 hover:text-primary/80 transition-colors"
              variants={headerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div
                animate={{ rotate: collapsedSections.tasks ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
              <Calendar className="h-4 w-4" />
              今日任务 ({sortedRegularTasks.filter((t) => t.completed).length}/
              {sortedRegularTasks.length})
            </motion.button>

            <AnimatePresence>
              {!collapsedSections.tasks && (
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <motion.div
                    className=""
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {sortedRegularTasks.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onTaskClick={handleTaskClick}
                        onToggleTask={handleToggleTask}
                        onToggleExpanded={toggleExpanded}
                        onAddSubtask={handleAddSubtask}
                        formatTime={formatTime}
                        getTagInfo={getTagInfo}
                        getTotalTime={getTotalTime}
                        getTotalFocusTime={getTotalFocusTime}
                        isHabit={false}
                        variants={taskVariants}
                        isLastTask={index === sortedRegularTasks.length - 1}
                        isExpanded={expandedTasks[task.id] || false}
                        expandedTasks={expandedTasks}
                        level={0}
                        weeklyGoals={weeklyGoals}
                        yearlyGoals={yearlyGoals}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {!isBacklog && tasks.length === 0 && (
          <motion.div
            key="no-tasks-message"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12 text-primary/60 font-bold"
          >
            <p>No tasks yet. Add one to get started!</p>
          </motion.div>
        )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskItem({
  task,
  onTaskClick,
  onToggleTask,
  onToggleExpanded,
  onAddSubtask,
  formatTime,
  getTagInfo,
  getTotalTime,
  getTotalFocusTime,
  isHabit,
  variants,
  isLastTask,
  isExpanded,
  expandedTasks,
  level = 0,
  isSubtask = false,
  weeklyGoals = [], // 周目标数组（用于任务）
  yearlyGoals = [], // 年度目标数组（用于习惯）
}) {
  const tagInfo = getTagInfo(task.tag);
  const subtasks = task.subtasks || [];
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasks = hasSubtasks
    ? subtasks.filter((st) => st && st.completed).length
    : 0;

  // Use individual task time for subtasks, total time for main tasks
  const displayTimeSpent = isSubtask ? task.timeSpent || 0 : getTotalTime(task);
  const displayFocusTime = isSubtask
    ? task.focusTime || 0
    : getTotalFocusTime(task);
  
  // 根据任务类型查找关联的目标
  // 习惯关联年度目标，任务关联周目标
  const linkedGoal = task.isHabit 
    ? (task.yearlyGoalId ? yearlyGoals.find(g => g.id === task.yearlyGoalId) : null)
    : (task.weeklyGoalId ? weeklyGoals.find(g => g.id === task.weeklyGoalId) : null);

  // Sort subtasks: incomplete first, then completed
  const sortedSubtasks = [...subtasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // Calculate proper indentation - only apply to parent tasks with subtasks
  const shouldIndent = hasSubtasks && !isSubtask && level === 0;
  const paddingLeft = isSubtask ? 30 : shouldIndent ? 0 : 0;

  return (
    <>
      <motion.div
        variants={variants}
        layout
        className={`group relative border-t border-dashed cursor-pointer border-primary/50 dark:border-primary-700 select-none overflow-hidden ${
          task.completed ? "" : "hover:bg-primary/5"
        } 
        ${isLastTask && (!hasSubtasks || !isExpanded) ? "border-b" : ""}`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        whileHover={{ scale: 1.0 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between relative z-10">
          <div
            className="flex items-center gap-3 flex-1 p-4 line-clamp-1"
            onClick={(e) => onTaskClick(task, e)}
          >
            {/* Expand/Collapse button for main tasks with subtasks */}
            {hasSubtasks && !isSubtask && (
              <motion.button
                onClick={(e) => onToggleExpanded(task.id, e)}
                className="flex-shrink-0 p-1.5 -ml-2 hover:text-primary/80 dark:hover:text-primary/80 rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              </motion.button>
            )}

            <div className="flex-1">
              {/* 第一行：TAG + 目标关联 + 子任务进度（横向排列）*/}
              {(tagInfo || linkedGoal || hasSubtasks) && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {/* TAG */}
                  {tagInfo && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tagInfo.color }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold leading-none">
                        {tagInfo.name}
                      </span>
                    </div>
                  )}

                  {/* 目标关联指示器 */}
                  {linkedGoal && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1 text-primary font-semibold"
                      title={`关联到${task.isHabit ? '年度' : '周'}目标: ${linkedGoal.title}`}
                    >
                      {task.isHabit ? (
                        <Target className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="text-xs leading-none">{linkedGoal.title}</span>
                    </motion.div>
                  )}

                  {/* 子任务进度指示器 */}
                  {hasSubtasks && !isSubtask && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`px-2 py-0.5 text-xs font-bold rounded-full leading-none ${
                        completedSubtasks === subtasks.length
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                      }`}
                    >
                      {completedSubtasks}/{subtasks.length}
                    </motion.div>
                  )}
                </div>
              )}

              {/* 第二行：优先级 + 任务标题 */}
              <motion.span
                animate={{
                  opacity: task.completed ? 0.7 : 1,
                }}
                className={`block font-extrabold text-lg flex items-center gap-2 ${
                  task.completed
                    ? "line-through text-gray-600 dark:text-gray-100"
                    : "text-gray-600 dark:text-gray-100"
                }`}
              >
                {task.priority && (
                  <PriorityBadge priority={task.priority} size="sm" />
                )}
                <span className="flex-1">{task.title}</span>
              </motion.span>

              {/* 第三行：时间统计（如果有的话）*/}
              {(displayTimeSpent > 0 || displayFocusTime > 0) && (
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {displayTimeSpent > 0 && (
                    <div className="flex items-center gap-1 font-extrabold opacity-80">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(displayTimeSpent)}</span>
                    </div>
                  )}
                  {displayFocusTime > 0 && (
                    <div className="flex items-center gap-1 font-extrabold opacity-80">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatFocusTime(displayFocusTime)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Add Subtask Button - only for main tasks, not habits */}
          {!isHabit && !isSubtask && (
            <motion.button
              onClick={(e) => onAddSubtask(task.id, e)}
              className="flex-shrink-0 p-2 opacity-0 group-hover:opacity-100 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all duration-200 mr-2"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Add subtask"
            >
              <Plus className="h-4 w-4 text-primary dark:text-primary" />
            </motion.button>
          )}

          {/* Completion Circle */}
          <div
            className="flex-shrink-0 h-12 w-12 flex items-center justify-center"
            onClick={(e) => onToggleTask(task.id, e)}
          >
            <motion.button
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 mr-4 ${
                task.completed
                  ? "bg-primary border-primary"
                  : "border-primary/50 hover:border-primary hover:bg-primary/10 border-dotted"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence>
                {task.completed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Render subtasks with proper sorting */}
      {hasSubtasks && isExpanded && (
        <div>
          {sortedSubtasks.map((subtask, subIndex) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              onTaskClick={onTaskClick}
              onToggleTask={onToggleTask}
              onToggleExpanded={onToggleExpanded}
              onAddSubtask={onAddSubtask}
              formatTime={formatTime}
              getTagInfo={getTagInfo}
              getTotalTime={getTotalTime}
              getTotalFocusTime={getTotalFocusTime}
              isHabit={false}
              variants={variants}
              isLastTask={subIndex === sortedSubtasks.length - 1 && isLastTask}
              isExpanded={false}
              expandedTasks={expandedTasks}
              level={level + 1}
              isSubtask={true}
              weeklyGoals={weeklyGoals}
              yearlyGoals={yearlyGoals}
            />
          ))}
        </div>
      )}
    </>
  );
}
