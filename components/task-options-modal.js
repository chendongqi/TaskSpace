"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Trash2,
  Edit,
  Tag,
  Plus,
  Settings,
  Save,
  ArrowRight,
  List,
  ChevronRight,
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

export function TaskOptionsModal({
  task,
  customTags,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddCustomTag,
  onToggleTask,
  selectedDate,
  onTransferTask,
  currentActualDate,
  onAddSubtask,
  allTasks,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [selectedTag, setSelectedTag] = useState(task.tag || "no-tag");
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Get subtasks for this task
  const subtasks = task.subtasks || [];
  const isSubtask = !!task.parentTaskId;

  const handleComplete = () => {
    if (onToggleTask) {
      onToggleTask(task.id);
    } else {
      onUpdateTask(task.id, { completed: !task.completed });
    }
    onClose();
  };

  const handleDelete = () => {
    onDeleteTask(task.id);
    onClose();
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdateTask(task.id, { title: editTitle.trim() });
      setIsEditing(false);
    }
  };

  const handleTagChange = (newTag) => {
    setSelectedTag(newTag);
    onUpdateTask(task.id, {
      tag: newTag === "no-tag" ? undefined : newTag,
    });
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTagId = onAddCustomTag(newTagName.trim(), selectedColor);
      handleTagChange(newTagId);
      setNewTagName("");
      setShowAddTag(false);
    }
  };

  const handleTransfer = () => {
    onTransferTask(task.id, task.createdAt, currentActualDate);
    onClose();
  };

  const handleAddSubtask = () => {
    onAddSubtask(task.id);
    onClose();
  };

  const isDifferentDay =
    task.createdAt.toDateString() !== currentActualDate.toDateString();

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
        duration: 0.4,
      },
    },
    exit: {
      y: "100%",
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  const tagFormVariants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.4,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  const colorButtonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
      },
    },
    hover: {
      scale: 1.1,
      transition: { duration: 0.1 },
    },
    tap: { scale: 0.95 },
  };

  const ThemePreview = ({ themeData, isSelected, onClick }) => (
    <motion.button
      onClick={onClick}
      className={`relative w-full p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {/* Theme Preview */}
        <div className="flex gap-1">
          <div
            className="w-4 h-8 rounded-sm"
            style={{ backgroundColor: themeData.preview.primary }}
          />
          <div
            className="w-4 h-8 rounded-sm"
            style={{ backgroundColor: themeData.preview.secondary }}
          />
          <div
            className="w-4 h-8 rounded-sm border border-gray-300"
            style={{ backgroundColor: themeData.preview.background }}
          />
        </div>

        {/* Theme Info */}
        <div className="flex-1 text-left">
          <div className="font-extrabold text-gray-900 dark:text-gray-100">
            {themeData.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {themeData.description}
          </div>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center"
          >
            <Check className="h-4 w-4 text-primary-foreground" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        variants={modalVariants}
        className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border-t border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <motion.div
          className="flex justify-center pt-4 pb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="w-12 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
            onClick={onClose}
          />
        </motion.div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-70px)]">
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  delay: 0.25,
                  type: "spring",
                  stiffness: 300,
                }}
                className="p-2.5 bg-primary/10 rounded-xl"
              >
                <Settings className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-wide">
                  Options
                </h2>
                {isSubtask && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Subtask
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-2 dark:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>

          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Task Title */}
            <motion.div variants={itemVariants} className="space-y-3">
              {isEditing ? (
                <div className="flex gap-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    autoFocus
                    className="border-0 bg-transparent md:text-2xl h-10 font-extrabold px-0 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleSaveEdit}
                      className="p-2 px-3 rounded-xl font-bold"
                    >
                      <Save className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 px-0 h-10 rounded-xl ">
                  <span className="font-extrabold text-2xl line-clamp-1">
                    {editTitle || task.title}
                  </span>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg p-2  px-3"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Current Tag */}
            {selectedTag && selectedTag !== "no-tag" && (
              <motion.div variants={itemVariants} className="space-y-3">
                <label className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Current Category
                </label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                  <motion.div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: customTags.find(
                        (tag) => tag.id === selectedTag
                      )?.color,
                    }}
                    whileHover={{ scale: 1.2 }}
                  />
                  <span className="text-gray-900 dark:text-gray-100 font-extrabold">
                    {customTags.find((tag) => tag.id === selectedTag)?.name}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Subtasks Section - Only show for main tasks */}
            {!isSubtask && !task.isHabit && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Subtasks ({subtasks.length})
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="p-2"
                  >
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        showSubtasks ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </div>

                <AnimatePresence>
                  {showSubtasks && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      {subtasks.length > 0 ? (
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                          {subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-lg"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  subtask.completed
                                    ? "bg-primary border-primary"
                                    : "border-gray-300 dark:border-gray-500"
                                }`}
                              >
                                {subtask.completed && (
                                  <Check className="h-2.5 w-2.5 text-white" />
                                )}
                              </div>
                              <span
                                className={`font-medium flex-1 ${
                                  subtask.completed
                                    ? "line-through text-gray-500"
                                    : "text-gray-900 dark:text-gray-100"
                                }`}
                              >
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-center">
                          <p className="text-gray-500 dark:text-gray-400 font-medium">
                            No subtasks yet
                          </p>
                        </div>
                      )}

                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          onClick={handleAddSubtask}
                          variant="outline"
                          className="w-full border-2 border-gray-300 font-extrabold hover:border-primary/70 dark:border-gray-600 dark:hover:border-primary/80 dark:text-gray-100 rounded-xl py-3"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Subtask
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Tag Selection */}
            <motion.div variants={itemVariants} className="space-y-3">
              <label className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Change Category
              </label>

              <Select value={selectedTag} onValueChange={handleTagChange}>
                <SelectTrigger className="border-2 border-gray-300 focus:border-primary/70 font-extrabold dark:border-gray-600 dark:focus:border-primary/80 dark:bg-gray-800 dark:text-gray-100 rounded-xl py-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem
                    value="no-tag"
                    className="rounded-lg dark:hover:bg-gray-700 dark:text-gray-100"
                  >
                    <span className="font-extrabold">No category</span>
                  </SelectItem>
                  {customTags.map((tag) => (
                    <SelectItem
                      key={tag.id}
                      value={tag.id}
                      className="rounded-lg dark:hover:bg-gray-700 dark:text-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                          whileHover={{ scale: 1.2 }}
                        />
                        <span className="font-extrabold">{tag.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  variant="outline"
                  onClick={() => setShowAddTag(!showAddTag)}
                  className="w-full border-2 border-gray-300 font-extrabold hover:border-primary/70 dark:border-gray-600 dark:hover:border-primary/80 dark:text-gray-100 rounded-xl py-3"
                >
                  <motion.div
                    animate={{ rotate: showAddTag ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus className="h-4 w-4" />
                  </motion.div>
                  {showAddTag ? "Cancel" : "Create New Category"}
                </Button>
              </motion.div>
            </motion.div>

            {/* Add New Tag Form */}
            <AnimatePresence>
              {showAddTag && (
                <motion.div
                  variants={tagFormVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 p-5 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/80"
                >
                  <motion.div variants={itemVariants}>
                    <Input
                      placeholder="Category name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      className="border-2 border-gray-300 font-extrabold focus:border-primary/70 dark:border-gray-600 dark:focus:border-primary/80 dark:text-gray-100 rounded-xl bg-white dark:bg-gray-700 py-3"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-4">
                    <label className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Choose Color
                    </label>
                    <motion.div
                      className="flex gap-3 flex-wrap justify-center"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: {
                          transition: {
                            staggerChildren: 0.04,
                          },
                        },
                      }}
                    >
                      {PRESET_COLORS.map((color, index) => (
                        <motion.button
                          key={color}
                          variants={colorButtonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => setSelectedColor(color)}
                          className={`w-11 h-11 rounded-full border-3 transition-all duration-200 relative overflow-hidden ${
                            selectedColor === color
                              ? "border-gray-900 dark:border-gray-100 shadow-lg ring-2 ring-primary/50"
                              : "border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400"
                          }`}
                          style={{ backgroundColor: color }}
                          custom={index}
                        >
                          {selectedColor === color && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-full h-full rounded-full flex items-center justify-center bg-black/20 dark:bg-white/20 backdrop-blur-sm"
                            >
                              <Check className="h-4 w-4 text-white drop-shadow-sm" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        onClick={handleAddTag}
                        className="w-full rounded-xl font-extrabold py-3"
                        disabled={!newTagName.trim()}
                      >
                        Create Category
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="space-y-3 pt-2">
              {/* Mark Complete/Incomplete button */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  onClick={handleComplete}
                  className={`w-full rounded-xl font-extrabold py-4 text-lg shadow-lg ${
                    task.completed
                      ? "bg-gray-500 hover:bg-gray-600 text-white"
                      : "bg-primary hover:bg-primary/70 text-white"
                  }`}
                >
                  <Check className="h-5 w-5 mr-2" />
                  {task.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
              </motion.div>

              {isDifferentDay && !task.isHabit && !isSubtask && (
                <Button
                  onClick={handleTransfer}
                  className="w-full bg-transparent rounded-xl font-extrabold text-lg"
                  variant="outline"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer to Today
                </Button>
              )}

              {/* Only show delete button for regular tasks, not habits */}
              {!task.isHabit && (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    className="w-full rounded-xl font-extrabold py-4 text-lg shadow-lg"
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Delete {isSubtask ? "Subtask" : "Task"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
