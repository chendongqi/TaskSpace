"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Check,
  Trash2,
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

export function HabitTracker({
  habits,
  customTags,
  onClose,
  onUpdateHabits,
  onAddCustomTag,
}) {
  const [newHabitName, setNewHabitName] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [currentHabitIndex, setCurrentHabitIndex] = useState(-1); // -1 for overview, 0+ for individual habits
  const [showNavigation, setShowNavigation] = useState(true);

  // Generate past 30 days (exactly 30 for 6x5 grid)
  const generatePastDays = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  const pastDays = generatePastDays();

  // Calculate daily habit completion counts
  const getDailyHabitCount = (date) => {
    return habits.reduce((count, habit) => {
      return count + (habit.completedDates.includes(date) ? 1 : 0);
    }, 0);
  };

  // Get intensity color based on habit count (0-5+ habits)
  const getOverviewIntensityColor = (count) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";
    if (count === 1) return "bg-green-200 dark:bg-green-900";
    if (count === 2) return "bg-green-300 dark:bg-green-800";
    if (count === 3) return "bg-green-400 dark:bg-green-700";
    if (count === 4) return "bg-green-500 dark:bg-green-600";
    return "bg-green-600 dark:bg-green-500"; // 5+ habits
  };

  const addHabit = () => {
    if (newHabitName.trim()) {
      const newHabit = {
        id: Date.now().toString(),
        name: newHabitName.trim(),
        completedDates: [],
        tag: selectedTag || undefined,
      };
      onUpdateHabits([...habits, newHabit]);
      setNewHabitName("");
      setSelectedTag("");
      setShowAddForm(false);
      setShowNavigation(true);
      setCurrentHabitIndex(habits.length); // Switch to the new habit
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

  const deleteHabit = (habitId) => {
    const updatedHabits = habits.filter((habit) => habit.id !== habitId);
    onUpdateHabits(updatedHabits);
    if (currentHabitIndex >= updatedHabits.length) {
      setCurrentHabitIndex(Math.max(-1, updatedHabits.length - 1));
    }
  };

  const toggleHabitDay = (habitId, date) => {
    const updatedHabits = habits.map((habit) => {
      if (habit.id === habitId) {
        const completedDates = habit.completedDates.includes(date)
          ? habit.completedDates.filter((d) => d !== date)
          : [...habit.completedDates, date];
        return { ...habit, completedDates };
      }
      return habit;
    });
    onUpdateHabits(updatedHabits);
  };

  const getIntensity = (habit, date) => {
    return habit.completedDates.includes(date) ? 1 : 0;
  };

  const getIntensityColor = (intensity) => {
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-800";
    return "bg-green-500";
  };

  const nextHabit = () => {
    if (habits.length === 0) return;

    if (currentHabitIndex === -1) {
      // From overview, go to first habit
      setCurrentHabitIndex(0);
    } else if (currentHabitIndex === habits.length - 1) {
      // From last habit, go back to overview
      setCurrentHabitIndex(-1);
    } else {
      // Go to next habit
      setCurrentHabitIndex(currentHabitIndex + 1);
    }
  };

  const prevHabit = () => {
    if (habits.length === 0) return;

    if (currentHabitIndex === -1) {
      // From overview, go to last habit
      setCurrentHabitIndex(habits.length - 1);
    } else if (currentHabitIndex === 0) {
      // From first habit, go back to overview
      setCurrentHabitIndex(-1);
    } else {
      // Go to previous habit
      setCurrentHabitIndex(currentHabitIndex - 1);
    }
  };

  const currentHabit =
    currentHabitIndex >= 0 ? habits[currentHabitIndex] : null;
  const currentHabitTag = customTags.find(
    (tag) => tag.id === currentHabit?.tag
  );

  // Calculate total habits completed in the past 30 days
  const totalCompletions = pastDays.reduce(
    (total, date) => total + getDailyHabitCount(date),
    0
  );

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

  const formVariants = {
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
            className="w-12 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full cursor-pointer"
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
                <RotateCcw className="h-5 w-5 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-wide">
                Habit Tracker
              </h2>
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
            {/* Add Habit Form */}
            <AnimatePresence>
              {showAddForm ? (
                <motion.div
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 rounded-xl"
                >
                  <motion.div variants={itemVariants}>
                    <Input
                      placeholder="What habit do you want to build?"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !showAddTag && addHabit()
                      }
                      autoFocus
                      className="border-0 bg-transparent md:text-2xl h-10 font-extrabold px-0 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </motion.div>

                  {/* Tag Selection */}
                  <motion.div variants={itemVariants} className="space-y-3">
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="border-2 border-gray-300 focus:border-primary/70 font-extrabold dark:border-gray-600 dark:focus:border-primary/80 dark:bg-gray-800 dark:text-gray-100 rounded-xl py-3">
                        <SelectValue placeholder="Choose a category (optional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-200 dark:bg-gray-800 dark:border-gray-700">
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
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-4 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700"
                      >
                        <Input
                          placeholder="Category name"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTag()}
                          className="border-2 border-gray-300 font-extrabold focus:border-primary/70 dark:border-gray-600 dark:focus:border-primary/80 dark:text-gray-100 rounded-xl bg-white dark:bg-gray-700 py-3"
                        />

                        <div className="space-y-3">
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
                                className={`w-10 h-10 rounded-full border-3 transition-all duration-200 relative overflow-hidden ${
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
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Button
                            onClick={addTag}
                            className="w-full rounded-xl font-extrabold py-3"
                            disabled={!newTagName.trim()}
                          >
                            Create Category
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <motion.div
                      className="flex-1"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        onClick={addHabit}
                        className="w-full rounded-xl font-extrabold py-4 text-lg shadow-lg"
                        disabled={!newHabitName.trim()}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Habit
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewHabitName("");
                          setSelectedTag("");
                          setShowAddTag(false);
                          setNewTagName("");
                          setShowNavigation(true);
                        }}
                        className="px-6 py-4 rounded-xl font-extrabold border-2 border-gray-300 hover:border-primary/70 dark:border-gray-600 dark:hover:border-primary/80 dark:text-gray-100"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    onClick={() => {
                      setShowAddForm(true);
                      setShowNavigation(false);
                    }}
                    variant="outline"
                    className="w-full border-2 border-gray-300 font-extrabold hover:border-primary/70 dark:border-gray-600 dark:hover:border-primary/80 dark:text-gray-100 rounded-xl py-4"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Habit
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Habit Navigation */}
            {showNavigation && habits.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-6">
                {/* Habit Tabs */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevHabit}
                      disabled={habits.length === 0}
                      className="p-2 rounded-lg"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>

                  <div className="flex-1 text-center">
                    {currentHabitIndex === -1 ? (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <h3 className="font-extrabold text-gray-900 dark:text-gray-100">
                            All Habits Overview
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                          {totalCompletions} total completions • {habits.length}{" "}
                          habits
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-extrabold text-gray-900 dark:text-gray-100 truncate px-2">
                          {currentHabit?.name}
                        </h3>
                        {currentHabitTag && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: currentHabitTag.color }}
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {currentHabitTag.name}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextHabit}
                      disabled={habits.length === 0}
                      className="p-2 rounded-lg"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>

                {/* Habit Dots Indicator */}
                <div className="flex justify-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setCurrentHabitIndex(-1)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      currentHabitIndex === -1
                        ? "bg-primary shadow-lg"
                        : "bg-primary/30"
                    }`}
                  />
                  {habits.map((_, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setCurrentHabitIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === currentHabitIndex
                          ? "bg-primary shadow-lg"
                          : "bg-primary/30"
                      }`}
                    />
                  ))}
                </div>

                {/* Current View Display */}
                <AnimatePresence mode="wait">
                  {currentHabitIndex === -1 ? (
                    // Overview of all habits
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col gap-4 p-4 justify-center items-center bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700 h-[210px]">
                        <div className="flex flex-row-reverse items-center w-full relative">
                          <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider absolute left-1/2 transform -translate-x-1/2">
                            Past 30 days
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-extrabold h-5">
                            {Math.round(
                              (totalCompletions / (habits.length * 30)) * 100
                            )}
                            %
                          </span>
                        </div>

                        <div className="grid grid-cols-6 w-fit gap-2">
                          {pastDays.map((date) => {
                            const count = getDailyHabitCount(date);
                            return (
                              <motion.div
                                key={date}
                                whileHover={{ scale: 1.3 }}
                                className={`w-4 h-4 rounded-md transition-all duration-200 cursor-pointer ${
                                  count === 0
                                    ? "bg-primary/10"
                                    : count === 1
                                    ? "bg-primary/30"
                                    : count === 2
                                    ? "bg-primary/50"
                                    : count === 3
                                    ? "bg-primary/70"
                                    : count === 4
                                    ? "bg-primary/85"
                                    : "bg-primary"
                                }`}
                                title={`${new Date(
                                  date
                                ).toLocaleDateString()} - ${count} habit${
                                  count !== 1 ? "s" : ""
                                } completed`}
                              />
                            );
                          })}
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {totalCompletions} total habit completions this month
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    // Individual habit view
                    currentHabit && (
                      <motion.div
                        key={currentHabit.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {/* GitHub-style grid */}
                        <div className="flex flex-col gap-4 p-4 justify-center items-center bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700 h-[210px]">
                          <div className="flex flex-row-reverse items-center w-full relative">
                            <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider absolute left-1/2 transform -translate-x-1/2">
                              Past 30 days
                            </span>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="h-5"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHabit(currentHabit.id)}
                                className="text-red-500 hover:text-red-700 text-xs hover:bg-transparent font-extrabold rounded-lg p-0 h-5"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </motion.div>
                          </div>

                          <div className="grid grid-cols-6 w-fit gap-2 -mt-1">
                            {pastDays.map((date) => (
                              <motion.button
                                key={date}
                                whileHover={{ scale: 1.3 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() =>
                                  toggleHabitDay(currentHabit.id, date)
                                }
                                className={`w-4 h-4 rounded-md transition-all duration-200 ${
                                  getIntensity(currentHabit, date) === 0
                                    ? "bg-primary/10 hover:bg-primary/20"
                                    : "bg-primary hover:bg-primary/90"
                                } hover:ring-2 hover:ring-primary/50`}
                                title={`${currentHabit.name} - ${new Date(
                                  date
                                ).toLocaleDateString()}`}
                              />
                            ))}
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {currentHabit.completedDates.length} days completed
                            this month
                          </div>
                        </div>
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {habits.length === 0 && !showAddForm && (
              <motion.div
                variants={itemVariants}
                className="text-center py-12 text-gray-500 dark:text-gray-400"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border-2 border-gray-200 dark:border-gray-700"
                >
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="font-extrabold text-lg">No habits yet</p>
                  <p className="text-sm mt-1">
                    Add one to start tracking your progress!
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Legend */}
            <motion.div
              variants={itemVariants}
              className="pt-4 border-t-2 border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span>Less</span>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-md bg-primary/10"></div>
                  <div className="w-4 h-4 rounded-md bg-primary/30"></div>
                  <div className="w-4 h-4 rounded-md bg-primary/50"></div>
                  <div className="w-4 h-4 rounded-md bg-primary/70"></div>
                  <div className="w-4 h-4 rounded-md bg-primary/85"></div>
                  <div className="w-4 h-4 rounded-md bg-primary"></div>
                </div>
                <span>More</span>
              </div>
              <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
                {currentHabitIndex === -1
                  ? "Daily habit completions (1-5+)"
                  : "Individual habit completion"}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
