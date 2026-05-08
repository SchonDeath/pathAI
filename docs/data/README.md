# Documentacion de Datos 2026

Esta carpeta agrupa la documentacion operativa del rebuild academico 2026 y del baseline posterior.

## Guías principales

- [matriz-normalizacion-json-2026.md](docs/data/matriz-normalizacion-json-2026.md): ownership de campos y criterio de normalizacion de los 7 JSON fuente.
- [rebuild-base-academica-2026.md](docs/data/rebuild-base-academica-2026.md): reconstruccion de la capa academica, staging, maestros y satelites.
- [baseline-migraciones-post-rebuild-2026.md](docs/data/baseline-migraciones-post-rebuild-2026.md): que migraciones siguen vivas y cuales quedaron absorbidas.
- [explicacion-absorbida-y-baseline-2026.md](docs/data/explicacion-absorbida-y-baseline-2026.md): significado operativo de absorbida y como pensar el baseline nuevo.

## Flujo canonico actual

1. Aplicar [20260507000000_rebuild_academic_schema_2026.sql](supabase/migrations/20260507000000_rebuild_academic_schema_2026.sql).
2. Aplicar [20260507010000_post_rebuild_academic_compat.sql](supabase/migrations/20260507010000_post_rebuild_academic_compat.sql).
3. Ejecutar `npm run data:refresh` para cargar tablas publicas y regenerar embeddings.
4. Validar con `npm run build`.