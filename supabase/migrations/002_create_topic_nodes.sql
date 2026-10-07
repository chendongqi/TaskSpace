-- =====================================================
-- TaskSpace - 技术课题拆解树 迁移脚本
-- =====================================================
-- 此脚本可重复执行（幂等性）
-- 手动执行：
--   docker exec -i supabase-postgres psql -U postgres -d postgres < supabase/migrations/002_create_topic_nodes.sql
--
-- 独立功能：不与 ts_tasks/ts_goals 等现有业务表关联。
-- 复用 001_create_tables.sql 中定义的 public.update_updated_at_column() 触发器函数。

BEGIN;

-- =====================================================
-- 1. 技术课题拆解树节点表 (ts_topic_nodes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ts_topic_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.ts_topic_nodes(id) ON DELETE CASCADE,
    topic_root_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    progress NUMERIC NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.ts_topic_nodes IS 'TaskSpace 技术课题拆解树节点（任意深度；topic_root_id 标记所属课题树，根节点 topic_root_id = 自身 id）';
COMMENT ON COLUMN public.ts_topic_nodes.topic_root_id IS '所属课题树根节点 id，根节点本身该值等于自己的 id，用于按课题树整体拉取/过滤';
COMMENT ON COLUMN public.ts_topic_nodes.progress IS '叶子节点手动设置（由 status 推导：done=100/in_progress=50/todo=0），父节点由子节点递归汇总，不在数据库层强制';

CREATE INDEX IF NOT EXISTS ts_topic_nodes_user_id_idx ON public.ts_topic_nodes(user_id);
CREATE INDEX IF NOT EXISTS ts_topic_nodes_updated_at_idx ON public.ts_topic_nodes(updated_at);
CREATE INDEX IF NOT EXISTS ts_topic_nodes_parent_id_idx ON public.ts_topic_nodes(parent_id);
CREATE INDEX IF NOT EXISTS ts_topic_nodes_topic_root_id_idx ON public.ts_topic_nodes(topic_root_id);

DROP TRIGGER IF EXISTS update_ts_topic_nodes_updated_at ON public.ts_topic_nodes;
CREATE TRIGGER update_ts_topic_nodes_updated_at
    BEFORE UPDATE ON public.ts_topic_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.ts_topic_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own ts_topic_nodes" ON public.ts_topic_nodes;
CREATE POLICY "Users can select own ts_topic_nodes" ON public.ts_topic_nodes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ts_topic_nodes" ON public.ts_topic_nodes;
CREATE POLICY "Users can insert own ts_topic_nodes" ON public.ts_topic_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ts_topic_nodes" ON public.ts_topic_nodes;
CREATE POLICY "Users can update own ts_topic_nodes" ON public.ts_topic_nodes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own ts_topic_nodes" ON public.ts_topic_nodes;
CREATE POLICY "Users can delete own ts_topic_nodes" ON public.ts_topic_nodes FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. 授予权限
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.ts_topic_nodes TO authenticated;

GRANT ALL ON public.ts_topic_nodes TO service_role;

COMMIT;

-- =====================================================
-- 验证创建
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TaskSpace 技术课题拆解树表迁移完成';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ ts_topic_nodes 已创建';
    RAISE NOTICE '✓ RLS 策略已配置';
    RAISE NOTICE '========================================';
END $$;
