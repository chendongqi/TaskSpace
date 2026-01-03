"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Target,
  Calendar,
  Edit2,
  Trash2,
  Check,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#a85520", // brown
  "#6366f1", // indigo
];

export function YearlyGoalsTracker({
  yearlyGoals,
  customTags,
  onClose,
  onUpdateGoals,
  onAddCustomTag,
}) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  // Form states
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalYear, setGoalYear] = useState(currentYear);
  const [selectedTag, setSelectedTag] = useState("none");
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  // Audio ref for completion sound
  const completeAudioRef = useRef(null);
  
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

  // Filter goals by current year
  const currentYearGoals = yearlyGoals.filter((goal) => goal.year === currentYear);
  
  // Sort goals: incomplete first, then completed
  const sortedGoals = [...currentYearGoals].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // Calculate statistics
  const completedCount = currentYearGoals.filter((g) => g.completed).length;
  const avgProgress = currentYearGoals.length > 0
    ? currentYearGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / currentYearGoals.length
    : 0;

  const addOrUpdateGoal = () => {
    if (!goalTitle.trim()) return;
    
    const goalData = {
      id: editingGoal?.id || Date.now().toString(),
      title: goalTitle.trim(),
      description: goalDescription.trim(),
      year: goalYear,
      completed: editingGoal?.completed || false,
      progress: editingGoal?.progress || 0,
      tag: selectedTag && selectedTag !== "none" ? selectedTag : undefined,
      createdAt: editingGoal?.createdAt || new Date(),
    };

    if (editingGoal) {
      // Update existing goal
      const updatedGoals = yearlyGoals.map((goal) =>
        goal.id === editingGoal.id ? goalData : goal
      );
      onUpdateGoals(updatedGoals);
    } else {
      // Add new goal
      onUpdateGoals([...yearlyGoals, goalData]);
    }

    // Reset form
    setGoalTitle("");
    setGoalDescription("");
    setGoalYear(currentYear);
    setSelectedTag("");
    setShowAddForm(false);
    setEditingGoal(null);
  };

  const startEdit = (goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || "");
    setGoalYear(goal.year);
    setSelectedTag(goal.tag || "none");
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingGoal(null);
    setGoalTitle("");
    setGoalDescription("");
    setGoalYear(currentYear);
    setSelectedTag("none");
    setShowAddForm(false);
  };

  const deleteGoal = (goalId) => {
    if (confirm("确定要删除这个目标吗？")) {
      const updatedGoals = yearlyGoals.filter((goal) => goal.id !== goalId);
      onUpdateGoals(updatedGoals);
    }
  };

  const updateProgress = (goalId, newProgress) => {
    const updatedGoals = yearlyGoals.map((goal) => {
      if (goal.id === goalId) {
        const progress = Math.max(0, Math.min(100, newProgress));
        const wasCompleted = goal.completed;
        const completed = progress >= 100;
        
        // Play sound when completing
        if (!wasCompleted && completed) {
          playCompleteSound();
        }
        
        return { ...goal, progress, completed };
      }
      return goal;
    });
    onUpdateGoals(updatedGoals);
  };

  const toggleCompleted = (goalId) => {
    const goal = yearlyGoals.find((g) => g.id === goalId);
    if (!goal) return;
    
    const newCompleted = !goal.completed;
    const updatedGoals = yearlyGoals.map((g) => {
      if (g.id === goalId) {
        if (newCompleted && !g.completed) {
          playCompleteSound();
        }
        return {
          ...g,
          completed: newCompleted,
          progress: newCompleted ? 100 : g.progress,
        };
      }
      return g;
    });
    onUpdateGoals(updatedGoals);
  };

  const addTag = () => {
    if (newTagName.trim()) {
      const newTagId = onAddCustomTag(newTagName.trim(), selectedColor);
      setSelectedTag(newTagId);
      setNewTagName("");
      setShowAddTag(false);
    }
  };

  const getTagInfo = (tagId) => {
    return customTags.find((tag) => tag.id === tagId);
  };

  const nextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const prevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.15 },
    },
  };

  const modalVariants = {
    hidden: {
      y: "100%",
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      y: "100%",
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
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
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold">年度目标</h2>
                  <p className="text-sm text-muted-foreground">
                    {completedCount}/{currentYearGoals.length} 已完成 • 平均进度 {avgProgress.toFixed(0)}%
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Year Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevYear}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 min-w-[120px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-extrabold">{currentYear}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextYear}
                className="rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-4">
            {showAddForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-accent/30 rounded-2xl p-6 mb-4"
              >
                <h3 className="text-lg font-extrabold mb-4">
                  {editingGoal ? "编辑目标" : "添加新目标"}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      目标标题 *
                    </label>
                    <Input
                      placeholder="例如：学习一门新语言"
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      目标描述
                    </label>
                    <textarea
                      placeholder="描述你的目标细节..."
                      value={goalDescription}
                      onChange={(e) => setGoalDescription(e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 bg-background border rounded-lg resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      目标年份
                    </label>
                    <Input
                      type="number"
                      value={goalYear}
                      onChange={(e) => setGoalYear(parseInt(e.target.value) || currentYear)}
                      className="w-32"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      标签
                    </label>
                    <div className="flex gap-2">
                      <Select value={selectedTag} onValueChange={setSelectedTag}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="选择标签（可选）" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无标签</SelectItem>
                          {customTags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowAddTag(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {showAddTag && (
                    <div className="bg-background/50 rounded-lg p-4 space-y-3">
                      <Input
                        placeholder="新标签名称"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 ${
                              selectedColor === color
                                ? "border-foreground scale-110"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={addTag} size="sm" className="flex-1">
                          添加标签
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddTag(false)}
                          size="sm"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={addOrUpdateGoal} className="flex-1">
                      {editingGoal ? "保存更改" : "添加目标"}
                    </Button>
                    <Button variant="outline" onClick={cancelEdit} className="flex-1">
                      取消
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full mb-4"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                添加新目标
              </Button>
            )}

            {/* Goals List */}
            {sortedGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-semibold text-muted-foreground">
                  {currentYear} 年还没有目标
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  点击上方按钮添加你的第一个年度目标
                </p>
              </div>
            ) : (
              <motion.div
                className="space-y-3"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                {sortedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    tagInfo={getTagInfo(goal.tag)}
                    onToggleCompleted={toggleCompleted}
                    onUpdateProgress={updateProgress}
                    onEdit={startEdit}
                    onDelete={deleteGoal}
                    variants={itemVariants}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function GoalCard({
  goal,
  tagInfo,
  onToggleCompleted,
  onUpdateProgress,
  onEdit,
  onDelete,
  variants,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [progressInput, setProgressInput] = useState(goal.progress || 0);

  const handleProgressChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setProgressInput(value);
  };

  const handleProgressBlur = () => {
    onUpdateProgress(goal.id, progressInput);
    setIsEditing(false);
  };

  return (
    <motion.div
      variants={variants}
      className={`bg-accent/30 rounded-2xl p-4 ${
        goal.completed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleCompleted(goal.id)}
          className="mt-1 flex-shrink-0"
        >
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              goal.completed
                ? "bg-primary border-primary"
                : "border-primary hover:bg-primary/10"
            }`}
          >
            {goal.completed && <Check className="h-4 w-4 text-primary-foreground" />}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3
                className={`font-extrabold text-lg ${
                  goal.completed ? "line-through" : ""
                }`}
              >
                {goal.title}
              </h3>
              {goal.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {goal.description}
                </p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(goal)}
                className="h-8 w-8"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(goal.id)}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {tagInfo && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold mb-2"
              style={{
                backgroundColor: `${tagInfo.color}20`,
                color: tagInfo.color,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tagInfo.color }}
              />
              {tagInfo.name}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">
                进度
              </span>
              {isEditing ? (
                <input
                  type="number"
                  value={progressInput}
                  onChange={handleProgressChange}
                  onBlur={handleProgressBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProgressBlur();
                    if (e.key === "Escape") {
                      setProgressInput(goal.progress || 0);
                      setIsEditing(false);
                    }
                  }}
                  className="w-16 px-2 py-0.5 text-xs text-right bg-background border rounded"
                  min="0"
                  max="100"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-extrabold hover:text-primary transition-colors"
                >
                  {goal.progress || 0}%
                </button>
              )}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress || 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

