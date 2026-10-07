-- =====================================================
-- TaskSpace - 业务数据表迁移脚本
-- =====================================================
-- 此脚本可重复执行（幂等性）
-- 手动执行：
--   docker exec -i supabase-postgres psql -U postgres -d postgres < supabase/migrations/001_create_tables.sql
--
-- 设计原则：
--   - 使用 public schema + ts_ 前缀，不新建 schema（避免依赖未知的 Kong/PostgREST schema 暴露配置）
--   - 删除 = 软删除（deleted_at 墓碑），服务端为唯一真相源
--   - 复用 auth.users，RLS 按 auth.uid() = user_id 隔离

BEGIN;

-- =====================================================
-- 0. 检查前置条件
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'auth' AND tablename = 'users'
    ) THEN
        RAISE EXCEPTION '❌ auth.users 表不存在，请先启动 Auth 服务并等待其完成初始化';
    END IF;
    RAISE NOTICE '✓ auth.users 表已存在，继续迁移...';
END $$;

-- =====================================================
-- 1. 通用触发器函数：自动更新 updated_at 字段
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. 标签表 (ts_tags)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.ts_tags IS 'TaskSpace 自定义标签';

CREATE INDEX IF NOT EXISTS ts_tags_user_id_idx ON public.ts_tags(user_id);
CREATE INDEX IF NOT EXISTS ts_tags_updated_at_idx ON public.ts_tags(updated_at);
-- 删除后可重建同名标签：仅在未删除记录间保证同名唯一
CREATE UNIQUE INDEX IF NOT EXISTS ts_tags_user_name_unique
    ON public.ts_tags(user_id, lower(name)) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS update_ts_tags_updated_at ON public.ts_tags;
