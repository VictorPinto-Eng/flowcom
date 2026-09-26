-- Verificacao de integridade estrutural (mesmos checks do /admin/diagnostics)
-- Rodar manualmente no psql do servidor ANTES do deploy:
--   docker exec -i floxie-postgres-1 psql -U floxie_admin -d floxie < scripts/check-structure.sql
-- Cada SELECT devolve 1 linha com a coluna "c" (contagem esperada: 0 na maioria).

-- 1. Sessions expiradas sem cleanup (cleanupExpiredSessions nunca e chamada)
SELECT 'expired_sessions' AS check, (SELECT count(*) FROM session WHERE expires_at < now())::int AS c;

-- 2. Verification tokens vencidos
SELECT 'expired_tokens' AS check, (SELECT count(*) FROM verification_tokens WHERE expires < now())::int AS c;

-- 3. Convites de workspace vencidos
SELECT 'expired_invites' AS check, (SELECT count(*) FROM workspace_invite WHERE expires_at < now())::int AS c;

-- 4. ActivityLog apontando para usuario inexistente (sem FK - ROADMAP M-006)
SELECT 'orphan_activity_user' AS check,
       (SELECT count(*) FROM activity_log al
         WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.seqid::text = al.user_id))::int AS c;

-- 5. ActivityLog apontando para board inexistente
SELECT 'orphan_activity_board' AS check,
       (SELECT count(*) FROM activity_log al
         WHERE NOT EXISTS (SELECT 1 FROM board b WHERE b.seqid::text = al.board_id))::int AS c;

-- 6. IPs com 10+ tentativas de LOGIN (possivel forca bruta)
SELECT 'brute_force_ips' AS check,
       (SELECT count(*) FROM auth_attempts WHERE type = 'LOGIN' AND count >= 10)::int AS c;

-- 7. Total de auth_attempts (cresce sem expurgo)
SELECT 'auth_attempts_total' AS check, (SELECT count(*) FROM auth_attempts)::int AS c;

-- 8. Boards sem nenhuma coluna (nao renderizam)
SELECT 'boards_without_columns' AS check,
       (SELECT count(*) FROM board b
         WHERE NOT EXISTS (SELECT 1 FROM workspace_column c WHERE c.workspace_seqid = b.workspace_id))::int AS c;

-- 9. Cards apontando para coluna inexistente
SELECT 'cards_orphan_column' AS check,
       (SELECT count(*) FROM card c
         WHERE c.column_id NOT IN (SELECT seqid FROM workspace_column))::int AS c;

-- 10. Cards em coluna de OUTRO workspace (risco de vazamento entre workspaces)
SELECT 'cards_cross_workspace' AS check,
       (SELECT count(*) FROM card c
          JOIN workspace_column col ON col.seqid = c.column_id
          JOIN board b ON b.seqid = c.board_seqid
         WHERE col.workspace_seqid <> b.workspace_id)::int AS c;

-- 11. Sessoes de usuarios nao ativados (active = false)
SELECT 'sessions_unactivated_users' AS check,
       (SELECT count(*) FROM session s JOIN users u ON u.seqid = s.user_seqid WHERE NOT u.active)::int AS c;

-- 12. Boards com workspace inexistente
SELECT 'boards_orphan_workspace' AS check,
       (SELECT count(*) FROM board b WHERE b.workspace_id NOT IN (SELECT seqid FROM workspace))::int AS c;

-- 13. Workspaces com tipo inexistente
SELECT 'workspaces_orphan_type' AS check,
       (SELECT count(*) FROM workspace w WHERE w.type_id NOT IN (SELECT id FROM workspace_type))::int AS c;
