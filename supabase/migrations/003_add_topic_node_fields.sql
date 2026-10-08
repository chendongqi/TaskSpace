-- =====================================================
-- TaskSpace - 技术课题拆解树：预留字段（责任人/计划时间/依赖/备注）
-- =====================================================
-- 此脚本可重复执行（幂等性）
-- 手动执行：
--   docker exec -i supabase-postgres psql -U postgres -d postgres < supabase/migrations/003_add_topic_node_fields.sql
--
-- 新增字段仅为预留，当前不接前端 UI，一次性加好，后续批量导入直接写这些列。

BEGIN;

ALTER TABLE public.ts_topic_nodes
    ADD COLUMN IF NOT EXISTS assignee TEXT,
    ADD COLUMN IF NOT EXISTS planned_start DATE,
    ADD COLUMN IF NOT EXISTS planned_end DATE,
    ADD COLUMN IF NOT EXISTS depends_on UUID[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS comment TEXT;

COMMENT ON COLUMN public.ts_topic_nodes.assignee IS '责任人，自由文本，不关联用户体系';
COMMENT ON COLUMN public.ts_topic_nodes.planned_start IS '计划开始日期';
COMMENT ON COLUMN public.ts_topic_nodes.planned_end IS '计划结束日期';
COMMENT ON COLUMN public.ts_topic_nodes.depends_on IS '依赖的其他节点 id 列表（同一棵或跨课题树均可），不做外键约束，软删除节点不会级联清理此处引用';
COMMENT ON COLUMN public.ts_topic_nodes.comment IS '备注/评论';

-- 支持按「某节点被哪些节点依赖」反查（depends_on && ARRAY[id]）
CREATE INDEX IF NOT EXISTS ts_topic_nodes_depends_on_idx ON public.ts_topic_nodes USING GIN (depends_on);

COMMIT;

-- =====================================================
-- 验证创建
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TaskSpace 课题拆解树预留字段迁移完成';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ assignee / planned_start / planned_end / depends_on / comment 已添加';
    RAISE NOTICE '========================================';
END $$;