CREATE TRIGGER update_ts_tags_updated_at
    BEFORE UPDATE ON public.ts_tags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. 目标表 (ts_goals) —— 年度/季度/周目标合一
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('yearly', 'quarterly', 'weekly')),
    parent_goal_id UUID REFERENCES public.ts_goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    week INTEGER CHECK (week BETWEEN 1 AND 53),
    weight NUMERIC,
    progress NUMERIC NOT NULL DEFAULT 0,
    auto_calculated BOOLEAN NOT NULL DEFAULT FALSE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    tag_id UUID REFERENCES public.ts_tags(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.ts_goals IS 'TaskSpace 年度/季度/周目标（goal_type 区分，parent_goal_id 自引用关联）';

CREATE INDEX IF NOT EXISTS ts_goals_user_id_idx ON public.ts_goals(user_id);
CREATE INDEX IF NOT EXISTS ts_goals_updated_at_idx ON public.ts_goals(updated_at);
CREATE INDEX IF NOT EXISTS ts_goals_parent_goal_id_idx ON public.ts_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS ts_goals_type_year_idx ON public.ts_goals(user_id, goal_type, year);

DROP TRIGGER IF EXISTS update_ts_goals_updated_at ON public.ts_goals;
CREATE TRIGGER update_ts_goals_updated_at
    BEFORE UPDATE ON public.ts_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. 习惯表 (ts_habits)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tag_id UUID REFERENCES public.ts_tags(id) ON DELETE SET NULL,
    priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    yearly_goal_id UUID REFERENCES public.ts_goals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.ts_habits IS 'TaskSpace 习惯';

CREATE INDEX IF NOT EXISTS ts_habits_user_id_idx ON public.ts_habits(user_id);
CREATE INDEX IF NOT EXISTS ts_habits_updated_at_idx ON public.ts_habits(updated_at);

DROP TRIGGER IF EXISTS update_ts_habits_updated_at ON public.ts_habits;
CREATE TRIGGER update_ts_habits_updated_at
    BEFORE UPDATE ON public.ts_habits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. 习惯打卡记录表 (ts_habit_completions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES public.ts_habits(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.ts_habit_completions IS 'TaskSpace 习惯打卡记录（取消打卡=软删除该行，取代原数组只增不减问题）';

CREATE INDEX IF NOT EXISTS ts_habit_completions_user_id_idx ON public.ts_habit_completions(user_id);
CREATE INDEX IF NOT EXISTS ts_habit_completions_updated_at_idx ON public.ts_habit_completions(updated_at);
CREATE INDEX IF NOT EXISTS ts_habit_completions_habit_id_idx ON public.ts_habit_completions(habit_id);
-- 同一习惯同一天只允许一条有效（未删除）打卡记录
CREATE UNIQUE INDEX IF NOT EXISTS ts_habit_completions_unique
    ON public.ts_habit_completions(habit_id, completed_date) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS update_ts_habit_completions_updated_at ON public.ts_habit_completions;
CREATE TRIGGER update_ts_habit_completions_updated_at
    BEFORE UPDATE ON public.ts_habit_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. 任务表 (ts_tasks) —— daily + backlog 合一
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.ts_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_date DATE,
    time_spent INTEGER NOT NULL DEFAULT 0,
    focus_time INTEGER NOT NULL DEFAULT 0,
    priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    tag_id UUID REFERENCES public.ts_tags(id) ON DELETE SET NULL,
    is_habit BOOLEAN NOT NULL DEFAULT FALSE,
    habit_id UUID REFERENCES public.ts_habits(id) ON DELETE SET NULL,
    weekly_goal_id UUID REFERENCES public.ts_goals(id) ON DELETE SET NULL,
    subtasks_expanded BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.ts_tasks IS 'TaskSpace 任务（scheduled_date 为 NULL 表示 backlog；parent_id 自引用子任务）';

CREATE INDEX IF NOT EXISTS ts_tasks_user_id_idx ON public.ts_tasks(user_id);
CREATE INDEX IF NOT EXISTS ts_tasks_updated_at_idx ON public.ts_tasks(updated_at);
CREATE INDEX IF NOT EXISTS ts_tasks_parent_id_idx ON public.ts_tasks(parent_id);
CREATE INDEX IF NOT EXISTS ts_tasks_scheduled_date_idx ON public.ts_tasks(user_id, scheduled_date);

DROP TRIGGER IF EXISTS update_ts_tasks_updated_at ON public.ts_tasks;
CREATE TRIGGER update_ts_tasks_updated_at
    BEFORE UPDATE ON public.ts_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. 用户设置表 (ts_user_settings) —— 无需墓碑，纯 upsert
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
    theme TEXT NOT NULL DEFAULT 'default',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ts_user_settings IS 'TaskSpace 用户设置（主题、深色模式等）';

DROP TRIGGER IF EXISTS update_ts_user_settings_updated_at ON public.ts_user_settings;
CREATE TRIGGER update_ts_user_settings_updated_at
    BEFORE UPDATE ON public.ts_user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.ts_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_user_settings ENABLE ROW LEVEL SECURITY;

-- ts_tags policies
DROP POLICY IF EXISTS "Users can select own ts_tags" ON public.ts_tags;
CREATE POLICY "Users can select own ts_tags" ON public.ts_tags FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_tags" ON public.ts_tags;
CREATE POLICY "Users can insert own ts_tags" ON public.ts_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_tags" ON public.ts_tags;
CREATE POLICY "Users can update own ts_tags" ON public.ts_tags FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_tags" ON public.ts_tags;
CREATE POLICY "Users can delete own ts_tags" ON public.ts_tags FOR DELETE USING (auth.uid() = user_id);

-- ts_goals policies
DROP POLICY IF EXISTS "Users can select own ts_goals" ON public.ts_goals;
CREATE POLICY "Users can select own ts_goals" ON public.ts_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_goals" ON public.ts_goals;
CREATE POLICY "Users can insert own ts_goals" ON public.ts_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_goals" ON public.ts_goals;
CREATE POLICY "Users can update own ts_goals" ON public.ts_goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_goals" ON public.ts_goals;
CREATE POLICY "Users can delete own ts_goals" ON public.ts_goals FOR DELETE USING (auth.uid() = user_id);

-- ts_habits policies
DROP POLICY IF EXISTS "Users can select own ts_habits" ON public.ts_habits;
CREATE POLICY "Users can select own ts_habits" ON public.ts_habits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_habits" ON public.ts_habits;
CREATE POLICY "Users can insert own ts_habits" ON public.ts_habits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_habits" ON public.ts_habits;
CREATE POLICY "Users can update own ts_habits" ON public.ts_habits FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_habits" ON public.ts_habits;
CREATE POLICY "Users can delete own ts_habits" ON public.ts_habits FOR DELETE USING (auth.uid() = user_id);

-- ts_habit_completions policies
DROP POLICY IF EXISTS "Users can select own ts_habit_completions" ON public.ts_habit_completions;
CREATE POLICY "Users can select own ts_habit_completions" ON public.ts_habit_completions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_habit_completions" ON public.ts_habit_completions;
CREATE POLICY "Users can insert own ts_habit_completions" ON public.ts_habit_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_habit_completions" ON public.ts_habit_completions;
CREATE POLICY "Users can update own ts_habit_completions" ON public.ts_habit_completions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_habit_completions" ON public.ts_habit_completions;
CREATE POLICY "Users can delete own ts_habit_completions" ON public.ts_habit_completions FOR DELETE USING (auth.uid() = user_id);

-- ts_tasks policies
DROP POLICY IF EXISTS "Users can select own ts_tasks" ON public.ts_tasks;
CREATE POLICY "Users can select own ts_tasks" ON public.ts_tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_tasks" ON public.ts_tasks;
CREATE POLICY "Users can insert own ts_tasks" ON public.ts_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_tasks" ON public.ts_tasks;
CREATE POLICY "Users can update own ts_tasks" ON public.ts_tasks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_tasks" ON public.ts_tasks;
CREATE POLICY "Users can delete own ts_tasks" ON public.ts_tasks FOR DELETE USING (auth.uid() = user_id);

-- ts_user_settings policies
DROP POLICY IF EXISTS "Users can select own ts_user_settings" ON public.ts_user_settings;
CREATE POLICY "Users can select own ts_user_settings" ON public.ts_user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_user_settings" ON public.ts_user_settings;
CREATE POLICY "Users can insert own ts_user_settings" ON public.ts_user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_user_settings" ON public.ts_user_settings;
CREATE POLICY "Users can update own ts_user_settings" ON public.ts_user_settings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_user_settings" ON public.ts_user_settings;
CREATE POLICY "Users can delete own ts_user_settings" ON public.ts_user_settings FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 9. 授予权限
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.ts_tags TO authenticated;
GRANT ALL ON public.ts_goals TO authenticated;
GRANT ALL ON public.ts_habits TO authenticated;
GRANT ALL ON public.ts_habit_completions TO authenticated;
GRANT ALL ON public.ts_tasks TO authenticated;
GRANT ALL ON public.ts_user_settings TO authenticated;

GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON public.ts_tags TO service_role;
GRANT ALL ON public.ts_goals TO service_role;
GRANT ALL ON public.ts_habits TO service_role;
GRANT ALL ON public.ts_habit_completions TO service_role;
GRANT ALL ON public.ts_tasks TO service_role;
GRANT ALL ON public.ts_user_settings TO service_role;

COMMIT;

-- =====================================================
-- 验证创建
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TaskSpace 业务表迁移完成';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ ts_tags / ts_goals / ts_habits / ts_habit_completions / ts_tasks / ts_user_settings 已创建';
    RAISE NOTICE '✓ RLS 策略已配置';
    RAISE NOTICE '✓ updated_at 触发器已配置';
    RAISE NOTICE '========================================';
END $$;
