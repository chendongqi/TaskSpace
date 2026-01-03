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
  Link as LinkIcon,
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

const QUARTERS = [
  { value: 1, label: "Q1" },
  { value: 2, label: "Q2" },
  { value: 3, label: "Q3" },
  { value: 4, label: "Q4" },
];

export function QuarterlyGoalsTracker({
  quarterlyGoals,
  yearlyGoals,
  customTags,
  onClose,
  onUpdateGoals,
  onAddCustomTag,
  onYearlyGoalUpdate,
}) {
  const currentDate = new Date();
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [currentQuarter, setCurrentQuarter] = useState(
    Math.floor((currentDate.getMonth() + 3) / 3)
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  // Form states
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalYear, setGoalYear] = useState(currentYear);
  const [goalQuarter, setGoalQuarter] = useState(currentQuarter);
  const [selectedYearlyGoal, setSelectedYearlyGoal] = useState("none");
  const [goalWeight, setGoalWeight] = useState(25);
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

  // Filter goals by current year and quarter
  const filteredGoals = quarterlyGoals.filter(
    (goal) => goal.year === currentYear && goal.quarter === currentQuarter
  );
  
  // Sort goals: incomplete first, then completed
  const sortedGoals = [...filteredGoals].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // Calculate statistics
  const completedCount = filteredGoals.filter((g) => g.completed).length;
  const avgProgress = filteredGoals.length > 0
    ? filteredGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / filteredGoals.length
    : 0;

  // Get available yearly goals for the current year
  const availableYearlyGoals = yearlyGoals.filter(
    (goal) => goal.year === goalYear
  );

  // Calculate total weight for selected yearly goal
  const getTotalWeightForYearlyGoal = (yearlyGoalId) => {
    if (!yearlyGoalId || yearlyGoalId === "none") return 0;
    return quarterlyGoals
      .filter((g) => g.yearlyGoalId === yearlyGoalId && g.id !== editingGoal?.id)
      .reduce((sum, g) => sum + (g.weight || 0), 0);
  };

  const addOrUpdateGoal = () => {
    if (!goalTitle.trim()) return;
    
    const goalData = {
      id: editingGoal?.id || Date.now().toString(),
      title: goalTitle.trim(),
      description: goalDescription.trim(),
      year: goalYear,
      quarter: goalQuarter,
      completed: editingGoal?.completed || false,
      progress: editingGoal?.progress || 0,
      yearlyGoalId: selectedYearlyGoal && selectedYearlyGoal !== "none" ? selectedYearlyGoal : undefined,
      weight: selectedYearlyGoal && selectedYearlyGoal !== "none" ? Math.max(0, Math.min(100, goalWeight)) : undefined,
      tag: selectedTag && selectedTag !== "none" ? selectedTag : undefined,
      createdAt: editingGoal?.createdAt || new Date(),
    };

    const oldYearlyGoalId = editingGoal?.yearlyGoalId;

    if (editingGoal) {
      // Update existing goal
      const updatedGoals = quarterlyGoals.map((goal) =>
        goal.id === editingGoal.id ? goalData : goal
      );
      onUpdateGoals(updatedGoals);
      
      // Trigger yearly goal progress update if association changed
      if (oldYearlyGoalId !== goalData.yearlyGoalId || oldYearlyGoalId) {
        onYearlyGoalUpdate();
      }
    } else {
      // Add new goal
      onUpdateGoals([...quarterlyGoals, goalData]);
      
      // Trigger yearly goal progress update if associated
      if (goalData.yearlyGoalId) {
        onYearlyGoalUpdate();
      }
    }

    // Reset form
    setGoalTitle("");
    setGoalDescription("");
    setGoalYear(currentYear);
    setGoalQuarter(currentQuarter);
    setSelectedYearlyGoal("none");
    setGoalWeight(25);
    setSelectedTag("none");
    setShowAddForm(false);
    setEditingGoal(null);
  };

  const startEdit = (goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || "");
    setGoalYear(goal.year);
    setGoalQuarter(goal.quarter);
    setSelectedYearlyGoal(goal.yearlyGoalId || "none");
    setGoalWeight(goal.weight || 25);
    setSelectedTag(goal.tag || "none");
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingGoal(null);
    setGoalTitle("");
    setGoalDescription("");
    setGoalYear(currentYear);
    setGoalQuarter(currentQuarter);
    setSelectedYearlyGoal("none");
    setGoalWeight(25);
    setSelectedTag("none");
    setShowAddForm(false);
  };

  const deleteGoal = (goalId) => {
    const goal = quarterlyGoals.find((g) => g.id === goalId);
    const hasYearlyGoal = goal?.yearlyGoalId;
    const message = hasYearlyGoal
      ? "确定要删除这个季度目标吗？删除后，关联的年度目标进度将重新计算。"
      : "确定要删除这个季度目标吗？";
    
    if (confirm(message)) {
      const updatedGoals = quarterlyGoals.filter((goal) => goal.id !== goalId);
      onUpdateGoals(updatedGoals);
      
      // Trigger yearly goal progress update if it was associated
      if (hasYearlyGoal) {
        onYearlyGoalUpdate();
      }
    }
  };

  const updateProgress = (goalId, newProgress) => {
    const updatedGoals = quarterlyGoals.map((goal) => {
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
    
    // Trigger yearly goal progress update if associated
    const goal = updatedGoals.find((g) => g.id === goalId);
    if (goal?.yearlyGoalId) {
      onYearlyGoalUpdate();
    }
  };

  const toggleCompleted = (goalId) => {
    const goal = quarterlyGoals.find((g) => g.id === goalId);
    if (!goal) return;
    
    const newCompleted = !goal.completed;
    const updatedGoals = quarterlyGoals.map((g) => {
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
    
    // Trigger yearly goal progress update if associated
    if (goal.yearlyGoalId) {
      onYearlyGoalUpdate();
    }
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

  const getYearlyGoalInfo = (yearlyGoalId) => {
    return yearlyGoals.find((goal) => goal.id === yearlyGoalId);
  };

  const nextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const prevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const nextQuarter = () => {
    if (currentQuarter < 4) {
      setCurrentQuarter(currentQuarter + 1);
    } else {
      setCurrentQuarter(1);
      setCurrentYear(currentYear + 1);
    }
  };

  const prevQuarter = () => {
    if (currentQuarter > 1) {
      setCurrentQuarter(currentQuarter - 1);
    } else {
      setCurrentQuarter(4);
      setCurrentYear(currentYear - 1);
    }
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

  const currentQuarterLabel = QUARTERS.find((q) => q.value === currentQuarter)?.label || "Q1";
  const totalWeight = selectedYearlyGoal && selectedYearlyGoal !== "none"
    ? getTotalWeightForYearlyGoal(selectedYearlyGoal) + goalWeight
    : 0;

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
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold">季度目标</h2>
                  <p className="text-sm text-muted-foreground">
                    {completedCount}/{filteredGoals.length} 已完成 • 平均进度 {avgProgress.toFixed(0)}%
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

            {/* Year and Quarter Navigation */}
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
              
              <div className="w-px h-6 bg-border mx-2" />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={prevQuarter}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 min-w-[60px] justify-center">
                <span className="text-lg font-extrabold">{currentQuarterLabel}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextQuarter}
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
                  {editingGoal ? "编辑季度目标" : "添加新季度目标"}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      目标标题 *
                    </label>
                    <Input
                      placeholder="例如：完成项目第一阶段"
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
                      placeholder="描述你的季度目标细节..."
                      value={goalDescription}
                      onChange={(e) => setGoalDescription(e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 bg-background border rounded-lg resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        目标年份
                      </label>
                      <Input
                        type="number"
                        value={goalYear}
                        onChange={(e) => setGoalYear(parseInt(e.target.value) || currentYear)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        季度
                      </label>
                      <Select value={goalQuarter.toString()} onValueChange={(v) => setGoalQuarter(parseInt(v))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUARTERS.map((q) => (
                            <SelectItem key={q.value} value={q.value.toString()}>
                              {q.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      关联年度目标（可选）
                    </label>
                    <Select value={selectedYearlyGoal} onValueChange={setSelectedYearlyGoal}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择年度目标（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无关联</SelectItem>
                        {availableYearlyGoals.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedYearlyGoal && selectedYearlyGoal !== "none" && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="text-sm font-semibold mb-2 block">
                            权重占比 (0-100)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={goalWeight}
                            onChange={(e) => setGoalWeight(parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            当前年度目标已分配权重: {getTotalWeightForYearlyGoal(selectedYearlyGoal)}%
                            {totalWeight > 100 && (
                              <span className="text-destructive ml-1">
                                (总计 {totalWeight}%，将自动归一化)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
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
                添加新季度目标
              </Button>
            )}

            {/* Goals List */}
            {sortedGoals.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-semibold text-muted-foreground">
                  {currentYear} 年 {currentQuarterLabel} 还没有目标
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  点击上方按钮添加你的第一个季度目标
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
                  <QuarterlyGoalCard
                    key={goal.id}
                    goal={goal}
                    tagInfo={getTagInfo(goal.tag)}
                    yearlyGoalInfo={getYearlyGoalInfo(goal.yearlyGoalId)}
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

function QuarterlyGoalCard({
  goal,
  tagInfo,
  yearlyGoalInfo,
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

  const quarterLabel = QUARTERS.find((q) => q.value === goal.quarter)?.label || `Q${goal.quarter}`;

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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {goal.year} {quarterLabel}
                </span>
                {yearlyGoalInfo && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <LinkIcon className="h-3 w-3" />
                    <span>{yearlyGoalInfo.title}</span>
                    {goal.weight !== undefined && (
                      <span className="text-primary font-semibold">
                        ({goal.weight}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
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

          <div className="flex flex-wrap gap-2 mb-2">
            {tagInfo && (
              <div
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
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
          </div>

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
                  title="点击编辑进度"
                >
                  {goal.progress || 0}%
                </button>
              )}
            </div>
            {/* Progress Bar with Slider */}
            <div className="relative">
              {/* Visual Progress Bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress || 0}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              </div>
              {/* Draggable Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={goal.progress || 0}
                onChange={(e) => {
                  const newProgress = parseInt(e.target.value);
                  onUpdateProgress(goal.id, newProgress);
                }}
                className="w-full h-2 absolute top-0 slider"
                style={{ zIndex: 10 }}
                title="拖动设置进度"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

