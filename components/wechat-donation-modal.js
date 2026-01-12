"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WeChatDonationModal({ show, onClose }) {
  const [imageError, setImageError] = useState(false);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <QrCode className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                  微信捐赠
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-4">
                  感谢您的支持！请使用微信扫码捐赠
                </p>
                
                {/* QR Code Container */}
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                    {!imageError ? (
                      <img
                        src="/wechat-donation-qr.png"
                        alt="微信收款码"
                        className="w-64 h-64 object-contain"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <div className="text-center p-4">
                          <QrCode className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            请将微信收款码图片放在
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">
                            /public/wechat-donation-qr.png
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  您的支持是我们持续改进的动力 ❤️
                </p>
              </div>

              {/* Close Button */}
              <Button
                onClick={onClose}
                className="w-full bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl"
              >
                关闭
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

