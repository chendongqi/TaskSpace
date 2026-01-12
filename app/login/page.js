"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@wonder-lab/auth-sdk";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login, authenticated, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (authenticated && !loading) {
      router.push("/");
    }
  }, [authenticated, loading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("请填写所有字段");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await login({ email, password });
      
      if (error) {
        toast.error("登录失败", {
          description: error.message || "请检查邮箱和密码",
        });
      } else {
        toast.success("登录成功！");
        router.push("/");
      }
    } catch (err) {
      toast.error("登录失败", {
        description: "网络错误，请稍后重试",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* 返回按钮 */}
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </Link>

        {/* 登录表单 */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold mb-2">欢迎回来</h1>
            <p className="text-muted-foreground">登录以同步你的数据到云端</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* 邮箱输入 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                邮箱地址
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                disabled={isLoading}
                required
              />
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                密码
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                disabled={isLoading}
                required
              />
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  登录中...
                </div>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  登录
                </>
              )}
            </Button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">还没有账号？</span>
            <Link
              href="/register"
              className="ml-2 text-primary font-semibold hover:underline"
            >
              立即注册
            </Link>
          </div>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-accent/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              💡 提示：登录后你的数据将同步到云端，可在多设备间访问
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

