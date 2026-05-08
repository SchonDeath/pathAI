# Que Significa "Absorbida" y Cuando Crear un Baseline Nuevo

## Que Significa "Absorbida"

Una migracion esta "absorbida" cuando una migracion mas nueva ya recrea la misma responsabilidad dentro de un esquema mas completo.

Ejemplo en este proyecto:

- `20260422000000_mineduc_datasets.sql` creaba la base academica vieja.
- `20260507000000_rebuild_academic_schema_2026.sql` vuelve a crear esa capa academica completa con otro modelo.

Entonces la vieja queda "absorbida" por la nueva.

## Lo Que NO Significa

Que una migracion este absorbida NO significa:

- que haya que correr una SQL nueva ahora mismo sobre tu base actual
- que debas borrar archivos viejos del repo de inmediato
- que debas eliminar registros de la tabla de migraciones en Supabase

## Tu Estado Actual

Tu base actual ya esta en el estado correcto porque ya hiciste:

1. rebuild academico
2. importacion 2026
3. embeddings
4. build exitoso con Node 22.16.0

Por eso, para la base actual, no tienes que correr otra SQL solo para "limpiar migraciones".

## Cuando SI Se Crea una SQL Nueva

Solo cuando quieras dejar un historial limpio para futuras bases nuevas.

Eso se hace creando una migracion baseline nueva que ya incluya lo necesario sin depender del historial viejo.

Esa baseline nueva se usa para:

- recrear una base vacia desde cero
- dejar menos migraciones historicas
- simplificar onboarding y futuros resets

## Flujo Correcto

El flujo seguro es este:

1. definir el baseline nuevo en archivos del repo
2. probar ese baseline en una base vacia
3. confirmar que crea producto, seguridad, chat y capa academica nueva
4. solo despues decidir si las migraciones historicas absorbidas se quitan del repo o se mueven fuera del baseline principal

## Lo Que Debes Hacer Ahora

Ahora mismo no debes borrar migraciones viejas una por una ni correr otra SQL sobre la base actual para eso.

Lo que si corresponde es preparar el baseline nuevo como propuesta de repo.

## Baseline Nuevo Recomendado

Si mas adelante haces un baseline real, este deberia consolidar en este orden conceptual:

1. `20260409234742_create_discovery_sessions.sql`
2. `20260420000000_new_architecture.sql`
3. `20260426000000_chat_messages.sql`
4. `20260426010000_chat_session_id.sql`
5. `20260507000000_rebuild_academic_schema_2026.sql`
6. `20260423000000_featured_priority.sql`
7. `20260423100000_vector_embeddings.sql`
8. `20260423110000_chat_cache.sql`
9. `20260424000000_admin_and_plans.sql`
10. `20260424100000_user_preferences.sql`
11. `20260425000000_user_profile_extra.sql`
12. `20260427000000_saved_program_code.sql`
13. `20260428000000_hardening_fase3.sql`
14. `20260428000000_institution_logos.sql`
15. `20260502000000_ai_usage_events.sql`
16. `20260506000000_program_saved_snapshots_and_intent_events.sql`
17. `20260506010000_security_and_chat_session_hardening.sql`
18. `20260506020000_supabase_advisor_cleanup.sql`
19. `20260506030000_lock_discovery_sessions.sql`

## Que Quedaria Fuera Del Baseline Nuevo

Estas son las candidatas mas claras a quedar fuera del baseline futuro porque su capa academica ya fue reemplazada:

- `20260422000000_mineduc_datasets.sql`
- `20260422120000_mineduc_fixes.sql`
- `20260424200000_aranceles_referencia.sql`

## Importante

`20260424210000_fn_bulk_update_aranceles.sql` no debe marcarse como absorbida aun, porque la funcion `bulk_update_aranceles` sigue existiendo y todavia hay scripts del repo que la usan.

`20260427000000_saved_program_code.sql` tampoco debe marcarse como absorbida completa, porque la `20260507000000` no reemplaza todas sus constraints sobre `saved`.