"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DayNightCycle, AnimatedNumber } from "@/components/day-night-cycle";
import { AnimatedYear } from "@/components/animated-year";
import { WeeklyCalendar } from "@/components/weekly-calender";
import { TaskList } from "@/components/task-list";
import { Timer, Plus, BarChart3, Settings, CheckCircle, Target, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskModal } from "@/components/add-task-modal";
import { TaskOptionsModal } from "@/components/task-options-modal";
import { AddSubtaskModal } from "@/components/add-subtask-modal";
import { HabitTracker } from "@/components/habit-tracker";
import { TimerModal } from "@/components/timer-modal";
import { SettingsModal } from "@/components/settings-modal";
import { IntroScreen } from "@/components/intro-screen";
import { WebRTCShareModal } from "@/components/webrtc-share-modal";
import { YearlyGoalsTracker } from "@/components/yearly-goals-tracker";
import { QuarterlyGoalsTracker } from "@/components/quarterly-goals-tracker";
import { WeeklyGoalsTracker } from "@/components/weekly-goals-tracker";
import { dataStorage } from "@/lib/storage";
import "@/lib/debug"; // 导入调试工具

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState("default");
  const [dailyTasks, setDailyTasks] = useState({});
  const [backlogTasks, setBacklogTasks] = useState([]); // 全局 Backlog 任务
  const [customTags, setCustomTags] = useState([]);
  const [habits, setHabits] = useState([]);
  const [yearlyGoals, setYearlyGoals] = useState([]);
  const [quarterlyGoals, setQuarterlyGoals] = useState([]);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [showTimer, setShowTimer] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [showYearlyGoals, setShowYearlyGoals] = useState(false);
  const [showQuarterlyGoals, setShowQuarterlyGoals] = useState(false);
  const [showWeeklyGoals, setShowWeeklyGoals] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState(null);
  const [showWebRTCShare, setShowWebRTCShare] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false); // 移动端更多菜单
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 防止初始化时触发备份
  
  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");

  // 通用确认对话框
  const showConfirm = (title, message, onConfirm) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // 确保存储系统已初始化，并等待数据恢复完成
        const restoredData = await dataStorage.initializeStorage();
        
        console.log('📥 Data restoration result:', restoredData);
        
        // 加载所有数据（包括恢复的数据）
        const loadDataItem = (key, setter, processor = null) => {
          let data = null;
          
          // 优先使用恢复的数据
          if (restoredData && restoredData[key]) {
            data = restoredData[key];
            console.log(`📦 Using restored data for ${key}`);
          } else {
            // 否则从 localStorage 读取
            data = dataStorage.getLocalData(key);
          }
          
          if (data !== null && data !== undefined) {
            if (processor) {
              data = processor(data);
            }
            setter(data);
          }
        };
        
        // 加载各种数据
        loadDataItem("darkMode", setDarkMode);
        loadDataItem("theme", setTheme);
        
        loadDataItem("dailyTasks", setDailyTasks, (savedDailyTasks) => {
          // Convert date strings back to Date objects and ensure all fields exist
          const converted = {};
          Object.keys(savedDailyTasks).forEach((dateKey) => {
            converted[dateKey] = savedDailyTasks[dateKey].map((task) => {
              // Ensure subtasks are properly structured
              const processedSubtasks = (task.subtasks || []).map((subtask) => ({
                ...subtask,
                createdAt: new Date(subtask.createdAt || task.createdAt),
                focusTime: subtask.focusTime || 0,
                timeSpent: subtask.timeSpent || 0,
                completed: !!subtask.completed,
                parentTaskId: task.id,
                subtasks: [], // Subtasks don't have their own subtasks
              }));

              return {
                ...task,
                createdAt: new Date(task.createdAt),
                focusTime: task.focusTime || 0,
                timeSpent: task.timeSpent || 0,
                completed: !!task.completed,
                subtasks: processedSubtasks,
                subtasksExpanded: task.subtasksExpanded || false,
              };
            });
          });
          return converted;
        });
        
        loadDataItem("customTags", setCustomTags);
        loadDataItem("habits", setHabits);
        
        loadDataItem("backlogTasks", setBacklogTasks, (savedBacklog) => {
          // Convert date strings back to Date objects
          return savedBacklog.map((task) => {
            const processedSubtasks = (task.subtasks || []).map((subtask) => ({
              ...subtask,
              createdAt: new Date(subtask.createdAt || task.createdAt),
              focusTime: subtask.focusTime || 0,
              timeSpent: subtask.timeSpent || 0,
              completed: !!subtask.completed,
              parentTaskId: task.id,
              subtasks: [],
            }));
            
            return {
              ...task,
              createdAt: new Date(task.createdAt),
              focusTime: task.focusTime || 0,
              timeSpent: task.timeSpent || 0,
              completed: !!task.completed,
              subtasks: processedSubtasks,
              subtasksExpanded: task.subtasksExpanded || false,
            };
          });
        });
        
        loadDataItem("yearlyGoals", setYearlyGoals, (savedGoals) => {
          // Convert date strings back to Date objects
          return savedGoals.map((goal) => ({
            ...goal,
            createdAt: new Date(goal.createdAt),
            progress: goal.progress || 0,
            completed: !!goal.completed,
            autoCalculated: goal.autoCalculated || false,
          }));
        });
        
        loadDataItem("quarterlyGoals", setQuarterlyGoals, (savedGoals) => {
          // Convert date strings back to Date objects
          return savedGoals.map((goal) => ({
            ...goal,
            createdAt: new Date(goal.createdAt),
            progress: goal.progress || 0,
            completed: !!goal.completed,
            quarter: goal.quarter || 1,
            weight: goal.weight || undefined,
          }));
        });
        
        loadDataItem("weeklyGoals", setWeeklyGoals, (savedGoals) => {
          // Convert date strings back to Date objects
          return (savedGoals || []).map((goal) => ({
            ...goal,
            createdAt: new Date(goal.createdAt),
            progress: goal.progress || 0,
            completed: !!goal.completed,
            quarter: goal.quarter || 1,
            week: goal.week || 1,
            weight: goal.weight || undefined,
          }));
        });
        
        // 数据加载完成，允许备份
        setIsDataLoaded(true);
        console.log('✅ All data loaded successfully');
      } catch (error) {
        console.error('❌ Data loading failed:', error);
        // 即使失败也要允许备份，防止应用卡住
        setIsDataLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove(
      "theme-nature",
      "theme-neo-brutal",
      "theme-modern",
      "theme-pastel-dream",
      "theme-quantum-rose",
      "theme-twitter",
      "theme-amber-minimal"
    );

    // Add current theme class (except for default)
    if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }

    // Handle dark mode
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showIntroScreen) return;

      const isEscapePressed = event.key === "Escape";

      if (isEscapePressed) {
        setShowAddTask(false);
        setShowHabits(false);
        setShowYearlyGoals(false);
        setShowQuarterlyGoals(false);
        setShowWeeklyGoals(false);
        setShowTimer(false);
        setShowSettings(false);
        setShowTaskOptions(false);
        setShowAddSubtask(false);
        return;
      }

      if (
        showAddTask ||
        showHabits ||
        showYearlyGoals ||
        showQuarterlyGoals ||
        showWeeklyGoals ||
        showTimer ||
        showSettings ||
        showTaskOptions ||
        showAddSubtask ||
        showWebRTCShare
      ) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey; // Ctrl for Windows/Linux, Cmd for Mac

      if (isModifierPressed) {
        switch (event.key.toLowerCase()) {
          case "a": // Ctrl/Cmd + A for Add Task
            event.preventDefault();
            setShowAddTask(true);
            break;
          case "h": // Ctrl/Cmd + H for Habits
            event.preventDefault();
            setShowHabits(true);
            break;
          case "g": // Ctrl/Cmd + G for Yearly Goals
            event.preventDefault();
            setShowYearlyGoals(true);
            break;
          case "q": // Ctrl/Cmd + Q for Quarterly Goals
            event.preventDefault();
            setShowQuarterlyGoals(true);
            break;
          case "w": // Ctrl/Cmd + W for Weekly Goals
            event.preventDefault();
            setShowWeeklyGoals(true);
            break;
          case "c": // Ctrl/Cmd + C for Timer
            event.preventDefault();
            setShowTimer(true);
            break;
          case "x": // Ctrl/Cmd + X for Settings
            event.preventDefault();
            setShowSettings(true);
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showAddTask,
    showHabits,
    showYearlyGoals,
    showQuarterlyGoals,
    showWeeklyGoals,
    showTimer,
    showSettings,
    showTaskOptions,
    showAddSubtask,
    showWebRTCShare,
    showIntroScreen,
  ]);

  // Save to storage whenever data changes (only after initial load)
  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("darkMode", darkMode);
    }
  }, [darkMode, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("theme", theme);
    }
  }, [theme, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("dailyTasks", dailyTasks);
    }
  }, [dailyTasks, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("customTags", customTags);
    }
  }, [customTags, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("backlogTasks", backlogTasks);
    }
  }, [backlogTasks, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("habits", habits);
    }
  }, [habits, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("yearlyGoals", yearlyGoals);
    }
  }, [yearlyGoals, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("quarterlyGoals", quarterlyGoals);
    }
  }, [quarterlyGoals, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("weeklyGoals", weeklyGoals);
    }
  }, [weeklyGoals, isDataLoaded]);

  // Calculate quarterly goal progress based on associated weekly goals
  const calculateQuarterlyGoalProgress = (quarterlyGoalId) => {
    const associatedWeeklyGoals = weeklyGoals.filter(
      (wg) => wg.quarterlyGoalId === quarterlyGoalId
    );

    if (associatedWeeklyGoals.length === 0) {
      return null; // No associated weekly goals, return null to indicate manual mode
    }

    if (associatedWeeklyGoals.length === 1) {
      // Single weekly goal, use its progress directly
      return associatedWeeklyGoals[0].progress || 0;
    }

    // Multiple weekly goals, calculate weighted average
    const totalWeight = associatedWeeklyGoals.reduce(
      (sum, wg) => sum + (wg.weight || 0),
      0
    );

    if (totalWeight === 0) {
      // All weights are 0, fallback to average
      const avgProgress =
        associatedWeeklyGoals.reduce(
          (sum, wg) => sum + (wg.progress || 0),
          0
        ) / associatedWeeklyGoals.length;
      return avgProgress;
    }

    // Calculate weighted average with normalization
    const weightedSum = associatedWeeklyGoals.reduce((sum, wg) => {
      const normalizedWeight = totalWeight > 0 ? (wg.weight || 0) / totalWeight : 0;
      return sum + (wg.progress || 0) * normalizedWeight;
    }, 0);

    return Math.round(weightedSum * 100) / 100; // Round to 2 decimal places
  };

  // Update quarterly goals progress based on weekly goals
  const updateQuarterlyGoalsProgress = () => {
    setQuarterlyGoals((prevGoals) => {
      return prevGoals.map((goal) => {
        const calculatedProgress = calculateQuarterlyGoalProgress(goal.id);
        
        if (calculatedProgress === null) {
          // No associated weekly goals, keep manual mode
          return {
            ...goal,
            autoCalculated: false,
          };
        } else {
          // Has associated weekly goals, use auto-calculated progress
          return {
            ...goal,
            progress: calculatedProgress,
            completed: calculatedProgress >= 100,
            autoCalculated: true,
          };
        }
      });
    });
  };

  // Calculate yearly goal progress based on associated quarterly goals
  const calculateYearlyGoalProgress = (yearlyGoalId) => {
    const associatedQuarterlyGoals = quarterlyGoals.filter(
      (qg) => qg.yearlyGoalId === yearlyGoalId
    );

    if (associatedQuarterlyGoals.length === 0) {
      return null; // No associated quarterly goals, return null to indicate manual mode
    }

    if (associatedQuarterlyGoals.length === 1) {
      // Single quarterly goal, use its progress directly
      return associatedQuarterlyGoals[0].progress || 0;
    }

    // Multiple quarterly goals, calculate weighted average
    const totalWeight = associatedQuarterlyGoals.reduce(
      (sum, qg) => sum + (qg.weight || 0),
      0
    );

    if (totalWeight === 0) {
      // All weights are 0, fallback to average
      const avgProgress =
        associatedQuarterlyGoals.reduce(
          (sum, qg) => sum + (qg.progress || 0),
          0
        ) / associatedQuarterlyGoals.length;
      return avgProgress;
    }

    // Calculate weighted average with normalization
    const weightedSum = associatedQuarterlyGoals.reduce((sum, qg) => {
      const normalizedWeight = totalWeight > 0 ? (qg.weight || 0) / totalWeight : 0;
      return sum + (qg.progress || 0) * normalizedWeight;
    }, 0);

    return Math.round(weightedSum * 100) / 100; // Round to 2 decimal places
  };

  // Update yearly goals progress based on quarterly goals
  const updateYearlyGoalsProgress = () => {
    setYearlyGoals((prevGoals) => {
      return prevGoals.map((goal) => {
        const calculatedProgress = calculateYearlyGoalProgress(goal.id);
        
        if (calculatedProgress === null) {
          // No associated quarterly goals, keep manual mode
          return {
            ...goal,
            autoCalculated: false,
          };
        } else {
          // Has associated quarterly goals, use auto-calculated progress
          return {
            ...goal,
            progress: calculatedProgress,
            completed: calculatedProgress >= 100,
            autoCalculated: true,
          };
        }
      });
    });
  };

  // Quarterly goal management functions
  const addQuarterlyGoal = (title, description, year, quarter, yearlyGoalId, weight, tagId) => {
    const newGoal = {
      id: Date.now().toString(),
      title,
      description,
      year: parseInt(year),
      quarter: parseInt(quarter),
      completed: false,
      progress: 0,
      yearlyGoalId: yearlyGoalId && yearlyGoalId !== "none" ? yearlyGoalId : undefined,
      weight: yearlyGoalId && yearlyGoalId !== "none" ? Math.max(0, Math.min(100, weight || 0)) : undefined,
      tag: tagId || undefined,
      createdAt: new Date(),
    };
    setQuarterlyGoals((prevGoals) => [...prevGoals, newGoal]);
    
    // Update yearly goal progress if associated
    if (newGoal.yearlyGoalId) {
      setTimeout(() => updateYearlyGoalsProgress(), 0);
    }
  };

  const updateQuarterlyGoal = (goalId, updates) => {
    const oldGoal = quarterlyGoals.find((g) => g.id === goalId);
    setQuarterlyGoals((prevGoals) =>
      prevGoals.map((goal) =>
        goal.id === goalId ? { ...goal, ...updates } : goal
      )
    );
    
    // Update yearly goal progress if association changed
    if (oldGoal?.yearlyGoalId || updates.yearlyGoalId) {
      setTimeout(() => updateYearlyGoalsProgress(), 0);
    }
  };

  const deleteQuarterlyGoal = (goalId) => {
    const goal = quarterlyGoals.find((g) => g.id === goalId);
    const hadYearlyGoal = goal?.yearlyGoalId;
    
    setQuarterlyGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== goalId));
    
    // Update yearly goal progress if it was associated
    if (hadYearlyGoal) {
      setTimeout(() => updateYearlyGoalsProgress(), 0);
    }
  };

  // Weekly goal management functions
  const addWeeklyGoal = (goalData) => {
    const newGoal = {
      id: goalData.id || Date.now().toString(),
      title: goalData.title,
      description: goalData.description || "",
      year: parseInt(goalData.year),
      quarter: parseInt(goalData.quarter),
      week: parseInt(goalData.week),
      completed: goalData.completed || false,
      progress: goalData.progress || 0,
      quarterlyGoalId: goalData.quarterlyGoalId && goalData.quarterlyGoalId !== "none" ? goalData.quarterlyGoalId : undefined,
      weight: goalData.quarterlyGoalId && goalData.quarterlyGoalId !== "none" ? Math.max(0, Math.min(100, goalData.weight || 0)) : undefined,
      tag: goalData.tag || undefined,
      createdAt: goalData.createdAt || new Date(),
    };
    setWeeklyGoals((prevGoals) => {
      const updatedGoals = [...prevGoals, newGoal];
      
      // Update quarterly goal progress if associated
      if (newGoal.quarterlyGoalId) {
        setTimeout(() => {
          setQuarterlyGoals((prevQuarterlyGoals) => {
            return prevQuarterlyGoals.map((goal) => {
              if (goal.id !== newGoal.quarterlyGoalId) return goal;
              
              const associatedWeeklyGoals = updatedGoals.filter(
                (wg) => wg.quarterlyGoalId === goal.id
              );
              
              if (associatedWeeklyGoals.length === 0) {
                return { ...goal, autoCalculated: false };
              }
              
              // Calculate progress
              let calculatedProgress = 0;
              
              if (associatedWeeklyGoals.length === 1) {
                calculatedProgress = associatedWeeklyGoals[0].progress || 0;
              } else {
                const totalWeight = associatedWeeklyGoals.reduce(
                  (sum, wg) => sum + (wg.weight || 0),
                  0
                );
                
                if (totalWeight === 0) {
                  calculatedProgress =
                    associatedWeeklyGoals.reduce(
                      (sum, wg) => sum + (wg.progress || 0),
                      0
                    ) / associatedWeeklyGoals.length;
                } else {
                  const weightedSum = associatedWeeklyGoals.reduce((sum, wg) => {
                    const normalizedWeight = (wg.weight || 0) / totalWeight;
                    return sum + (wg.progress || 0) * normalizedWeight;
                  }, 0);
                  calculatedProgress = Math.round(weightedSum * 100) / 100;
                }
              }
              
              return {
                ...goal,
                progress: calculatedProgress,
                completed: calculatedProgress >= 100,
                autoCalculated: true,
              };
            });
          });
          
          updateYearlyGoalsProgress();
        }, 0);
      }
      
      return updatedGoals;
    });
  };

  const updateWeeklyGoal = (goalId, updates) => {
    setWeeklyGoals((prevGoals) => {
      const updatedGoals = prevGoals.map((goal) =>
        goal.id === goalId ? { ...goal, ...updates } : goal
      );
      
      // Immediately recalculate quarterly goals with the updated weekly goals
      const oldGoal = prevGoals.find((g) => g.id === goalId);
      const affectedQuarterlyGoalIds = new Set();
      
      if (oldGoal?.quarterlyGoalId) {
        affectedQuarterlyGoalIds.add(oldGoal.quarterlyGoalId);
      }
      if (updates.quarterlyGoalId) {
        affectedQuarterlyGoalIds.add(updates.quarterlyGoalId);
      }
      
      // Update quarterly goals immediately with the new weekly goals data
      if (affectedQuarterlyGoalIds.size > 0 || updates.progress !== undefined || updates.completed !== undefined) {
        setTimeout(() => {
          setQuarterlyGoals((prevQuarterlyGoals) => {
            return prevQuarterlyGoals.map((goal) => {
              const associatedWeeklyGoals = updatedGoals.filter(
                (wg) => wg.quarterlyGoalId === goal.id
              );
              
              if (associatedWeeklyGoals.length === 0) {
                return { ...goal, autoCalculated: false };
              }
              
              // Calculate progress with the updated weekly goals
              let calculatedProgress = 0;
              
              if (associatedWeeklyGoals.length === 1) {
                calculatedProgress = associatedWeeklyGoals[0].progress || 0;
              } else {
                const totalWeight = associatedWeeklyGoals.reduce(
                  (sum, wg) => sum + (wg.weight || 0),
                  0
                );
                
                if (totalWeight === 0) {
                  calculatedProgress =
                    associatedWeeklyGoals.reduce(
                      (sum, wg) => sum + (wg.progress || 0),
                      0
                    ) / associatedWeeklyGoals.length;
                } else {
                  const weightedSum = associatedWeeklyGoals.reduce((sum, wg) => {
                    const normalizedWeight = (wg.weight || 0) / totalWeight;
                    return sum + (wg.progress || 0) * normalizedWeight;
                  }, 0);
                  calculatedProgress = Math.round(weightedSum * 100) / 100;
                }
              }
              
              return {
                ...goal,
                progress: calculatedProgress,
                completed: calculatedProgress >= 100,
                autoCalculated: true,
              };
            });
          });
          
          // Then update yearly goals
          updateYearlyGoalsProgress();
        }, 0);
      }
      
      return updatedGoals;
    });
  };

  const deleteWeeklyGoal = (goalId) => {
    setWeeklyGoals((prevGoals) => {
      const goal = prevGoals.find((g) => g.id === goalId);
      const hadQuarterlyGoal = goal?.quarterlyGoalId;
      const updatedGoals = prevGoals.filter((goal) => goal.id !== goalId);
      
      // Update quarterly goal progress if it was associated
      if (hadQuarterlyGoal) {
        setTimeout(() => {
          setQuarterlyGoals((prevQuarterlyGoals) => {
            return prevQuarterlyGoals.map((qGoal) => {
              if (qGoal.id !== hadQuarterlyGoal) return qGoal;
              
              const associatedWeeklyGoals = updatedGoals.filter(
                (wg) => wg.quarterlyGoalId === qGoal.id
              );
              
              if (associatedWeeklyGoals.length === 0) {
                return { ...qGoal, autoCalculated: false };
              }
              
              // Calculate progress
              let calculatedProgress = 0;
              
              if (associatedWeeklyGoals.length === 1) {
                calculatedProgress = associatedWeeklyGoals[0].progress || 0;
              } else {
                const totalWeight = associatedWeeklyGoals.reduce(
                  (sum, wg) => sum + (wg.weight || 0),
                  0
                );
                
                if (totalWeight === 0) {
                  calculatedProgress =
                    associatedWeeklyGoals.reduce(
                      (sum, wg) => sum + (wg.progress || 0),
                      0
                    ) / associatedWeeklyGoals.length;
                } else {
                  const weightedSum = associatedWeeklyGoals.reduce((sum, wg) => {
                    const normalizedWeight = (wg.weight || 0) / totalWeight;
                    return sum + (wg.progress || 0) * normalizedWeight;
                  }, 0);
                  calculatedProgress = Math.round(weightedSum * 100) / 100;
                }
              }
              
              return {
                ...qGoal,
                progress: calculatedProgress,
                completed: calculatedProgress >= 100,
                autoCalculated: true,
              };
            });
          });
          
          updateYearlyGoalsProgress();
        }, 0);
      }
      
      return updatedGoals;
    });
  };

  // Update quarterly goals progress when weekly goals change
  useEffect(() => {
    if (isDataLoaded && weeklyGoals.length > 0) {
      updateQuarterlyGoalsProgress();
    }
  }, [weeklyGoals, isDataLoaded]);

  // Update yearly goals progress when quarterly goals change
  useEffect(() => {
    if (isDataLoaded && quarterlyGoals.length > 0) {
      updateYearlyGoalsProgress();
    }
  }, [quarterlyGoals, isDataLoaded]);

  const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getCurrentDayTasks = () => {
    const dateString = getDateString(selectedDate);
    return dailyTasks[dateString] || [];
  };

  const generateDailyHabitTasks = (habits, selectedDate) => {
    const dateString = getDateString(selectedDate);
    return habits.map((habit) => ({
      id: `habit-${habit.id}-${dateString}`,
      title: habit.name,
      completed: habit.completedDates.includes(dateString),
      timeSpent: 0,
      focusTime: 0,
      createdAt: selectedDate,
      isHabit: true,
      habitId: habit.id,
      tag: habit.tag,
      priority: habit.priority, // 添加优先级字段
      yearlyGoalId: habit.yearlyGoalId, // 添加年度目标关联字段
      subtasks: [], // Habits don't have subtasks
    }));
  };

  const importDataFromWebRTC = (data) => {
    try {
      let importStats = {
        newTasks: 0,
        newSubtasks: 0,
        newTags: 0,
        newHabits: 0,
        updatedTasks: 0,
        updatedSettings: [],
      };

      // Create tag mapping for imported data
      const tagMapping = new Map(); // oldTagId -> newTagId

      // 1. Merge Custom Tags FIRST (we need the mapping for tasks)
      if (data.customTags) {
        setCustomTags((prevTags) => {
          const newTags = [];

          data.customTags.forEach((incomingTag) => {
            const existingTag = prevTags.find(
              (existing) =>
                existing.name.toLowerCase() === incomingTag.name.toLowerCase()
            );

            if (existingTag) {
              // Tag exists, map old ID to existing ID
              tagMapping.set(incomingTag.id, existingTag.id);
            } else {
              // New tag - generate new ID to avoid conflicts
              const newTagId = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)}`;
              tagMapping.set(incomingTag.id, newTagId);

              newTags.push({
                ...incomingTag,
                id: newTagId,
              });
              importStats.newTags++;
            }
          });

          return [...prevTags, ...newTags];
        });
      }

      // 2. Merge Daily Tasks (with proper tag mapping and completion sync)
      if (data.dailyTasks) {
        setDailyTasks((prevDailyTasks) => {
          const mergedDailyTasks = { ...prevDailyTasks };

          Object.keys(data.dailyTasks).forEach((dateKey) => {
            const incomingTasks = data.dailyTasks[dateKey];
            const existingTasks = mergedDailyTasks[dateKey] || [];

            // Convert incoming tasks to proper format with mapped tag IDs
            const processedIncomingTasks = incomingTasks.map((task) => {
              // Map the tag ID if it exists in our mapping
              const mappedTagId =
                task.tag && tagMapping.has(task.tag)
                  ? tagMapping.get(task.tag)
                  : task.tag;

              return {
                ...task,
                // We keep original IDs for matching, but will generate new ones for new tasks
                originalId: task.id,
                createdAt: new Date(task.createdAt),
                focusTime: task.focusTime || 0,
                timeSpent: task.timeSpent || 0,
                completed: !!task.completed,
                tag: mappedTagId, // Use mapped tag ID
                subtasks: (task.subtasks || []).map((subtask) => {
                  // Map subtask tag ID as well
                  const mappedSubtaskTagId =
                    subtask.tag && tagMapping.has(subtask.tag)
                      ? tagMapping.get(subtask.tag)
                      : subtask.tag;

                  return {
                    ...subtask,
                    // Keep original IDs for matching
                    originalId: subtask.id,
                    createdAt: new Date(subtask.createdAt || task.createdAt),
                    focusTime: subtask.focusTime || 0,
                    timeSpent: subtask.timeSpent || 0,
                    completed: !!subtask.completed,
                    parentTaskId: task.id,
                    tag: mappedSubtaskTagId, // Use mapped tag ID
                    subtasks: [],
                  };
                }),
                subtasksExpanded: task.subtasksExpanded || false,
              };
            });

            const newOrUpdatedTasksForDate = [...existingTasks];

            processedIncomingTasks.forEach((incomingTask) => {
              // Find existing task by title (more reliable than ID across different clients)
              const existingTaskIndex = newOrUpdatedTasksForDate.findIndex(
                (existing) =>
                  existing.title.toLowerCase().trim() ===
                    incomingTask.title.toLowerCase().trim() && !existing.isHabit
              );

              if (existingTaskIndex === -1) {
                // Completely new task - generate new ID to avoid conflicts
                const newTaskId = `${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 8)}-${Math.random()
                  .toString(36)
                  .substring(2, 4)}`;

                newOrUpdatedTasksForDate.push({
                  ...incomingTask,
                  id: newTaskId,
                  subtasks: (incomingTask.subtasks || []).map((subtask) => ({
                    ...subtask,
                    id: `${newTaskId}-subtask-${Date.now()}-${Math.random()
                      .toString(36)
                      .substring(2, 8)}`,
                    parentTaskId: newTaskId,
                  })),
                });

                importStats.newTasks++;
                importStats.newSubtasks += (incomingTask.subtasks || []).length;
              } else {
                // Existing task - sync completion status and subtasks
                const existingTask =
                  newOrUpdatedTasksForDate[existingTaskIndex];
                let taskWasUpdated = false;

                // 1. Sync parent task completion status
                const updatedCompletedStatus = incomingTask.completed;
                if (existingTask.completed !== updatedCompletedStatus) {
                  existingTask.completed = updatedCompletedStatus;
                  taskWasUpdated = true;
                }

                // 2. Sync subtasks
                const mergedSubtasks = [...(existingTask.subtasks || [])];

                (incomingTask.subtasks || []).forEach((incomingSubtask) => {
                  const existingSubtaskIndex = mergedSubtasks.findIndex(
                    (existing) =>
                      existing.title.toLowerCase().trim() ===
                      incomingSubtask.title.toLowerCase().trim()
                  );

                  if (existingSubtaskIndex !== -1) {
                    // Subtask exists: update its completion status
                    const existingSubtask =
                      mergedSubtasks[existingSubtaskIndex];
                    if (
                      existingSubtask.completed !== incomingSubtask.completed
                    ) {
                      existingSubtask.completed = incomingSubtask.completed;
                      taskWasUpdated = true;
                    }
                  } else {
                    // New subtask for an existing task: add it
                    const newSubtaskId = `${
                      existingTask.id
                    }-subtask-${Date.now()}-${Math.random()
                      .toString(36)
                      .substring(2, 8)}`;
                    mergedSubtasks.push({
                      ...incomingSubtask,
                      id: newSubtaskId,
                      parentTaskId: existingTask.id,
                    });
                    importStats.newSubtasks++;
                    taskWasUpdated = true;
                  }
                });

                // 3. Update the task in the array if anything changed
                if (taskWasUpdated) {
                  existingTask.subtasks = mergedSubtasks;
                  newOrUpdatedTasksForDate[existingTaskIndex] = existingTask;
                  importStats.updatedTasks++;
                }
              }
            });

            mergedDailyTasks[dateKey] = newOrUpdatedTasksForDate;
          });

          return mergedDailyTasks;
        });
      }

      // 3. Merge Habits (FIXED: with proper tag mapping for both new and existing habits)
      if (data.habits) {
        setHabits((prevHabits) => {
          const updatedHabits = [...prevHabits];

          data.habits.forEach((incomingHabit) => {
            const existingHabitIndex = updatedHabits.findIndex(
              (existing) =>
                existing.name.toLowerCase().trim() ===
                incomingHabit.name.toLowerCase().trim()
            );

            // Map the tag ID if it exists in our mapping
            const mappedTagId =
              incomingHabit.tag && tagMapping.has(incomingHabit.tag)
                ? tagMapping.get(incomingHabit.tag)
                : incomingHabit.tag;

            if (existingHabitIndex === -1) {
              // New Habit
              const newHabitId = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)}`;
              updatedHabits.push({
                ...incomingHabit,
                id: newHabitId,
                tag: mappedTagId, // Use mapped tag ID
                completedDates: incomingHabit.completedDates || [],
              });
              importStats.newHabits++;
            } else {
              // FIXED: Existing Habit - merge completion dates AND update tag
              const existingHabit = updatedHabits[existingHabitIndex];
              const mergedCompletedDates = [
                ...new Set([
                  ...(existingHabit.completedDates || []),
                  ...(incomingHabit.completedDates || []),
                ]),
              ];

              updatedHabits[existingHabitIndex] = {
                ...existingHabit,
                completedDates: mergedCompletedDates,
                tag: mappedTagId, // FIXED: Apply mapped tag ID to existing habits too
              };
            }
          });

          return updatedHabits;
        });
      }

      // 4. Optionally update settings (ask user first)
      const settingsToUpdate = [];
      if (typeof data.darkMode === "boolean" && data.darkMode !== darkMode) {
        settingsToUpdate.push("dark mode");
      }
      if (data.theme && data.theme !== theme) {
        settingsToUpdate.push("theme");
      }

      if (settingsToUpdate.length > 0) {
        showConfirm(
          "更新设置",
          `是否要更新你的 ${settingsToUpdate.join(" 和 ")} 设置以匹配导入的数据？`,
          () => {
            if (typeof data.darkMode === "boolean") {
              setDarkMode(data.darkMode);
              importStats.updatedSettings.push("dark mode");
            }
            if (data.theme) {
              setTheme(data.theme);
              importStats.updatedSettings.push("theme");
            }
          }
        );
      }

      // Show detailed import summary
      const summaryParts = [];
      if (importStats.newTasks > 0)
        summaryParts.push(`${importStats.newTasks} new task(s)`);
      if (importStats.updatedTasks > 0)
        summaryParts.push(`${importStats.updatedTasks} updated task(s)`);
      if (importStats.newSubtasks > 0)
        summaryParts.push(`${importStats.newSubtasks} new subtask(s)`);
      if (importStats.newTags > 0)
        summaryParts.push(`${importStats.newTags} new tag(s)`);
      if (importStats.newHabits > 0)
        summaryParts.push(`${importStats.newHabits} new habit(s)`);
      if (importStats.updatedSettings.length > 0)
        summaryParts.push(
          `updated ${importStats.updatedSettings.join(" and ")}`
        );

      const totalChanges =
        importStats.newTasks +
        importStats.updatedTasks +
        importStats.newSubtasks +
        importStats.newTags +
        importStats.newHabits;

      if (totalChanges === 0 && importStats.updatedSettings.length === 0) {
        toast.info("同步完成", {
          description: "没有发现新项目 - 所有数据已同步",
        });
      } else {
        const summaryMessage =
          summaryParts.length > 0
            ? `合并/更新: ${summaryParts.join(", ")}`
            : "同步完成!";
        toast.success("同步成功", {
          description: summaryMessage,
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("处理同步数据时出错", {
        description: "请重试",
      });
    }
  };

  // Helper function to find a task by ID (including subtasks)
  const findTaskById = (taskId, taskList = null) => {
    const tasksToSearch = taskList || getCurrentDayTasks();

    for (const task of tasksToSearch) {
      if (task.id === taskId) {
        return task;
      }
      // Search in subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          if (subtask.id === taskId) {
            return subtask;
          }
        }
      }
    }
    return null;
  };

  // Helper function to update a task (including subtasks)
  const updateTaskInList = (taskId, updates, taskList) => {
    return taskList.map((task) => {
      if (task.id === taskId) {
        return { ...task, ...updates };
      }
      // Update subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        const updatedSubtasks = task.subtasks.map((subtask) =>
          subtask.id === taskId ? { ...subtask, ...updates } : subtask
        );
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    });
  };

  // Helper function to remove a task (including subtasks)
  const removeTaskFromList = (taskId, taskList) => {
    return taskList
      .map((task) => {
        // Remove from subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          const filteredSubtasks = task.subtasks.filter(
            (subtask) => subtask.id !== taskId
          );
          return { ...task, subtasks: filteredSubtasks };
        }
        return task;
      })
      .filter((task) => task.id !== taskId); // Remove main task
  };

  const toggleTask = (id) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const dailyHabitTasks = generateDailyHabitTasks(habits, selectedDate);
    const allTasks = [...currentTasks, ...dailyHabitTasks];
    const task = findTaskById(id, allTasks);

    if (task?.isHabit && task.habitId) {
      // Handle habit completion
      const updatedHabits = habits.map((habit) => {
        if (habit.id === task.habitId) {
          const completedDates = task.completed
            ? habit.completedDates.filter((d) => d !== dateString)
            : [...habit.completedDates, dateString];
          return { ...habit, completedDates };
        }
        return habit;
      });
      setHabits(updatedHabits);
    } else {
      // Handle regular task/subtask completion
      const updatedTasks = updateTaskInList(
        id,
        { completed: !task.completed },
        currentTasks
      );
      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
    }
  };

  const addTask = (title, tagId, taskDate = selectedDate, priority, weeklyGoalId) => {
    const dateString = getDateString(taskDate);
    const currentTasks = dailyTasks[dateString] || [];
    const newTask = {
      id: Date.now().toString(),
      title,
      completed: false,
      timeSpent: 0,
      focusTime: 0,
      createdAt: taskDate,
      tag: tagId,
      priority: priority || undefined, // 添加优先级字段
      weeklyGoalId: weeklyGoalId || undefined, // 添加周目标关联字段
      subtasks: [], // Initialize empty subtasks array
      subtasksExpanded: false, // Initialize expansion state
    };
    setDailyTasks({ ...dailyTasks, [dateString]: [...currentTasks, newTask] });
  };

  // Backlog 任务管理函数
  const addBacklogTask = (title, tagId, priority, weeklyGoalId) => {
    const newTask = {
      id: Date.now().toString(),
      title,
      completed: false,
      timeSpent: 0,
      focusTime: 0,
      createdAt: new Date(),
      tag: tagId,
      priority: priority || undefined,
      weeklyGoalId: weeklyGoalId || undefined,
      subtasks: [],
      subtasksExpanded: false,
    };
    setBacklogTasks([...backlogTasks, newTask]);
  };

  const deleteBacklogTask = (taskId) => {
    setBacklogTasks(backlogTasks.filter((task) => task.id !== taskId));
  };

  const updateBacklogTask = (taskId, updates) => {
    setBacklogTasks(
      backlogTasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    );
  };

  const toggleBacklogTask = (taskId) => {
    setBacklogTasks(
      backlogTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // 将 Backlog 任务移动到某一天
  const moveBacklogTaskToDay = (taskId, targetDate) => {
    const task = backlogTasks.find((t) => t.id === taskId);
    if (!task) return;

    const dateString = getDateString(targetDate);
    const currentTasks = dailyTasks[dateString] || [];
    
    // 添加到目标日期
    const movedTask = {
      ...task,
      createdAt: targetDate,
    };
    setDailyTasks({ ...dailyTasks, [dateString]: [...currentTasks, movedTask] });
    
    // 从 backlog 中删除
    setBacklogTasks(backlogTasks.filter((t) => t.id !== taskId));
  };

  // 将某一天的任务移动到 Backlog
  const moveDayTaskToBacklog = (taskId) => {
    const task = findTaskById(taskId);
    if (!task || task.isHabit) return; // 习惯任务不能移到 backlog

    const dateString = getDateString(selectedDate);
    const currentTasks = dailyTasks[dateString] || [];
    
    // 添加到 backlog
    const movedTask = {
      ...task,
      createdAt: new Date(),
    };
    setBacklogTasks([...backlogTasks, movedTask]);
    
    // 从当天删除
    setDailyTasks({
      ...dailyTasks,
      [dateString]: currentTasks.filter((t) => t.id !== taskId),
    });
  };

  const addSubtask = (parentTaskId, title, tagId) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();

    const newSubtask = {
      id: `${parentTaskId}-subtask-${Date.now()}`,
      title,
      completed: false,
      timeSpent: 0,
      focusTime: 0,
      createdAt: selectedDate,
      tag: tagId,
      parentTaskId,
      subtasks: [], // Subtasks can't have their own subtasks
    };

    const updatedTasks = currentTasks.map((task) => {
      if (task.id === parentTaskId) {
        const currentSubtasks = task.subtasks || [];
        return {
          ...task,
          subtasks: [...currentSubtasks, newSubtask],
          subtasksExpanded: true, // Auto-expand when adding subtask
        };
      }
      return task;
    });

    setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
  };

  const handleAddSubtask = (parentTaskId) => {
    const parentTask = findTaskById(parentTaskId);
    if (parentTask && !parentTask.isHabit) {
      // Ensure the parent task has subtasks array initialized
      const dateString = getDateString(selectedDate);
      const currentTasks = getCurrentDayTasks();

      // Update parent task to ensure subtasks array exists
      const updatedTasks = currentTasks.map((task) => {
        if (task.id === parentTaskId) {
          return {
            ...task,
            subtasks: task.subtasks || [], // Ensure subtasks array exists
            subtasksExpanded: true, // Pre-expand for adding
          };
        }
        return task;
      });

      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
      setParentTaskForSubtask(parentTask);
      setShowAddSubtask(true);
    }
  };

  const updateTask = (taskId, updates) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();

    // Check if it's a habit task
    if (taskId.startsWith("habit-")) {
      const habitId = taskId.split("-")[1];
      const habit = habits.find((h) => h.id === habitId);
      if (habit && updates.title) {
        // Update habit name
        const updatedHabits = habits.map((h) =>
          h.id === habitId ? { ...h, name: updates.title } : h
        );
        setHabits(updatedHabits);
      }
      if (habit && updates.tag !== undefined) {
        // Update habit tag
        const updatedHabits = habits.map((h) =>
          h.id === habitId ? { ...h, tag: updates.tag } : h
        );
        setHabits(updatedHabits);
      }
      if (habit && updates.priority !== undefined) {
        // Update habit priority
        const updatedHabits = habits.map((h) =>
          h.id === habitId ? { ...h, priority: updates.priority } : h
        );
        setHabits(updatedHabits);
      }
      if (habit && updates.yearlyGoalId !== undefined) {
        // Update habit yearly goal
        const updatedHabits = habits.map((h) =>
          h.id === habitId ? { ...h, yearlyGoalId: updates.yearlyGoalId } : h
        );
        setHabits(updatedHabits);
      }
    } else {
      // Regular task/subtask update
      const updatedTasks = updateTaskInList(taskId, updates, currentTasks);
      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
    }
  };

  const deleteTask = (id) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();

    // Check if it's a habit task
    if (id.startsWith("habit-")) {
      const habitId = id.split("-")[1];
      const updatedHabits = habits.filter((habit) => habit.id !== habitId);
      setHabits(updatedHabits);
    } else {
      // Regular task/subtask deletion
      const updatedTasks = removeTaskFromList(id, currentTasks);
      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
    }
  };

  const updateTaskTime = (id, timeToAdd) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const updatedTasks = updateTaskInList(
      id,
      {
        timeSpent: (findTaskById(id, currentTasks)?.timeSpent || 0) + timeToAdd,
      },
      currentTasks
    );
    setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
  };

  const transferTaskToCurrentDay = (taskId, originalDate, targetDate) => {
    const originalDateString = getDateString(originalDate);
    const targetDateString = getDateString(targetDate);

    if (originalDateString === targetDateString) {
      // Already on the target day, no transfer needed
      return;
    }

    setDailyTasks((prevDailyTasks) => {
      const newDailyTasks = { ...prevDailyTasks };

      // Find the task in its original day
      const originalDayTasks = newDailyTasks[originalDateString] || [];
      const taskToTransfer = findTaskById(taskId, originalDayTasks);

      if (!taskToTransfer) {
        console.warn(
          "Task not found for transfer:",
          taskId,
          originalDateString
        );
        return prevDailyTasks; // Task not found, return original state
      }

      // Remove task from original day
      const updatedOriginalTasks = removeTaskFromList(taskId, originalDayTasks);
      newDailyTasks[originalDateString] = updatedOriginalTasks;

      // Update the task's properties for the new day
      const updatedTask = {
        ...taskToTransfer,
        createdAt: targetDate, // Set creation date to the actual current date
        completed: false, // Reset completion status
        timeSpent: 0, // Reset time spent
        focusTime: 0, // Reset focus time
        // Reset subtasks completion and time
        subtasks: (taskToTransfer.subtasks || []).map((subtask) => ({
          ...subtask,
          completed: false,
          timeSpent: 0,
          focusTime: 0,
          createdAt: targetDate,
        })),
      };

      // Add to the current day's tasks
      newDailyTasks[targetDateString] = [
        ...(newDailyTasks[targetDateString] || []),
        updatedTask,
      ];

      // Clean up empty original day entry if no tasks left
      if (newDailyTasks[originalDateString]?.length === 0) {
        delete newDailyTasks[originalDateString];
      }

      return newDailyTasks;
    });
  };

  const updateTaskFocusTime = (id, focusTimeToAdd) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const updatedTasks = updateTaskInList(
      id,
      {
        focusTime:
          (findTaskById(id, currentTasks)?.focusTime || 0) + focusTimeToAdd,
      },
      currentTasks
    );
    setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
  };

  const addCustomTag = (name, color) => {
    const newTag = {
      id: Date.now().toString(),
      name,
      color,
    };
    setCustomTags([...customTags, newTag]);
    return newTag.id;
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskOptions(true);
  };

  const exportData = () => {
    const data = {
      dailyTasks,
      customTags,
      habits,
      yearlyGoals,
      quarterlyGoals,
      weeklyGoals,
      darkMode,
      theme,
      exportDate: new Date().toISOString(),
      version: "3.3", // Update version for weekly goals support
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todo-app-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowSettings(false); // Close settings after export
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result);
            if (data.dailyTasks) {
              // Convert date strings back to Date objects and ensure backward compatibility
              const converted = {};
              Object.keys(data.dailyTasks).forEach((dateKey) => {
                converted[dateKey] = data.dailyTasks[dateKey].map((task) => ({
                  ...task,
                  createdAt: new Date(task.createdAt),
                  focusTime: task.focusTime || 0, // Ensure focusTime exists
                  subtasks: task.subtasks || [], // Ensure subtasks array exists
                  subtasksExpanded: task.subtasksExpanded || false, // Ensure expansion state exists
                  // For subtasks, ensure they have the required fields
                  ...(task.subtasks && {
                    subtasks: task.subtasks.map((subtask) => ({
                      ...subtask,
                      createdAt: new Date(subtask.createdAt || task.createdAt),
                      focusTime: subtask.focusTime || 0,
                      timeSpent: subtask.timeSpent || 0,
                      subtasks: [], // Subtasks don't have their own subtasks
                    })),
                  }),
                }));
              });
              setDailyTasks(converted);
            }
            if (data.customTags) setCustomTags(data.customTags);
            if (data.habits) setHabits(data.habits);
            if (data.yearlyGoals) {
              // Convert date strings back to Date objects
              const convertedGoals = data.yearlyGoals.map((goal) => ({
                ...goal,
                createdAt: new Date(goal.createdAt),
                progress: goal.progress || 0,
                completed: !!goal.completed,
                autoCalculated: goal.autoCalculated || false,
              }));
              setYearlyGoals(convertedGoals);
            }
            if (data.quarterlyGoals) {
              // Convert date strings back to Date objects
              const convertedQuarterlyGoals = data.quarterlyGoals.map((goal) => ({
                ...goal,
                createdAt: new Date(goal.createdAt),
                progress: goal.progress || 0,
                completed: !!goal.completed,
                quarter: goal.quarter || 1,
                weight: goal.weight || undefined,
              }));
              setQuarterlyGoals(convertedQuarterlyGoals);
            }
            if (data.weeklyGoals) {
              // Convert date strings back to Date objects
              const convertedWeeklyGoals = data.weeklyGoals.map((goal) => ({
                ...goal,
                createdAt: new Date(goal.createdAt),
                progress: goal.progress || 0,
                completed: !!goal.completed,
                quarter: goal.quarter || 1,
                week: goal.week || 1,
                weight: goal.weight || undefined,
              }));
              setWeeklyGoals(convertedWeeklyGoals);
            }
            if (typeof data.darkMode === "boolean") setDarkMode(data.darkMode);
            if (data.theme) setTheme(data.theme);
            toast.success("数据导入成功");
            setShowSettings(false); // Close settings after import
          } catch (error) {
            toast.error("导入数据时出错", {
              description: "请检查文件格式",
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Create flattened task list for components that need all tasks
  const createFlatTaskList = (tasks) => {
    const flatList = [];
    tasks.forEach((task) => {
      flatList.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        flatList.push(...task.subtasks);
      }
    });
    return flatList;
  };

  const dailyHabitTasks = generateDailyHabitTasks(habits, selectedDate);
  const regularTasks = getCurrentDayTasks();
  const allTasks = [...regularTasks, ...dailyHabitTasks];
  const flatTaskList = createFlatTaskList(allTasks); // For timer and other components

  return (
    <>
      <AnimatePresence>
        {showIntroScreen && (
          <IntroScreen onAnimationComplete={() => setShowIntroScreen(false)} />
        )}
      </AnimatePresence>

      {!showIntroScreen && (
        <div className="min-h-screen transition-colors duration-300 bg-background">
          {/* Mobile/Tablet Layout (up to lg) */}
          <div className="lg:hidden max-w-lg mx-auto min-h-screen px-4 relative overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col h-screen relative"
            >
              <button
                onClick={() => setShowSettings(true)}
                className="absolute left-1/2 -translate-x-1/2 z-10 bg-primary text-background rounded-b-lg py-2 px-2 pt-1"
              >
                <Settings className="h-3 w-3" />
              </button>

              {/* Header Section */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedDate(new Date())}
                className="p-4 px-0 border-b border-dashed"
              >
                <div className="flex items-center justify-between">
                  <DayNightCycle selectedDate={selectedDate} />
                  <div className="flex items-center gap-2">
                    <div className="text-right flex flex-col">
                      <div className="text-xl font-extrabold flex items-center gap-2">
                        <AnimatedNumber
                          value={selectedDate.getDate()}
                          fontSize={20}
                        />
                        {selectedDate.toLocaleDateString("en-US", {
                          month: "long",
                        })}
                      </div>
                      <div className="text-xl opacity-90 -mt-1 flex justify-end">
                        <AnimatedYear
                          year={selectedDate.getFullYear()}
                          fontSize={30}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="py-3 border-b border-dashed">
                <WeeklyCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
              </div>

              <div className="flex-1 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full w-full overflow-auto hide-scroll">
                  <div className="px-0 mt-[4px]">
                    <TaskList
                      tasks={allTasks}
                      customTags={customTags}
                      onToggleTask={toggleTask}
                      onDeleteTask={deleteTask}
                      onTaskClick={handleTaskClick}
                      onAddSubtask={handleAddSubtask}
                      weeklyGoals={weeklyGoals}
                      yearlyGoals={yearlyGoals}
                      noPaddingBottom={true}
                    />
                    
                    {/* Backlog Section */}
                    <TaskList
                      tasks={backlogTasks}
                      customTags={customTags}
                      onToggleTask={toggleBacklogTask}
                      onDeleteTask={deleteBacklogTask}
                      onTaskClick={handleTaskClick}
                      onAddSubtask={handleAddSubtask}
                      weeklyGoals={weeklyGoals}
                      yearlyGoals={yearlyGoals}
                      isBacklog={true}
                      title="BACKLOG"
                      noPaddingTop={true}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-dashed absolute bottom-0 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur-sm w-full z-50">
                <div className="flex items-center justify-around">
                  <Button
                    onClick={() => setShowTimer(true)}
                    variant="ghost"
                    size="lg"
                    className="flex flex-col items-center justify-center px-2 gap-1 font-extrabold hover:bg-accent/50 group dark:text-white min-w-0"
                  >
                    <div className="group-hover:scale-110 transition-transform flex flex-col items-center gap-0.5">
                      <Timer className="h-5 w-5" />
                      <span className="text-xs">Timer</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setShowHabits(true)}
                    variant="ghost"
                    size="lg"
                    className="flex flex-col items-center justify-center px-2 gap-1 font-extrabold group hover:bg-accent/50 dark:text-white min-w-0"
                  >
                    <div className="group-hover:scale-110 transition-transform flex flex-col items-center gap-0.5">
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-xs">Habits</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setShowAddTask(true)}
                    size="lg"
                    className="mx-2 rounded-full w-14 h-14 bg-primary hover:bg-primary/90 group hover:scale-110 transition-transform [&_svg]:size-6 p-0 min-w-0"
                  >
                    <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </Button>

                  <Button
                    onClick={() => setShowWeeklyGoals(true)}
                    variant="ghost"
                    size="lg"
                    className="flex flex-col items-center justify-center px-2 gap-1 font-extrabold group hover:bg-accent/50 dark:text-white min-w-0"
                  >
                    <div className="group-hover:scale-110 transition-transform flex flex-col items-center gap-0.5">
                      <Calendar className="h-5 w-5" />
                      <span className="text-xs">Weekly</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setShowMobileMenu(true)}
                    variant="ghost"
                    size="lg"
                    className="flex flex-col items-center justify-center px-2 gap-1 font-extrabold group hover:bg-accent/50 dark:text-white min-w-0"
                  >
                    <div className="group-hover:scale-110 transition-transform flex flex-col items-center gap-0.5">
                      <Target className="h-5 w-5" />
                      <span className="text-xs">More</span>
                    </div>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Desktop Layout (lg and up) */}
          <div className="hidden lg:flex max-h-screen h-screen overflow-hidden">
            {/* Left Sidebar - Calendar & Navigation */}
            <div className="w-[360px] border-r border-dashed flex flex-col bg-background/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col h-full"
              >
                {/* Settings Button */}
                <div className="p-6 border-b border-dashed flex items-center justify-between">
                  <div className="flex items-center gap-2 text-2xl font-extrabold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    Prio Space
                  </div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="bg-primary text-background rounded-lg py-3 px-4 hover:bg-primary/90 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                {/* Date Header */}
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDate(new Date())}
                  className="p-4 border-b border-dashed px-6"
                >
                  <div className="flex items-center justify-between">
                    <DayNightCycle selectedDate={selectedDate} />
                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col">
                        <div className="text-xl font-extrabold flex items-center gap-2">
                          <AnimatedNumber
                            value={selectedDate.getDate()}
                            fontSize={20}
                          />
                          {selectedDate.toLocaleDateString("en-US", {
                            month: "long",
                          })}
                        </div>
                        <div className="text-xl opacity-90 -mt-1 flex justify-end">
                          <AnimatedYear
                            year={selectedDate.getFullYear()}
                            fontSize={30}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Calendar */}
                <div className="p-6 border-b border-dashed">
                  <WeeklyCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>

                {/* Desktop Action Buttons */}
                <div className="p-6 space-y-4 flex-1">
                  <Button
                    onClick={() => setShowAddTask(true)}
                    size="lg"
                    className="w-full h-12 bg-primary hover:bg-primary/90 group hover:scale-[1.02] transition-all duration-200 [&_svg]:size-5 rounded-2xl"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Add Task</span>
                  </Button>

                  <Button
                    onClick={() => setShowTimer(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Timer className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Timer</span>
                  </Button>

                  <Button
                    onClick={() => setShowHabits(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <BarChart3 className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Habits</span>
                  </Button>

                  <Button
                    onClick={() => setShowYearlyGoals(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Target className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Goals</span>
                  </Button>

                  <Button
                    onClick={() => setShowQuarterlyGoals(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <TrendingUp className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Quarterly</span>
                  </Button>

                  <Button
                    onClick={() => setShowWeeklyGoals(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Calendar className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Weekly</span>
                  </Button>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="p-6 pt-0 text-[10px] text-muted-foreground font-extrabold space-y-1 opacity-70">
                  <div>⌘/Ctrl + A → Add Task</div>
                  <div>⌘/Ctrl + C → Timer</div>
                  <div>⌘/Ctrl + H → Habits</div>
                  <div>⌘/Ctrl + G → Goals</div>
                  <div>⌘/Ctrl + Q → Quarterly</div>
                  <div>⌘/Ctrl + W → Weekly</div>
                  <div>⌘/Ctrl + X → Settings</div>
                  <div>Esc → Close Modal</div>
                </div>
              </motion.div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex-1 overflow-hidden relative"
              >
                {/* Task List */}
                <div className="absolute top-0 left-0 h-full w-full overflow-auto hide-scroll">
                  <div className="p-6 mt-[4px]">
                    <TaskList
                      tasks={allTasks}
                      customTags={customTags}
                      onToggleTask={toggleTask}
                      onDeleteTask={deleteTask}
                      onTaskClick={handleTaskClick}
                      onAddSubtask={handleAddSubtask}
                      weeklyGoals={weeklyGoals}
                      yearlyGoals={yearlyGoals}
                      noPaddingBottom={true}
                    />
                    
                    {/* Backlog Section */}
                    <TaskList
                      tasks={backlogTasks}
                      customTags={customTags}
                      onToggleTask={toggleBacklogTask}
                      onDeleteTask={deleteBacklogTask}
                      onTaskClick={handleTaskClick}
                      onAddSubtask={handleAddSubtask}
                      weeklyGoals={weeklyGoals}
                      yearlyGoals={yearlyGoals}
                      isBacklog={true}
                      title="BACKLOG"
                      noPaddingTop={true}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Modals - Same for both layouts */}
          <AnimatePresence>
            {showSettings && (
              <SettingsModal
                onClose={() => setShowSettings(false)}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                theme={theme}
                onThemeChange={setTheme}
                onExportData={exportData}
                onImportData={importData}
                onOpenWebRTCShare={() => setShowWebRTCShare(true)}
              />
            )}

            {showWebRTCShare && (
              <WebRTCShareModal
                onClose={() => setShowWebRTCShare(false)}
                dailyTasks={dailyTasks}
                customTags={customTags}
                habits={habits}
                darkMode={darkMode}
                theme={theme}
                onImportData={importDataFromWebRTC}
              />
            )}

            {showAddTask && (
              <AddTaskModal
                onClose={() => setShowAddTask(false)}
                onAddTask={addTask}
                onAddBacklogTask={addBacklogTask}
                customTags={customTags}
                onAddCustomTag={addCustomTag}
                selectedDate={selectedDate}
                weeklyGoals={weeklyGoals}
              />
            )}

            {showAddSubtask && parentTaskForSubtask && (
              <AddSubtaskModal
                onClose={() => {
                  setShowAddSubtask(false);
                  setParentTaskForSubtask(null);
                }}
                onAddSubtask={(title, tagId) => {
                  addSubtask(parentTaskForSubtask.id, title, tagId);
                }}
                customTags={customTags}
                onAddCustomTag={addCustomTag}
                parentTask={parentTaskForSubtask}
              />
            )}

            {showTaskOptions && selectedTask && (
              <TaskOptionsModal
                task={selectedTask}
                customTags={customTags}
                onClose={() => {
                  setShowTaskOptions(false);
                  setSelectedTask(null);
                }}
                onUpdateTask={selectedTask && backlogTasks.find(t => t.id === selectedTask.id) ? updateBacklogTask : updateTask}
                onDeleteTask={selectedTask && backlogTasks.find(t => t.id === selectedTask.id) ? deleteBacklogTask : deleteTask}
                onAddCustomTag={addCustomTag}
                onToggleTask={selectedTask && backlogTasks.find(t => t.id === selectedTask.id) ? toggleBacklogTask : toggleTask}
                selectedDate={selectedDate}
                onTransferTask={transferTaskToCurrentDay}
                currentActualDate={new Date()}
                onAddSubtask={handleAddSubtask}
                allTasks={allTasks}
                weeklyGoals={weeklyGoals}
                yearlyGoals={yearlyGoals}
                onMoveToBacklog={moveDayTaskToBacklog}
                onMoveToDay={moveBacklogTaskToDay}
                isBacklogTask={selectedTask && !!backlogTasks.find(t => t.id === selectedTask.id)}
              />
            )}

            {showHabits && (
              <HabitTracker
                habits={habits}
                customTags={customTags}
                yearlyGoals={yearlyGoals}
                onClose={() => setShowHabits(false)}
                onUpdateHabits={setHabits}
                onAddCustomTag={addCustomTag}
              />
            )}

            {showYearlyGoals && (
              <YearlyGoalsTracker
                yearlyGoals={yearlyGoals}
                quarterlyGoals={quarterlyGoals}
                customTags={customTags}
                onClose={() => setShowYearlyGoals(false)}
                onUpdateGoals={setYearlyGoals}
                onAddCustomTag={addCustomTag}
                onYearlyGoalUpdate={updateYearlyGoalsProgress}
                onOpenQuarterlyGoals={(yearlyGoalId) => {
                  setShowYearlyGoals(false);
                  setShowQuarterlyGoals(true);
                  // TODO: Filter quarterly goals by yearlyGoalId when viewing
                }}
              />
            )}

            {showQuarterlyGoals && (
              <QuarterlyGoalsTracker
                quarterlyGoals={quarterlyGoals}
                yearlyGoals={yearlyGoals}
                weeklyGoals={weeklyGoals}
                customTags={customTags}
                onClose={() => setShowQuarterlyGoals(false)}
                onUpdateGoals={setQuarterlyGoals}
                onAddCustomTag={addCustomTag}
                onYearlyGoalUpdate={updateYearlyGoalsProgress}
                onOpenWeeklyGoals={(quarterlyGoalId) => {
                  setShowQuarterlyGoals(false);
                  setShowWeeklyGoals(true);
                  // The WeeklyGoalsTracker will handle filtering based on the current context
                }}
              />
            )}

            {showWeeklyGoals && (
              <WeeklyGoalsTracker
                weeklyGoals={weeklyGoals}
                quarterlyGoals={quarterlyGoals}
                customTags={customTags}
                onClose={() => setShowWeeklyGoals(false)}
                onAddWeeklyGoal={addWeeklyGoal}
                onUpdateWeeklyGoal={updateWeeklyGoal}
                onDeleteWeeklyGoal={deleteWeeklyGoal}
                onAddCustomTag={addCustomTag}
                dailyTasks={dailyTasks}
              />
            )}

            {showTimer && (
              <TimerModal
                tasks={flatTaskList} // Use flattened list for timer
                onClose={() => setShowTimer(false)}
                onUpdateTaskTime={updateTaskTime}
                onUpdateTaskFocusTime={updateTaskFocusTime}
                onToggleTask={toggleTask}
              />
            )}

            {/* Mobile More Menu */}
            <AnimatePresence>
              {showMobileMenu && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-6 pb-8 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Drag Handle */}
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />
                    
                    <div className="space-y-2">
                      {/* Yearly Goals */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowYearlyGoals(true);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-extrabold text-lg text-gray-900 dark:text-gray-100">Yearly Goals</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">年度目标管理</div>
                        </div>
                      </motion.button>

                      {/* Quarterly Goals */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowQuarterlyGoals(true);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-extrabold text-lg text-gray-900 dark:text-gray-100">Quarterly Goals</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">季度目标管理</div>
                        </div>
                      </motion.button>

                      {/* Settings */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowSettings(true);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Settings className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-extrabold text-lg text-gray-900 dark:text-gray-100">Settings</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">应用设置</div>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </AnimatePresence>
        </div>
      )}

      {/* 确认对话框 */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-extrabold mb-1">
                      {confirmTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {confirmMessage}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setShowConfirmDialog(false)}
                    variant="outline"
                    className="flex-1 rounded-xl font-semibold h-11"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="flex-1 rounded-xl font-semibold h-11"
                  >
                    确定
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
