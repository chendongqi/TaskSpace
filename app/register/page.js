"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@wonder-lab/auth-sdk";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, UserPlus, ArrowLeft, User } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const { register, authenticated, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (authenticated && !loading) {
      router.push("/");
    }
  }, [authenticated, loading, router]);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      toast.error("密码长度至少为 6 个字符");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await register({ 
        email, 
        password,
        name: name || undefined // 可选字段
      });
      
      if (error) {
        toast.error("注册失败", {
          description: error.message || "请检查输入信息",
        });
      } else {
        toast.success("注册成功！", {
          description: "欢迎使用 PrioSpace",
        });
        router.push("/");
      }
    } catch (err) {
      toast.error("注册失败", {
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

        {/* 注册表单 */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold mb-2">创建账号</h1>
            <p className="text-muted-foreground">注册以开始使用云同步功能</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* 昵称输入（可选） */}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                昵称
                <span className="text-xs text-muted-foreground font-normal">(可选)</span>
              </label>
              <Input
                type="text"
                placeholder="你的昵称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12"
                disabled={isLoading}
              />
            </div>

            {/* 邮箱输入 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                邮箱地址
                <span className="text-xs text-red-500">*</span>
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
                <span className="text-xs text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="至少 6 个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                disabled={isLoading}
                required
              />
            </div>

            {/* 确认密码 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                确认密码
                <span className="text-xs text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12"
                disabled={isLoading}
                required
              />
            </div>

            {/* 注册按钮 */}
            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  注册中...
                </div>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  注册
                </>
              )}
            </Button>
          </form>

          {/* 登录链接 */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">已有账号？</span>
            <Link
              href="/login"
              className="ml-2 text-primary font-semibold hover:underline"
            >
              立即登录
            </Link>
          </div>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-accent/50 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground">
              💡 <strong>注册说明：</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>• 注册后可跨设备同步数据</li>
              <li>• 邮箱用于登录和找回密码</li>
              <li>• 密码将加密存储，请妥善保管</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

