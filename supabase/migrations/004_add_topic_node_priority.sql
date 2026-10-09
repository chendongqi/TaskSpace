-- =====================================================
-- TaskSpace - 课题拆解树：新增优先级字段 (P0-P3)
-- =====================================================
-- 此脚本可重复执行（幂等性）
-- 手动执行：
--   docker exec -i supabase-postgres psql -U postgres -d postgres < supabase/migrations/004_add_topic_node_priority.sql

BEGIN;

ALTER TABLE public.ts_topic_nodes
    ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3'));

COMMENT ON COLUMN public.ts_topic_nodes.priority IS '优先级：P0(最高)~P3(最低)，与任务/目标系统保持一致，可为空表示无优先级';

COMMIT;

-- =====================================================
-- 验证创建
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TaskSpace 课题拆解树优先级字段迁移完成';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ priority 已添加 (P0/P1/P2/P3/NULL)';
    RAISE NOTICE '========================================';
END $$;
