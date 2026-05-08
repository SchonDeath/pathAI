# Rebuild base academica 2026

## Objetivo

Reconstruir la capa academica de la base desde cero usando los 7 JSON normalizados de `convertidor/scripts/resultado_json`, sin perder las tablas de producto y sesion.

La migracion base para esto es:

- `supabase/migrations/20260507000000_rebuild_academic_schema_2026.sql`

## Que se conserva

Estas tablas no se botan porque representan producto, usuarios o telemetria:

- `auth.users`
- `public.users`
- `public.saved`
- `public.chat_messages`
- `public.discovery_sessions` si quieren conservar resultados historicos
- `public.plans`
- `public.institution_subscriptions`
- `public.intent_events`
- `public.ai_usage_events`

## Que se puede purgar sin dolor

- `public.chat_cache`
- `public.rate_limits`
- `public.discovery_sessions` si no necesitan resultados historicos

## Que se reconstruye completo

- `public.regions`
- `public.comunas`
- `public.institutions`
- `public.campuses`
- `public.career_generic`
- `public.programs`
- `public.program_admission_metrics`
- `public.program_finance_reference`
- `public.career_stats`
- `public.career_employability`

## Que se purga y luego se vuelve a poblar cuando corresponda

- `public.subjects`
- `public.program_curricula`
- `public.curriculum_subjects`
- `public.pending_curricula`

Estas tablas dependen del catalogo de programas. Si el catalogo se rehace, conviene regenerarlas luego para evitar mallas huérfanas o amarradas a un dataset anterior.

## Capa staging nueva

La migracion crea el esquema `staging` con una tabla de corridas y una tabla raw por JSON:

- `staging.resultado_json_runs`
- `staging.informacion_institucion_raw`
- `staging.oferta_academica_raw`
- `staging.buscar_carrera_raw`
- `staging.aranceles_referencia_2026_becas_raw`
- `staging.aranceles_referencia_2026_creditos_raw`
- `staging.buscar_empleabilidad_ingresos_raw`
- `staging.buscar_estadisticas_carrera_raw`

La regla operativa es:

1. Cargar primero staging sin perder payload.
2. Construir maestros.
3. Construir satelites.
4. Actualizar snapshots de lectura en `programs`.

## Orden recomendado de carga

1. `staging.resultado_json_runs`
2. `staging.informacion_institucion_raw`
3. `staging.oferta_academica_raw`
4. `staging.buscar_carrera_raw`
5. `staging.aranceles_referencia_2026_becas_raw`
6. `staging.aranceles_referencia_2026_creditos_raw`
7. `staging.buscar_estadisticas_carrera_raw`
8. `staging.buscar_empleabilidad_ingresos_raw`
9. `public.regions`
10. `public.comunas`
11. `public.institutions`
12. `public.campuses`
13. `public.career_generic`
14. `public.programs`
15. `public.program_admission_metrics`
16. `public.program_finance_reference`
17. `public.career_stats`
18. `public.career_employability`

## Llaves de negocio que deben mantenerse estables

- `institutions.institution_code`
- `programs.program_unique_code`
- `career_generic.slug` o `career_generic.id` derivado de nombre normalizado

Estas llaves permiten rescatar bien:

- favoritos guardados en `saved`
- historiales y eventos de intencion
- suscripciones por institucion

## Como quedan las relaciones

- `campuses.institution_code -> institutions.institution_code`
- `programs.institution_code -> institutions.institution_code`
- `programs.campus_id -> campuses.id`
- `programs.career_generic_id -> career_generic.id`
- `program_admission_metrics.program_unique_code -> programs.program_unique_code`
- `program_finance_reference.program_unique_code -> programs.program_unique_code`
- `career_stats.career_generic_id -> career_generic.id`
- `career_employability.career_generic_id -> career_generic.id`

## Decisiones clave del rebuild

### 1. `programs` queda como tabla de lectura principal

Aunque el modelo nuevo separa responsabilidades en satelites, `programs` mantiene columnas de lectura frecuente como snapshots compatibles:

- `nombre_institucion`
- `nombre_sede`
- `tipo_institucion`
- `arancel_referencia_becas`
- `puntaje_corte_ultimo`

Esto permite transicionar sin romper todas las consultas del backend de una sola vez.

### 2. Las tablas de producto quedan desacopladas por un rato

La migracion suelta las FK academicas de `saved`, `intent_events` e `institution_subscriptions` para no perder datos durante el rebuild.

Despues de cargar el nuevo catalogo, se puede validar y volver a endurecer la integridad si quieren.

### 3. `career_stats` y `career_employability` se mantienen como tablas separadas

No conviene fusionarlas porque vienen de granos distintos:

- `career_stats`: agregado por carrera generica + area + tipo institucion
- `career_employability`: resultados por institucion + carrera generica

## Validaciones minimas post carga

### Programas sin institucion

```sql
select count(*)
from public.programs
where institution_code is null;
```

### Programas sin sede

```sql
select count(*)
from public.programs
where campus_id is null;
```

### Programas sin carrera generica

```sql
select count(*)
from public.programs
where career_generic_id is null;
```

### Favoritos que ya pueden volver a cruzar por programa

```sql
select count(*)
from public.saved s
join public.programs p
  on p.program_unique_code = s.program_unique_code;
```

### Suscripciones que vuelven a cruzar por institucion

```sql
select count(*)
from public.institution_subscriptions s
join public.institutions i
  on i.institution_code = s.institution_code;
```

## Siguiente paso tecnico

Despues de aplicar la migracion, faltan dos piezas para cerrar el rebuild:

1. Reescribir el importador para poblar staging y luego maestros/satelites.
2. Ajustar endpoints y scripts que todavia escriben directo sobre el modelo viejo.

La estructura nueva ya deja el terreno listo para eso.