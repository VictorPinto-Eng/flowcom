-- ============================================================
-- Migration: Tornar card.board_seqid OBRIGATÓRIO
-- Data: 2026-08-06
-- Descrição: Reforça integridade referencial. Após validação,
--            não existem cards com board_seqid = NULL.
-- ============================================================

BEGIN;

-- 1. Verificação de segurança (deve retornar 0):
SELECT COUNT(*) AS cards_sem_board FROM card WHERE board_seqid IS NULL;

-- 2. Aplicar constraint NOT NULL:
ALTER TABLE public.card
  ALTER COLUMN board_seqid SET NOT NULL;

-- 3. Confirmar que a FK existe (deve listar a constraint board_seqid_fkey):
SELECT conname FROM pg_constraint WHERE conrelid = 'public.card'::regclass AND contype = 'f' AND conname LIKE '%board_seqid%';

COMMIT;
