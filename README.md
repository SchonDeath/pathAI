# KoraChile

Aplicacion Nuxt 3 para exploracion vocacional, ranking institucional y consulta de datos SIES/Mineduc.

## Requisitos

- Node 22.16.0
- npm
- Variables de entorno de Supabase en `.env`

Instalacion:

```bash
npm install
```

## Desarrollo

Servidor local:

```bash
npm run dev
```

En desarrollo, los embeddings del chat/RAG quedan desactivados por defecto para evitar que Nuxt cargue `@xenova/transformers` dentro del mismo runtime y consuma demasiada memoria.

Si necesitas probar retrieval semantico en local:

```bash
AI_EMBEDDINGS_ENABLED=1 npm run dev
```

En PowerShell:

```powershell
$env:AI_EMBEDDINGS_ENABLED='1'
npm run dev
```

## Flujo de datos 2026

El camino canonico actual es:

1. Aplicar [20260507000000_rebuild_academic_schema_2026.sql](supabase/migrations/20260507000000_rebuild_academic_schema_2026.sql).
2. Aplicar [20260507010000_post_rebuild_academic_compat.sql](supabase/migrations/20260507010000_post_rebuild_academic_compat.sql).
3. Ejecutar el refresh completo:

```bash
npm run data:refresh
```

Comandos disponibles:

```bash
npm run data:import-resultado-json-2026
npm run embeddings
npm run embeddings:institutions
npm run embeddings:careers
npm run embeddings:programs
npm run embeddings:reset
```

Documentacion relacionada:

- [docs/data/README.md](docs/data/README.md)
- [docs/data/matriz-normalizacion-json-2026.md](docs/data/matriz-normalizacion-json-2026.md)
- [docs/data/rebuild-base-academica-2026.md](docs/data/rebuild-base-academica-2026.md)
- [docs/data/baseline-migraciones-post-rebuild-2026.md](docs/data/baseline-migraciones-post-rebuild-2026.md)

## Limpieza local

Para borrar artefactos regenerables del workspace:

```bash
npm run clean
```

Eso elimina `.nuxt`, `.output`, `.vercel/output` y caches locales.

## Build

```bash
npm run build
npm run preview
```
