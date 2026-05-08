-- Baseline propuesto post rebuild 2026.
--
-- IMPORTANTE:
-- 1. Este archivo es una propuesta de consolidacion para una BASE VACIA.
-- 2. NO se debe ejecutar sobre la base actual ya migrada.
-- 3. Usa comandos \ir de psql; no sirve tal cual en el SQL Editor de Supabase.
-- 4. La idea es validar primero una recreacion limpia y solo despues decidir si se retiran migraciones historicas del repo.
--
-- Uso esperado:
--   psql <conexion> -f supabase/baseline/20260507_proposed_baseline.psql.sql
--
-- Orden consolidado recomendado.

\echo === 1. Sesiones y rate limits ===
\ir ../migrations/20260409234742_create_discovery_sessions.sql

\echo === 2. Base producto y auth ===
\ir ../migrations/20260420000000_new_architecture.sql
\ir ../migrations/20260426000000_chat_messages.sql
\ir ../migrations/20260426010000_chat_session_id.sql

\echo === 3. Base academica canonica 2026 ===
\ir ../migrations/20260507000000_rebuild_academic_schema_2026.sql
\ir ../migrations/20260507010000_post_rebuild_academic_compat.sql

\echo === 4. Enriquecimientos sobre capa academica y producto ===
\ir ../migrations/20260423110000_chat_cache.sql
\ir ../migrations/20260424000000_admin_and_plans.sql
\ir ../migrations/20260424100000_user_preferences.sql
\ir ../migrations/20260425000000_user_profile_extra.sql
\ir ../migrations/20260427000000_saved_program_code.sql
\ir ../migrations/20260428000000_hardening_fase3.sql
\ir ../migrations/20260502000000_ai_usage_events.sql
\ir ../migrations/20260506000000_program_saved_snapshots_and_intent_events.sql
\ir ../migrations/20260506010000_security_and_chat_session_hardening.sql
\ir ../migrations/20260506020000_supabase_advisor_cleanup.sql
\ir ../migrations/20260506030000_lock_discovery_sessions.sql

\echo === 5. Migraciones historicas que NO entran en este baseline ===
\echo 20260422000000_mineduc_datasets.sql
\echo 20260422120000_mineduc_fixes.sql
\echo 20260424200000_aranceles_referencia.sql
\echo 20260423000000_featured_priority.sql
\echo 20260423100000_vector_embeddings.sql
\echo 20260428000000_institution_logos.sql

-- Nota:
-- 20260424210000_fn_bulk_update_aranceles.sql queda fuera por ahora de esta propuesta
-- porque la funcion bulk_update_aranceles ya es redefinida y endurecida en
-- 20260506010000_security_and_chat_session_hardening.sql y luego ajustada en
-- 20260506020000_supabase_advisor_cleanup.sql.
--
-- Si mas adelante se elimina definitivamente cualquier script que llame a
-- bulk_update_aranceles, esta funcion podria integrarse directamente al baseline
-- final o retirarse por completo del flujo.
