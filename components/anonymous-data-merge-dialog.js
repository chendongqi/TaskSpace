"use client";

import { motion } from "framer-motion";
import { Database, Merge, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnonymousDataMergeDialog({ onMerge, onDiscard, anonymousDataSummary }) {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const dialogVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
  };

  // 统计匿名数据数量
  const getDataCount = () => {
    const counts = [];
    
    if (anonymousDataSummary.dailyTasks) {
      const taskCount = Object.values(anonymousDataSummary.dailyTasks).flat().length;
      if (taskCount > 0) counts.push(`${taskCount} 个日常任务`);
    }
    
    if (anonymousDataSummary.backlogTasks?.length) {
      counts.push(`${anonymousDataSummary.backlogTasks.length} 个待办任务`);
    }
    
    if (anonymousDataSummary.habits?.length) {
      counts.push(`${anonymousDataSummary.habits.length} 个习惯`);
    }
    
    if (anonymousDataSummary.yearlyGoals?.length) {
      counts.push(`${anonymousDataSummary.yearlyGoals.length} 个年度目标`);
    }
    
    if (anonymousDataSummary.quarterlyGoals?.length) {
      counts.push(`${anonymousDataSummary.quarterlyGoals.length} 个季度目标`);
    }
    
    if (anonymousDataSummary.weeklyGoals?.length) {
      counts.push(`${anonymousDataSummary.weeklyGoals.length} 个周目标`);
    }
    
    return counts;
  };

  const dataCounts = getDataCount();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className="relative w-full max-w-lg p-8 bg-background rounded-3xl shadow-2xl border-2 border-primary/30"
        variants={dialogVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-3xl font-extrabold text-center mb-4 text-gray-900 dark:text-gray-100">
          检测到本地数据
        </h2>

        {/* 说明 */}
        <div className="mb-6 space-y-3">
          <p className="text-center text-gray-600 dark:text-gray-400">
            检测到您在未登录状态下创建了一些数据：
          </p>
          
          <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 border border-primary/20">
            <ul className="space-y-2">
              {dataCounts.map((count, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              请选择如何处理这些数据。合并后，数据将保存到您的账号并同步到云端。
            </p>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="space-y-3">
          <Button
            onClick={onMerge}
            className="w-full h-12 rounded-xl font-extrabold text-lg"
            size="lg"
          >
            <Merge className="h-5 w-5 mr-2" />
            合并到我的账号
          </Button>

          <Button
            onClick={onDiscard}
            variant="outline"
            className="w-full h-12 rounded-xl font-extrabold text-lg border-2"
            size="lg"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            丢弃本地数据
          </Button>
        </div>

        {/* 提示 */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-4">
          选择"合并"将保留所有数据，选择"丢弃"将清空本地数据并恢复账号的云端数据
        </p>
      </motion.div>
    </motion.div>
  );
}

