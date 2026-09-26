-- ============================================================
-- Migration: Ampliar CHECK auth_attempts_type_check
-- Data: 2026-09-26
-- Descricao: A tabela auth_attempts foi criada manualmente com
--            CHECK (type IN ('LOGIN','REGISTER','FORGOT_PASSWORD','RESET_PASSWORD')).
--            O rate-limit.ts evoluiu para 10 tipos (S-021/S-030), e todo insert
--            de um tipo novo (VERIFY_EMAIL, RESEND_ACTIVATION, ACCEPT_INVITE,
--            REQUEST_TRANSFER, RESPOND_TRANSFER, TEST_EMAIL) falhava com:
--            new row for relation "auth_attempts" violates check constraint
--            "auth_attempts_type_check"
--            Ref: S-021, S-030
-- ============================================================

BEGIN;

-- 1. Remove qualquer CHECK constraint existente sobre a coluna type:
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.auth_attempts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ~ '\mtype\M'
  LOOP
    EXECUTE format('ALTER TABLE public.auth_attempts DROP CONSTRAINT %I', c.conname);
    RAISE NOTICE 'Constraint removida: %', c.conname;
  END LOOP;
END $$;

-- 2. Recria o CHECK com os 10 tipos suportados por RATE_LIMIT_CONFIG:
ALTER TABLE public.auth_attempts
  ADD CONSTRAINT auth_attempts_type_check
  CHECK (type IN (
    'LOGIN',
    'REGISTER',
    'FORGOT_PASSWORD',
    'RESET_PASSWORD',
    'VERIFY_EMAIL',
    'RESEND_ACTIVATION',
    'ACCEPT_INVITE',
    'REQUEST_TRANSFER',
    'RESPOND_TRANSFER',
    'TEST_EMAIL'
  ));

-- 3. Limpa tentativas com tipos orfaos (fora da lista acima):
DELETE FROM public.auth_attempts
WHERE type NOT IN (
  'LOGIN', 'REGISTER', 'FORGOT_PASSWORD', 'RESET_PASSWORD',
  'VERIFY_EMAIL', 'RESEND_ACTIVATION', 'ACCEPT_INVITE',
  'REQUEST_TRANSFER', 'RESPOND_TRANSFER', 'TEST_EMAIL'
);

COMMIT;

-- Verificacao:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.auth_attempts'::regclass AND contype = 'c';
