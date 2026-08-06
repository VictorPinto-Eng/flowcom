-- ============================================================
-- Migration: Tornar created_by, moduser e dtmod OBRIGATORIOS com defaults
-- Data: 2026-08-06
-- Descricao: Garante que todo card sempre registra quem criou,
--            quem modificou e quando. Default: 1 (sistema) e NOW().
-- ============================================================

BEGIN;

-- 1. Preencher registros existentes que estao NULL:
UPDATE card SET created_by = 1 WHERE created_by IS NULL;
UPDATE card SET moduser = 1 WHERE moduser IS NULL;
UPDATE card SET dtmod = created_at WHERE dtmod IS NULL;

-- 2. Aplicar constraints NOT NULL com defaults:
ALTER TABLE public.card
  ALTER COLUMN created_by SET DEFAULT 1,
  ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE public.card
  ALTER COLUMN moduser SET DEFAULT 1,
  ALTER COLUMN moduser SET NOT NULL;

ALTER TABLE public.card
  ALTER COLUMN dtmod SET DEFAULT NOW(),
  ALTER COLUMN dtmod SET NOT NULL;

COMMIT;
