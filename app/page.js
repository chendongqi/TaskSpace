"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth, useSupabaseClient } from "@wonder-lab/auth-sdk";
import { DayNightCycle, AnimatedNumber } from "@/components/day-night-cycle";
import { AnimatedYear } from "@/components/animated-year";
import { WeeklyCalendar } from "@/components/weekly-calender";
import { TaskList } from "@/components/task-list";
import { Timer, Plus, BarChart3, Settings, CheckCircle, Target, TrendingUp, Calendar, AlertCircle, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskModal } from "@/components/add-task-modal";
import { TaskOptionsModal } from "@/components/task-options-modal";
import { AddSubtaskModal } from "@/components/add-subtask-modal";
import { HabitTracker } from "@/components/habit-tracker";
import { TimerModal } from "@/components/timer-modal";
import { SettingsModal } from "@/components/settings-modal";
import { IntroScreen } from "@/components/intro-screen";
import { AnonymousWarningDialog } from "@/components/anonymous-warning-dialog";
import { YearlyGoalsTracker } from "@/components/yearly-goals-tracker";
import { QuarterlyGoalsTracker } from "@/components/quarterly-goals-tracker";
import { WeeklyGoalsTracker } from "@/components/weekly-goals-tracker";
import { TechTopicTree } from "@/components/tech-topic-tree";
import { dataStorage } from "@/lib/storage";
import {
  tagRowToLocal,
  goalRowToLocal,
  applyArrayRows as applyArrayRowsLocal,
  applyHabitRows as applyHabitRowsLocal,
  applyHabitCompletionRows as applyHabitCompletionRowsLocal,
  applyTaskRows as applyTaskRowsLocal,
  applySettingsRow as applySettingsRowLocal,
} from "@/lib/supabase-sync";
import "@/lib/debug"; // 导入调试工具

