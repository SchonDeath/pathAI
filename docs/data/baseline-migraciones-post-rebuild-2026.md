# Baseline de Migraciones Post Rebuild 2026

Este documento fija el baseline recomendado despues de aplicar la reconstruccion academica de 2026.

## Objetivo

- Mantener como baseline vivo las migraciones de producto, seguridad, sesiones y chat.
- Tratar la capa academica previa como absorbida por la reconstruccion 2026.
- Evitar borrar migraciones historicas una por una sin rehacer primero un baseline nuevo.

## Migracion Academica Canonica

- `20260507000000_rebuild_academic_schema_2026.sql`
- `20260507010000_post_rebuild_academic_compat.sql`

Estas migraciones pasan a ser la fuente principal de verdad para:

- `regions`
- `comunas`
- `institutions`
- `campuses`
- `career_generic`
- `programs`
- `program_admission_metrics`
- `program_finance_reference`
- `career_stats`
- `career_employability`
- `staging.*`
- vistas `programs_current` y `v_program_full`
- columnas `is_featured`, `priority`, `featured_until` y `embedding` en `programs`
- columnas `is_featured`, `priority`, `featured_until`, `logo_url` y `embedding` en `institutions`
- columna `embedding` en `career_generic`
- funcion `search_hybrid`
- indice `idx_emp_inst_generic`

## Migraciones Academicas Absorbidas

Estas quedaron historicas porque su responsabilidad academica ya fue reimplementada o reemplazada por la pareja `20260507000000` + `20260507010000`:

- `20260422000000_mineduc_datasets.sql`
- `20260422120000_mineduc_fixes.sql`
- `20260424200000_aranceles_referencia.sql`
- `20260423000000_featured_priority.sql`
- `20260423100000_vector_embeddings.sql`
- `20260428000000_institution_logos.sql`

## Migraciones Parcialmente Absorbidas Pero Aun Vivas

Estas no deben marcarse como eliminables todavia porque una parte de su responsabilidad sigue activa fuera de la reconstruccion academica:

- `20260424210000_fn_bulk_update_aranceles.sql`
- `20260427000000_saved_program_code.sql`
- `20260428000000_hardening_fase3.sql`

## Migraciones Que No Se Deben Tocar Aun

Estas no deben eliminarse ni consolidarse dentro de la academica porque siguen cubriendo producto, auth, seguridad, sesiones, cache o features no absorbidas por la reconstruccion:

- `20260409234742_create_discovery_sessions.sql`
- `20260420000000_new_architecture.sql`
- `20260423110000_chat_cache.sql`
- `20260424000000_admin_and_plans.sql`
- `20260424100000_user_preferences.sql`
- `20260425000000_user_profile_extra.sql`
- `20260426000000_chat_messages.sql`
- `20260426010000_chat_session_id.sql`
- `20260502000000_ai_usage_events.sql`
- `20260506000000_program_saved_snapshots_and_intent_events.sql`
- `20260506010000_security_and_chat_session_hardening.sql`
- `20260506020000_supabase_advisor_cleanup.sql`
- `20260506030000_lock_discovery_sessions.sql`

## Nota Especial Sobre intent_events

La migracion `20260506000000_program_saved_snapshots_and_intent_events.sql` no debe borrarse mientras no exista una nueva migracion base que recree explicitamente:

- tabla `intent_events`
- indices de `intent_events`
- policy de lectura propia

La `20260507000000_rebuild_academic_schema_2026.sql` preserva compatibilidad con `saved`, pero no reemplaza la creacion completa de `intent_events`.

## Baseline Nuevo Recomendado

Si en el futuro se quiere dejar el historial limpio, el baseline nuevo deberia quedar asi:

1. Base producto y auth
2. Chat, cache, embeddings, admin y preferencias
3. Seguridad y sesiones
4. `20260507000000_rebuild_academic_schema_2026.sql` + `20260507010000_post_rebuild_academic_compat.sql` como base academica completa

## Regla Operativa

Antes de borrar migraciones del historial:

1. crear una migracion baseline nueva que absorba las historicas
2. validar recreacion completa en una base vacia
3. solo despues remover o mover las migraciones historicas absorbidas

Mientras eso no exista, las migraciones listadas en "Migraciones Academicas Absorbidas" deben considerarse historicas, pero no borrarse del historial del repo a ciegas.