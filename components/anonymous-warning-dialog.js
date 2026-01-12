"use client";

import { motion } from "framer-motion";
import { AlertTriangle, LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnonymousWarningDialog({ onDismiss, onOpenSettings }) {
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
    exit: { opacity: 0, scale: 0.9, y: 20 },
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onDismiss}
    >
      <motion.div
        className="relative w-full max-w-md p-8 bg-background rounded-3xl shadow-2xl border-2 border-yellow-500/30"
        variants={dialogVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* 图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-extrabold text-center mb-4 text-gray-900 dark:text-gray-100">
          数据安全提醒
        </h2>

        {/* 说明 */}
        <div className="mb-6 space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            您当前处于<span className="font-bold text-gray-900 dark:text-gray-100">未登录状态</span>
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              存在数据丢失风险
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-500">•</span>
                <span>数据仅保存在浏览器本地</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-500">•</span>
                <span>清除浏览器数据会导致永久丢失</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-500">•</span>
                <span>无法在其他设备访问您的数据</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <LogIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              登录后享受更多保障
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>数据自动云端备份</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>多设备实时同步</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>永久保存，安全可靠</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="space-y-3">
          <Button
            onClick={onOpenSettings}
            className="w-full h-12 rounded-xl font-extrabold text-lg"
            size="lg"
          >
            <LogIn className="h-5 w-5 mr-2" />
            立即登录/注册
          </Button>

          <Button
            onClick={onDismiss}
            variant="ghost"
            className="w-full h-12 rounded-xl font-semibold text-base"
            size="lg"
          >
            我知道了，继续使用
          </Button>
        </div>

        {/* 提示 */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-4">
          此提示仅显示一次，您随时可以在设置中登录
        </p>
      </motion.div>
    </motion.div>
  );
}