export default function Home() {
  // 获取认证状态
  const { user, authenticated, logout, loading: authLoading } = useAuth();

  // 与认证共享的 Supabase client（必须通过此 hook 获取，不能自行 createClient()，
  // 否则会产生第二个 GoTrueClient 实例，导致 localStorage session token 冲突）
  const supabaseClient = useSupabaseClient();

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
  const [showTopicTree, setShowTopicTree] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false); // 移动端更多菜单
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 防止初始化时触发备份
  const [isSyncingData, setIsSyncingData] = useState(false); // 是否正在同步服务器数据
  
  // 匿名使用风险提醒对话框状态
  const [showAnonymousWarning, setShowAnonymousWarning] = useState(false);
  
  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");

  // 保存 dailyTasks/backlogTasks 的最新引用，供 pull 合并逻辑读取（避免闭包里拿到过期状态，
  // 又不想把 pull 逻辑写成嵌套 setState 的形式）
  const dailyTasksRef = useRef(dailyTasks);
  const backlogTasksRef = useRef(backlogTasks);
  useEffect(() => {
    dailyTasksRef.current = dailyTasks;
  }, [dailyTasks]);
  useEffect(() => {
    backlogTasksRef.current = backlogTasks;
  }, [backlogTasks]);

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

  // 数据处理函数（避免重复代码）
  const processTasks = (savedDailyTasks) => {
    const converted = {};
    Object.keys(savedDailyTasks).forEach((dateKey) => {
      converted[dateKey] = savedDailyTasks[dateKey].map((task) => {
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
    return converted;
  };

  const processBacklogTasks = (savedBacklog) => {
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
  };

  const processYearlyGoals = (savedGoals) => {
    return savedGoals.map((goal) => ({
      ...goal,
      createdAt: new Date(goal.createdAt),
      progress: goal.progress || 0,
      completed: !!goal.completed,
      autoCalculated: goal.autoCalculated || false,
    }));
  };

  const processQuarterlyGoals = (savedGoals) => {
    return savedGoals.map((goal) => ({
      ...goal,
      createdAt: new Date(goal.createdAt),
      progress: goal.progress || 0,
      completed: !!goal.completed,
      quarter: goal.quarter || 1,
      weight: goal.weight || undefined,
    }));
  };

  const processWeeklyGoals = (savedGoals) => {
    return (savedGoals || []).map((goal) => ({
      ...goal,
      createdAt: new Date(goal.createdAt),
      progress: goal.progress || 0,
      completed: !!goal.completed,
      quarter: goal.quarter || 1,
      week: goal.week || 1,
      weight: goal.weight || undefined,
    }));
  };

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // 设置用户 ID 提供者
        dataStorage.setUserIdProvider(() => {
          return user?.id || null;
        });

        // ⭐ 第一步：立即从 localStorage 读取并显示数据（同步，瞬间完成）
        console.log('⚡ Loading local data immediately...');
        const loadLocalData = () => {
          const localDarkMode = dataStorage.getLocalData('darkMode');
          const localTheme = dataStorage.getLocalData('theme');
          const localDailyTasks = dataStorage.getLocalData('dailyTasks');
          const localCustomTags = dataStorage.getLocalData('customTags');
          const localHabits = dataStorage.getLocalData('habits');
          const localBacklogTasks = dataStorage.getLocalData('backlogTasks');
          const localYearlyGoals = dataStorage.getLocalData('yearlyGoals');
          const localQuarterlyGoals = dataStorage.getLocalData('quarterlyGoals');
          const localWeeklyGoals = dataStorage.getLocalData('weeklyGoals');

          if (localDarkMode !== null && localDarkMode !== undefined) setDarkMode(localDarkMode);
          if (localTheme) setTheme(localTheme);
          if (localDailyTasks) setDailyTasks(processTasks(localDailyTasks));
          if (localCustomTags) setCustomTags(localCustomTags);
          if (localHabits) setHabits(localHabits);
          if (localBacklogTasks) setBacklogTasks(processBacklogTasks(localBacklogTasks));
          if (localYearlyGoals) setYearlyGoals(processYearlyGoals(localYearlyGoals));
          if (localQuarterlyGoals) setQuarterlyGoals(processQuarterlyGoals(localQuarterlyGoals));
          if (localWeeklyGoals) setWeeklyGoals(processWeeklyGoals(localWeeklyGoals));
        };

        // 立即加载本地数据
        loadLocalData();

        // 标记数据已加载，允许用户操作
        setIsDataLoaded(true);
        console.log('✅ Local data loaded, UI ready');

        // ⚠️ 修复：删除这里的服务器同步逻辑，避免与第二个 useEffect 冲突
        // 服务器同步由第二个 useEffect 统一处理（监听 user, authenticated 变化）
        console.log('📍 Server sync will be handled by user authentication useEffect');
      } catch (error) {
        console.error('❌ Data loading failed:', error);
        // 即使失败也要允许备份，防止应用卡住
        setIsDataLoaded(true);
        setIsSyncingData(false);
      }
    };
    
    loadData();
  }, []);

  // ============================================================
  // Supabase 增量拉取（pull）逻辑
  // ============================================================
  // 新模型下不再有"本地 vs 服务器谁更新"的猜测式合并：
  // 每张逻辑表维护一个 last_pulled_at 水位线，每次 pull 只拉取
  // updated_at > last_pulled_at 的行（包含墓碑行），用服务器返回的
  // 最大 updated_at 作为新的水位线（而不是用客户端 Date.now()，避免时钟漂移）。
  // 拉取结果通过 withSyncSuppressed 写回 localStorage/React state，
  // 避免被 setLocalData 的 diff 逻辑当成"新的本地变更"又推回写队列。
  const PULL_TABLES = [
    "customTags",
    "yearlyGoals",
    "quarterlyGoals",
    "weeklyGoals",
    "habits",
    "habitCompletions",
    "dailyTasks",
    "backlogTasks",
    "settings",
  ];

  const pullAllChanges = async () => {
    for (const table of PULL_TABLES) {
      try {
        const lastPulledAt = dataStorage.getLastPulledAt(table);
        const { rows, maxUpdatedAt } = await dataStorage.pullChanges(table, lastPulledAt);

        if (rows.length === 0) {
          continue;
        }

        await dataStorage.withSyncSuppressed(async () => {
          switch (table) {
            case "customTags": {
              setCustomTags((prev) => {
                const next = applyArrayRowsLocal(prev, rows, tagRowToLocal);
                dataStorage.setLocalData("customTags", next);
                return next;
              });
              break;
            }
            case "yearlyGoals": {
              setYearlyGoals((prev) => {
                const next = applyArrayRowsLocal(prev, rows, goalRowToLocal);
                dataStorage.setLocalData("yearlyGoals", next);
                return next;
              });
              break;
            }
            case "quarterlyGoals": {
              setQuarterlyGoals((prev) => {
                const next = applyArrayRowsLocal(prev, rows, goalRowToLocal);
                dataStorage.setLocalData("quarterlyGoals", next);
                return next;
              });
              break;
            }
            case "weeklyGoals": {
              setWeeklyGoals((prev) => {
                const next = applyArrayRowsLocal(prev, rows, goalRowToLocal);
                dataStorage.setLocalData("weeklyGoals", next);
                return next;
              });
              break;
            }
            case "habits": {
              setHabits((prev) => {
                const next = applyHabitRowsLocal(prev, rows);
                dataStorage.setLocalData("habits", next);
                return next;
              });
              break;
            }
            case "habitCompletions": {
              setHabits((prev) => {
                const next = applyHabitCompletionRowsLocal(prev, rows);
                dataStorage.setLocalData("habits", next);
                return next;
              });
              break;
            }
            case "dailyTasks":
            case "backlogTasks": {
              const { dailyTasks: newDaily, backlogTasks: newBacklog } =
                applyTaskRowsLocal(dailyTasksRef.current, backlogTasksRef.current, rows);
              setDailyTasks(newDaily);
              setBacklogTasks(newBacklog);
              dataStorage.setLocalData("dailyTasks", newDaily);
              dataStorage.setLocalData("backlogTasks", newBacklog);
              break;
            }
            case "settings": {
              // settings 表只有一行（按 user_id），取最后一条即可
              const latestRow = rows[rows.length - 1];
              const settings = applySettingsRowLocal(latestRow);
              if (settings) {
                setDarkMode(settings.darkMode);
                setTheme(settings.theme);
                dataStorage.setLocalData("darkMode", settings.darkMode);
                dataStorage.setLocalData("theme", settings.theme);
              }
              break;
            }
            default:
              break;
          }
        });

        dataStorage.setLastPulledAt(table, maxUpdatedAt);
      } catch (error) {
        console.warn(`⚠️ Pull failed for table ${table}:`, error);
      }
    }
  };

  // 当用户登录/登出时更新 storage 的用户 ID 提供者，并处理挂载时的全量拉取 +
  // visibilitychange 触发的增量拉取
  useEffect(() => {
    // ⭐ 认证状态还在加载时，不要执行任何操作
    // 否则会错误地将 _current_user_id 设为 'anonymous'
    if (authLoading) {
      console.log('⏳ Auth still loading, skipping user change handling...');
      return;
    }

    const handleUserChange = async () => {
      dataStorage.setUserIdProvider(() => {
        return user?.id || null;
      });

      // 注入与认证共享的 Supabase client
      if (supabaseClient) {
        dataStorage.setSupabaseClientProvider(() => supabaseClient);
      }

      // 检测用户切换
      const userSwitched = dataStorage.checkUserSwitch();

      if (userSwitched) {
        console.log('🔄 User switched, clearing local data...');
        dataStorage.clearAllData();
        setDailyTasks({});
        setBacklogTasks([]);
        setCustomTags([]);
        setHabits([]);
        setYearlyGoals([]);
        setQuarterlyGoals([]);
        setWeeklyGoals([]);
      }

      dataStorage.updateCurrentUserId();

      if (!authenticated || !user) {
        console.log('⏳ User or auth not ready / anonymous, skip remote pull');
        return;
      }

      // ⭐ 展示一次性提醒："检测到本地有未关联账号的数据，登录后会自动同步"
      // 新模型不再需要用户选择"合并/丢弃"：本地数据会在下一次写队列 flush 时自然推送上去。
      if (dataStorage.hasAnonymousData()) {
        toast.info('检测到本地数据', {
          description: '将自动同步到你的账号',
        });
      }

      setIsSyncingData(true);
      try {
        await pullAllChanges();
      } catch (error) {
        console.warn('⚠️ Initial pull failed:', error);
      } finally {
        setIsSyncingData(false);
      }

      // 注册 beforeunload / visibilitychange 兜底 flush
      dataStorage.registerBeforeUnloadFlush();
    };

    handleUserChange();

    // visibilitychange 触发的增量拉取（回到前台时）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && authenticated && user) {
        pullAllChanges().catch((error) => {
          console.warn('⚠️ Visibility-triggered pull failed:', error);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authenticated, authLoading, supabaseClient]); // 监听 user、authenticated、authLoading 和 supabaseClient 的变化

  // 处理匿名使用风险提醒 - 用户点击"我知道了"

  // 处理匿名使用风险提醒 - 用户点击"我知道了"
  const handleDismissAnonymousWarning = () => {
    console.log('✓ User dismissed anonymous warning');
    dataStorage.markAnonymousWarningSeen();
    setShowAnonymousWarning(false);
  };

  // 处理匿名使用风险提醒 - 用户点击"立即登录/注册"
  const handleOpenSettingsFromWarning = () => {
    console.log('→ User wants to login from warning');
    dataStorage.markAnonymousWarningSeen();
    setShowAnonymousWarning(false);
    setShowSettings(true); // 打开设置页面，用户可以在那里登录
  };

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
        setShowTopicTree(false);
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
        showTopicTree ||
        showTimer ||
        showSettings ||
        showTaskOptions ||
        showAddSubtask
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
    showTopicTree,
    showTimer,
    showSettings,
    showTaskOptions,
    showAddSubtask,
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
      
      // ⭐ 检查是否应该显示匿名使用风险提醒
      if (dataStorage.shouldShowAnonymousWarning()) {
        console.log('⚠️  Should show anonymous warning');
        setShowAnonymousWarning(true);
      }
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
      
      // ⭐ 检查是否应该显示匿名使用风险提醒
      if (dataStorage.shouldShowAnonymousWarning()) {
        console.log('⚠️  Should show anonymous warning');
        setShowAnonymousWarning(true);
      }
    }
  }, [backlogTasks, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("habits", habits);
      
      // ⭐ 检查是否应该显示匿名使用风险提醒
      if (dataStorage.shouldShowAnonymousWarning()) {
        console.log('⚠️  Should show anonymous warning');
        setShowAnonymousWarning(true);
      }
    }
  }, [habits, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("yearlyGoals", yearlyGoals);
      
      // ⭐ 检查是否应该显示匿名使用风险提醒
      if (dataStorage.shouldShowAnonymousWarning()) {
        console.log('⚠️  Should show anonymous warning');
        setShowAnonymousWarning(true);
      }
    }
  }, [yearlyGoals, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("quarterlyGoals", quarterlyGoals);
      
      // ⭐ 检查是否应该显示匿名使用风险提醒
      if (dataStorage.shouldShowAnonymousWarning()) {
        console.log('⚠️  Should show anonymous warning');
        setShowAnonymousWarning(true);
      }
    }
  }, [quarterlyGoals, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      dataStorage.setLocalData("weeklyGoals", weeklyGoals);
      
      // ⭐ 检查是否应该显示匿名使用风险提醒
      if (dataStorage.shouldShowAnonymousWarning()) {
        console.log('⚠️  Should show anonymous warning');
        setShowAnonymousWarning(true);
      }
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

  // ✅ 年度目标删除函数：墓碑删除单行并立即 flush（不等待防抖）
  const deleteYearlyGoal = (goalId) => {
    const newYearlyGoals = yearlyGoals.filter((goal) => goal.id !== goalId);
    setYearlyGoals(newYearlyGoals);
    dataStorage.queueMutation('yearlyGoals', 'delete', goalId, null);
    dataStorage.flushMutationQueue();
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

    // ✅ 预计算新状态
    const newQuarterlyGoals = quarterlyGoals.filter((goal) => goal.id !== goalId);
    setQuarterlyGoals(newQuarterlyGoals);

    // ✅ 删除操作：墓碑删除单行并立即 flush
    dataStorage.queueMutation('quarterlyGoals', 'delete', goalId, null);
    dataStorage.flushMutationQueue();

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
    const goal = weeklyGoals.find((g) => g.id === goalId);
    const hadQuarterlyGoal = goal?.quarterlyGoalId;

    // ✅ 预计算新状态
    const newWeeklyGoals = weeklyGoals.filter((g) => g.id !== goalId);
    setWeeklyGoals(newWeeklyGoals);

    // ✅ 删除操作：墓碑删除单行并立即 flush
    dataStorage.queueMutation('weeklyGoals', 'delete', goalId, null);
    dataStorage.flushMutationQueue();

    // Update quarterly goal progress if it was associated
    if (hadQuarterlyGoal) {
      // ✅ 预计算更新后的季度目标
      const newQuarterlyGoals = quarterlyGoals.map((qGoal) => {
        if (qGoal.id !== hadQuarterlyGoal) return qGoal;

        const associatedWeeklyGoals = newWeeklyGoals.filter(
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

      setQuarterlyGoals(newQuarterlyGoals);
      // ✅ 只有被重新计算进度的那一个季度目标发生了变化，逐行 upsert 即可
      const changedQuarterlyGoal = newQuarterlyGoals.find((g) => g.id === hadQuarterlyGoal);
      if (changedQuarterlyGoal) {
        dataStorage.queueMutation('quarterlyGoals', 'upsert', changedQuarterlyGoal.id, changedQuarterlyGoal);
        dataStorage.flushMutationQueue();
      }

      setTimeout(() => updateYearlyGoalsProgress(), 0);
    }
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

      // 3.5. Merge Backlog Tasks (similar to daily tasks but simpler)
      if (data.backlogTasks) {
        setBacklogTasks((prevBacklogTasks) => {
          const taskMap = new Map();
          
          // 先添加现有任务
          prevBacklogTasks.forEach(task => {
            taskMap.set(task.id, task);
          });

          // 处理导入的 Backlog 任务
          data.backlogTasks.forEach((incomingTask) => {
            // Map the tag ID if it exists in our mapping
            const mappedTagId =
              incomingTask.tag && tagMapping.has(incomingTask.tag)
                ? tagMapping.get(incomingTask.tag)
                : incomingTask.tag;

            const processedTask = {
              ...incomingTask,
              createdAt: new Date(incomingTask.createdAt),
              focusTime: incomingTask.focusTime || 0,
              timeSpent: incomingTask.timeSpent || 0,
              completed: !!incomingTask.completed,
              tag: mappedTagId,
              subtasks: (incomingTask.subtasks || []).map((subtask) => {
                const mappedSubtaskTagId =
                  subtask.tag && tagMapping.has(subtask.tag)
                    ? tagMapping.get(subtask.tag)
                    : subtask.tag;

                return {
                  ...subtask,
                  createdAt: new Date(subtask.createdAt || incomingTask.createdAt),
                  focusTime: subtask.focusTime || 0,
                  timeSpent: subtask.timeSpent || 0,
                  completed: !!subtask.completed,
                  parentTaskId: incomingTask.id,
                  tag: mappedSubtaskTagId,
                  subtasks: [],
                };
              }),
              subtasksExpanded: incomingTask.subtasksExpanded || false,
              isBacklog: true,
            };

            if (taskMap.has(incomingTask.id)) {
              // 任务已存在，合并（以最新的为准）
              const existingTask = taskMap.get(incomingTask.id);
              const existingTime = new Date(existingTask.createdAt).getTime();
              const incomingTime = new Date(processedTask.createdAt).getTime();
              
              if (incomingTime > existingTime) {
                taskMap.set(incomingTask.id, processedTask);
                importStats.updatedTasks++;
              }
            } else {
              // 新任务
              taskMap.set(incomingTask.id, processedTask);
              importStats.newTasks++;
            }
          });

          return Array.from(taskMap.values());
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

  // ====== 🎯 全局任务查找和管理系统 ======
  
  /**
   * 在所有位置全局查找任务（包括所有日期和 Backlog）
   * @param {string} taskId - 任务ID
   * @returns {{ task: Object, location: { type: 'daily'|'backlog', dateString?: string, parentTaskId?: string } } | null}
   */
  const findTaskGlobally = (taskId) => {
    // 1. 在 Backlog 中查找
    const backlogTask = backlogTasks.find(t => t.id === taskId);
    if (backlogTask) {
      return {
        task: backlogTask,
        location: { type: 'backlog' }
      };
    }
    
    // 在 Backlog 的子任务中查找
    for (const task of backlogTasks) {
      if (task.subtasks && task.subtasks.length > 0) {
        const subtask = task.subtasks.find(st => st.id === taskId);
        if (subtask) {
          return {
            task: subtask,
            location: { type: 'backlog', parentTaskId: task.id }
          };
        }
      }
    }
    
    // 2. 在所有日期的任务中查找
    for (const dateString in dailyTasks) {
      const dayTasks = dailyTasks[dateString] || [];
      
      // 检查主任务
      for (const task of dayTasks) {
        if (task.id === taskId && !task.isHabit) {
          return {
            task,
            location: { type: 'daily', dateString }
          };
        }
        
        // 检查子任务
        if (task.subtasks && task.subtasks.length > 0) {
          const subtask = task.subtasks.find(st => st.id === taskId);
          if (subtask) {
            return {
              task: subtask,
              location: { type: 'daily', dateString, parentTaskId: task.id }
            };
          }
        }
      }
    }
    
    return null;
  };

  /**
   * 检测重复任务
   * @returns {Array<{ taskId: string, locations: Array<Object> }>}
   */
  const findDuplicateTasks = () => {
    const taskMap = new Map(); // taskId -> [locations]
    
    // 检查 Backlog
    backlogTasks.forEach(task => {
      if (!task.isHabit) {
        if (!taskMap.has(task.id)) {
          taskMap.set(task.id, []);
        }
        taskMap.get(task.id).push({ type: 'backlog', title: task.title });
      }
    });
    
    // 检查所有日期
    Object.keys(dailyTasks).forEach(dateString => {
      const dayTasks = dailyTasks[dateString] || [];
      dayTasks.forEach(task => {
        if (!task.isHabit) {
          if (!taskMap.has(task.id)) {
            taskMap.set(task.id, []);
          }
          taskMap.get(task.id).push({ type: 'daily', dateString, title: task.title });
        }
      });
    });
    
    // 找出重复的
    const duplicates = [];
    taskMap.forEach((locations, taskId) => {
      if (locations.length > 1) {
        duplicates.push({ taskId, locations });
      }
    });
    
    return duplicates;
  };

  /**
   * 通用任务移动函数 - 所有任务移动操作的统一入口
   * @param {string} taskId - 任务ID
   * @param {{ type: 'daily', date: Date } | { type: 'backlog' }} destination - 目标位置
   * @param {{ resetProgress: boolean }} options - 选项
   * @returns {boolean} 是否成功
   */
  const moveTask = (taskId, destination, options = { resetProgress: true }) => {
    // 1. 全局查找任务
    const found = findTaskGlobally(taskId);
    
    if (!found) {
      console.error('❌ Task not found globally:', taskId);
      toast.error('任务未找到', {
        description: '可能已被删除或数据不一致'
      });
      return false;
    }
    
    const { task, location } = found;
    
    // 2. 检查是否是子任务（子任务不能独立移动）
    if (location.parentTaskId) {
      toast.error('无法移动子任务', {
        description: '子任务必须跟随父任务'
      });
      return false;
    }
    
    // 3. 检查是否是习惯任务
    if (task.isHabit) {
      toast.error('无法移动习惯任务', {
        description: '习惯任务由习惯追踪器管理'
      });
      return false;
    }
    
    // 4. 准备移动后的任务数据
    const movedTask = {
      ...task,
      ...(destination.type === 'daily' && options.resetProgress ? {
        createdAt: destination.date,
        completed: false,
        timeSpent: 0,
        focusTime: 0,
        subtasks: (task.subtasks || []).map(st => ({
          ...st,
          completed: false,
          timeSpent: 0,
          focusTime: 0,
          createdAt: destination.date,
        })),
      } : {}),
      ...(destination.type === 'backlog' ? {
        createdAt: new Date(),
        isBacklog: true,
      } : {
        ...(destination.type === 'daily' && !options.resetProgress ? {
          createdAt: destination.date,
        } : {}),
        isBacklog: false,
      }),
    };
    
    console.log('🔄 Moving task:', {
      taskId,
      title: task.title,
      from: location,
      to: destination,
      resetProgress: options.resetProgress
    });

    // ✅ 修复：预先计算新状态，确保原子性更新和备份
    let newDailyTasks = dailyTasks;
    let newBacklogTasks = backlogTasks;

    // 5. 从原位置删除
    if (location.type === 'backlog') {
      newBacklogTasks = backlogTasks.filter(t => t.id !== taskId);
    } else {
      newDailyTasks = { ...dailyTasks };
      if (newDailyTasks[location.dateString]) {
        newDailyTasks[location.dateString] = newDailyTasks[location.dateString].filter(
          t => t.id !== taskId
        );
        // 清理空日期条目
        if (newDailyTasks[location.dateString].length === 0) {
          delete newDailyTasks[location.dateString];
        }
      }
    }

    // 6. 添加到新位置
    if (destination.type === 'backlog') {
      newBacklogTasks = [...newBacklogTasks.filter(t => t.id !== taskId), movedTask];
      toast.success('已移动到 Backlog');
    } else {
      const targetDateString = getDateString(destination.date);
      newDailyTasks = {
        ...newDailyTasks,
        [targetDateString]: [...(newDailyTasks[targetDateString] || []).filter(t => t.id !== taskId), movedTask],
      };
      toast.success(`已移动到 ${new Date(destination.date).toLocaleDateString('zh-CN')}`);
    }

    // 7. 原子性更新状态
    setDailyTasks(newDailyTasks);
    setBacklogTasks(newBacklogTasks);

    // 8. ✅ 单行 upsert 并立即 flush：任务移动只涉及这一条任务记录本身，
    // 不需要像旧版那样整表备份。dailyTasks 的 scheduledDate 是通过对象的 key 隐含的，
    // movedTask 本身不带这个字段，这里补上，否则远端的 scheduled_date 会被写成 null。
    console.log('⚡ Queueing single-row mutation after moveTask');
    const movedTable = destination.type === 'backlog' ? 'backlogTasks' : 'dailyTasks';
    const movedTaskPayload = destination.type === 'backlog'
      ? movedTask
      : { ...movedTask, scheduledDate: getDateString(destination.date) };
    dataStorage.queueMutation(movedTable, 'upsert', movedTask.id, movedTaskPayload);
    dataStorage.flushMutationQueue();

    return true;
  };

  /**
   * 清理重复任务（保留最新的副本）
   */
  const deduplicateTasks = () => {
    const duplicates = findDuplicateTasks();
    
    if (duplicates.length === 0) {
      toast.info('数据检查完成', {
        description: '没有发现重复任务'
      });
      return;
    }
    
    let cleanedCount = 0;

    // ✅ 修复：预计算最终状态，然后一次性更新
    let newDailyTasks = { ...dailyTasks };
    let newBacklogTasks = [...backlogTasks];
    // 远端 ts_tasks 按 id 是单行存储的，重复副本是本地展示层面上同一个 id 出现在
    // 多个日期分组/backlog 里的产物，远端本来就只有一行。所以这里不需要对"删除的副本"
    // 发出 delete mutation（那会把这个任务从远端整个删掉），只需要把最终保留的那个
    // 位置（keepLocation）的数据 upsert 一次，确保 scheduled_date 等字段与本地保留的
    // 版本一致即可。
    const keepPayloads = [];

    duplicates.forEach(({ taskId, locations }) => {
      // 找出最新的位置（按日期排序，Backlog 视为最新）
      const sortedLocations = locations.sort((a, b) => {
        if (a.type === 'backlog') return -1;
        if (b.type === 'backlog') return 1;
        return b.dateString.localeCompare(a.dateString);
      });

      const keepLocation = sortedLocations[0];
      const removeLocations = sortedLocations.slice(1);

      console.log(`🔧 Task ${taskId} (${locations[0].title}): 保留 ${keepLocation.type}${keepLocation.dateString || ''}, 删除 ${removeLocations.length} 个副本`);

      // 删除旧副本（仅本地展示层面，远端无需变化）
      removeLocations.forEach(loc => {
        if (loc.type === 'backlog') {
          newBacklogTasks = newBacklogTasks.filter(t => t.id !== taskId);
        } else {
          if (newDailyTasks[loc.dateString]) {
            newDailyTasks[loc.dateString] = newDailyTasks[loc.dateString].filter(
              t => t.id !== taskId
            );
            // 清理空日期条目
            if (newDailyTasks[loc.dateString].length === 0) {
              delete newDailyTasks[loc.dateString];
            }
          }
        }
        cleanedCount++;
      });

      keepPayloads.push({ taskId, keepLocation });
    });

    // 一次性更新状态
    setDailyTasks(newDailyTasks);
    setBacklogTasks(newBacklogTasks);

    // ✅ 把每个保留下来的任务 upsert 一次，确保远端字段（尤其是 scheduled_date）与本地一致
    keepPayloads.forEach(({ taskId, keepLocation }) => {
      const table = keepLocation.type === 'backlog' ? 'backlogTasks' : 'dailyTasks';
      const list = keepLocation.type === 'backlog'
        ? newBacklogTasks
        : (newDailyTasks[keepLocation.dateString] || []);
      const task = list.find(t => t.id === taskId);
      if (task) {
        const payload = keepLocation.type === 'backlog'
          ? task
          : { ...task, scheduledDate: keepLocation.dateString };
        dataStorage.queueMutation(table, 'upsert', taskId, payload);
      }
    });
    dataStorage.flushMutationQueue();

    toast.success('数据清理完成', {
      description: `找到 ${duplicates.length} 个重复任务，删除了 ${cleanedCount} 个副本`
    });
  };

  /**
   * 验证数据完整性
   */
  const validateDataIntegrity = () => {
    const issues = [];
    
    // 检查重复任务
    const duplicates = findDuplicateTasks();
    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate',
        count: duplicates.length,
        severity: 'error',
        message: `发现 ${duplicates.length} 个任务有重复副本`,
        action: '立即清理',
        fix: deduplicateTasks
      });
    }
    
    // 检查孤立的子任务
    let orphanedSubtasks = 0;
    Object.values(dailyTasks).forEach(dayTasks => {
      dayTasks.forEach(task => {
        if (task.subtasks) {
          task.subtasks.forEach(subtask => {
            if (subtask.parentTaskId !== task.id) {
              orphanedSubtasks++;
            }
          });
        }
      });
    });
    
    if (orphanedSubtasks > 0) {
      issues.push({
        type: 'orphaned',
        count: orphanedSubtasks,
        severity: 'warning',
        message: `发现 ${orphanedSubtasks} 个子任务的父任务关联错误`
      });
    }
    
    // 检查无效的目标关联
    let invalidGoalLinks = 0;
    const checkTaskGoalLinks = (tasks) => {
      tasks.forEach(task => {
        if (task.weeklyGoalId && !weeklyGoals.find(g => g.id === task.weeklyGoalId)) {
          invalidGoalLinks++;
        }
        if (task.yearlyGoalId && !yearlyGoals.find(g => g.id === task.yearlyGoalId)) {
          invalidGoalLinks++;
        }
      });
    };
    
    Object.values(dailyTasks).forEach(checkTaskGoalLinks);
    checkTaskGoalLinks(backlogTasks);
    
    if (invalidGoalLinks > 0) {
      issues.push({
        type: 'invalid-links',
        count: invalidGoalLinks,
        severity: 'warning',
        message: `发现 ${invalidGoalLinks} 个无效的目标关联`
      });
    }
    
    return issues;
  };

  // Helper function to find a task by ID (including subtasks) - 保留用于向后兼容
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
    const newBacklogTasks = backlogTasks.filter((task) => task.id !== taskId);
    setBacklogTasks(newBacklogTasks);
    // ✅ 墓碑删除单行并立即 flush（不依赖 useEffect 里对整表的 diff，避免时序问题）
    dataStorage.queueMutation('backlogTasks', 'delete', taskId, null);
    dataStorage.flushMutationQueue();
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

  // 将 Backlog 任务移动到某一天 - 使用统一的 moveTask 函数
  const moveBacklogTaskToDay = (taskId, targetDate) => {
    return moveTask(taskId, { type: 'daily', date: targetDate }, { resetProgress: false });
  };

  // 将某一天的任务移动到 Backlog - 使用统一的 moveTask 函数
  const moveDayTaskToBacklog = (taskId) => {
    return moveTask(taskId, { type: 'backlog' }, { resetProgress: false });
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
      const deletedHabit = habits.find((habit) => habit.id === habitId);
      const updatedHabits = habits.filter((habit) => habit.id !== habitId);
      setHabits(updatedHabits);
      // ✅ 墓碑删除这个习惯本身，并把它所有的完成记录一并墓碑（镜像 diffHabits 里
      // "整个习惯被删除"的级联逻辑），然后立即 flush。
      dataStorage.queueMutation('habits', 'delete', habitId, null);
      (deletedHabit?.completedDates || []).forEach((date) => {
        dataStorage.queueMutation('habitCompletions', 'delete', `${habitId}_${date}`, null);
      });
      dataStorage.flushMutationQueue();
    } else {
      // Regular task/subtask deletion
      const updatedTasks = removeTaskFromList(id, currentTasks);
      const newDailyTasks = { ...dailyTasks, [dateString]: updatedTasks };
      setDailyTasks(newDailyTasks);
      // ✅ 墓碑删除单行并立即 flush
      dataStorage.queueMutation('dailyTasks', 'delete', id, null);
      dataStorage.flushMutationQueue();
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
    // 使用统一的 moveTask 函数，并重置进度
    return moveTask(taskId, { type: 'daily', date: targetDate }, { resetProgress: true });
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

  // ✅ 修复：记录任务来源，避免重复任务时删错位置
  const [selectedTaskIsBacklog, setSelectedTaskIsBacklog] = useState(false);

  const handleTaskClick = (task, isFromBacklog = false) => {
    setSelectedTask(task);
    setSelectedTaskIsBacklog(isFromBacklog);  // 记录任务来源
    setShowTaskOptions(true);
  };

  const exportData = () => {
    const data = {
      dailyTasks,
      backlogTasks, // 新增：导出 Backlog 任务
      customTags,
      habits,
      yearlyGoals,
      quarterlyGoals,
      weeklyGoals,
      darkMode,
      theme,
      exportDate: new Date().toISOString(),
      version: "3.4", // 更新版本号以支持 Backlog
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `A计划_backup-${
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
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target?.result);

            // ✅ 修复问题4：导入前禁用自动同步，防止数据被覆盖
            setIsSyncingData(true);
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
              dataStorage.setLocalData('dailyTasks', data.dailyTasks); // ✅ 持久化
            }
            if (data.customTags) {
              setCustomTags(data.customTags);
              dataStorage.setLocalData('customTags', data.customTags); // ✅ 持久化
            }
            if (data.habits) {
              setHabits(data.habits);
              dataStorage.setLocalData('habits', data.habits); // ✅ 持久化
            }
            if (data.backlogTasks) {
              // 导入 Backlog 任务
              const convertedBacklogTasks = data.backlogTasks.map((task) => ({
                ...task,
                createdAt: new Date(task.createdAt),
                focusTime: task.focusTime || 0,
                timeSpent: task.timeSpent || 0,
                subtasks: (task.subtasks || []).map((subtask) => ({
                  ...subtask,
                  createdAt: new Date(subtask.createdAt || task.createdAt),
                  focusTime: subtask.focusTime || 0,
                  timeSpent: subtask.timeSpent || 0,
                  completed: !!subtask.completed,
                  parentTaskId: task.id,
                  subtasks: [],
                })),
                subtasksExpanded: task.subtasksExpanded || false,
                completed: !!task.completed,
                isBacklog: true, // 确保标记为 Backlog 任务
              }));
              setBacklogTasks(convertedBacklogTasks);
              dataStorage.setLocalData('backlogTasks', data.backlogTasks); // ✅ 持久化
            }
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
              dataStorage.setLocalData('yearlyGoals', data.yearlyGoals); // ✅ 持久化
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
              dataStorage.setLocalData('quarterlyGoals', data.quarterlyGoals); // ✅ 持久化
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
              dataStorage.setLocalData('weeklyGoals', data.weeklyGoals); // ✅ 持久化
            }
            if (typeof data.darkMode === "boolean") {
              setDarkMode(data.darkMode);
              dataStorage.setLocalData('darkMode', data.darkMode); // ✅ 持久化
            }
            if (data.theme) {
              setTheme(data.theme);
              dataStorage.setLocalData('theme', data.theme); // ✅ 持久化
            }

            // ✅ 上面每个 setLocalData 调用都已经把变更 diff 进了写队列（outbox），
            // 这里直接显式 flush 一次，确保落库后再提示"已保存到云端"，
            // 不再依赖"等待 1.5 秒防抖"这种不确定的猜测。
            await dataStorage.flushMutationQueue();

            setIsSyncingData(false);
            toast.success("数据导入成功", {
              description: "数据已保存到云端"
            });
            setShowSettings(false); // Close settings after import
          } catch (error) {
            console.error("导入数据时出错:", error);
            setIsSyncingData(false);
            toast.error("导入数据时出错", {
              description: error.message || "请检查文件格式"
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
                      onTaskClick={(task) => handleTaskClick(task, true)}
                      onAddSubtask={handleAddSubtask}
                      weeklyGoals={weeklyGoals}
                      yearlyGoals={yearlyGoals}
                      isBacklog={true}
                      title="待办"
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
                      <span className="text-xs">番茄钟</span>
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
                      <span className="text-xs">习惯打卡</span>
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
                      <span className="text-xs">周目标</span>
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
                      <span className="text-xs">更多</span>
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
                    A计划
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
                    <span className="font-extrabold">添加任务</span>
                  </Button>

                  <Button
                    onClick={() => setShowTimer(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Timer className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">番茄钟</span>
                  </Button>

                  <Button
                    onClick={() => setShowHabits(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <BarChart3 className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">习惯打卡</span>
                  </Button>

                  <Button
                    onClick={() => setShowYearlyGoals(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Target className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">年度目标</span>
                  </Button>

                  <Button
                    onClick={() => setShowQuarterlyGoals(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <TrendingUp className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">季度目标</span>
                  </Button>

                  <Button
                    onClick={() => setShowWeeklyGoals(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Calendar className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">周目标</span>
                  </Button>

                  <Button
                    onClick={() => setShowTopicTree(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <GitBranch className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">课题拆解树</span>
                  </Button>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="p-6 pt-0 text-[10px] text-muted-foreground font-extrabold space-y-1 opacity-70">
                  <div>⌘/Ctrl + A → 添加任务</div>
                  <div>⌘/Ctrl + C → 番茄钟</div>
                  <div>⌘/Ctrl + H → 习惯打卡</div>
                  <div>⌘/Ctrl + G → 年度目标</div>
                  <div>⌘/Ctrl + Q → 季度目标</div>
                  <div>⌘/Ctrl + W → 周目标</div>
                  <div>⌘/Ctrl + X → 设置</div>
                  <div>Esc → 关闭弹窗</div>
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
                      onTaskClick={(task) => handleTaskClick(task, true)}
                      onAddSubtask={handleAddSubtask}
                      weeklyGoals={weeklyGoals}
                      yearlyGoals={yearlyGoals}
                      isBacklog={true}
                      title="待办"
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
                user={user}
                authenticated={authenticated}
                onLogout={logout}
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
                  setSelectedTaskIsBacklog(false);  // 重置来源标记
                }}
                onUpdateTask={selectedTaskIsBacklog ? updateBacklogTask : updateTask}
                onDeleteTask={selectedTaskIsBacklog ? deleteBacklogTask : deleteTask}
                onAddCustomTag={addCustomTag}
                onToggleTask={selectedTaskIsBacklog ? toggleBacklogTask : toggleTask}
                selectedDate={selectedDate}
                onTransferTask={transferTaskToCurrentDay}
                currentActualDate={new Date()}
                onAddSubtask={handleAddSubtask}
                allTasks={allTasks}
                weeklyGoals={weeklyGoals}
                yearlyGoals={yearlyGoals}
                onMoveToBacklog={moveDayTaskToBacklog}
                onMoveToDay={moveBacklogTaskToDay}
                isBacklogTask={selectedTaskIsBacklog}
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
                onDeleteYearlyGoal={deleteYearlyGoal}
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
                onDeleteQuarterlyGoal={deleteQuarterlyGoal}
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

            {showTopicTree && (
              <TechTopicTree onClose={() => setShowTopicTree(false)} />
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

                      {/* Topic Tree */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowTopicTree(true);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <GitBranch className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-extrabold text-lg text-gray-900 dark:text-gray-100">Topic Tree</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">技术课题拆解树</div>
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

      {/* 匿名使用风险提醒对话框 */}
      <AnimatePresence>
        {showAnonymousWarning && (
          <AnonymousWarningDialog
            onDismiss={handleDismissAnonymousWarning}
            onOpenSettings={handleOpenSettingsFromWarning}
          />
        )}
      </AnimatePresence>
    </>
  );
}
