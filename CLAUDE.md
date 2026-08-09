# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

KoraChile — app Nuxt 4 (Vue 3 + TypeScript) de exploración vocacional para Chile: ranking de instituciones, búsqueda de programas y un asistente IA ("Kora") sobre datos oficiales SIES/Mineduc en Supabase (Postgres + pgvector). El código, los comentarios y la UI están en español; mantén ese idioma al escribir código nuevo.

## Comandos

```bash
npm run dev            # dev server con heap de 8GB (el default; el heap grande es necesario)
npm run dev:small-heap # nuxt dev sin el flag de memoria
npm run dev:fresh      # clean + dev
npm run build          # nuxt build — la verificación automatizada del repo
npm run preview
npm run clean          # borra .nuxt, .output, .vercel/output y caches de vite/node_modules
```

No hay linter ni typecheck configurados (`nuxt typecheck` intenta descargar TypeScript de un registro npm interno y falla). **`npm run build` es la puerta de calidad**: úsalo para validar cambios antes de darlos por terminados.

### Evaluación del agente

```bash
npm run eval            # 48 casos del golden set contra un servidor local
npm run eval:quick      # solo los casos fáciles
npm run eval:no-judge   # sin el juez LLM de groundedness
npm run eval -- --id=emp-derecho-udp   # un caso concreto
```

Requiere `npm run dev` levantado y las variables `EVAL_USER_EMAIL`/`EVAL_USER_PASSWORD` en `.env` (usuario de prueba de Supabase; el runner obtiene su JWT y llama `/api/chat` como el frontend). Casos en `evals/dataset.jsonl`, uno por línea; transcripciones en `evals/results/` (gitignoreado).

Verifica en dos niveles: determinista (`must_contain`, `expected_route`) y un juez LLM que comprueba *groundedness* — que ninguna cifra citada venga sin tool. La coincidencia de tools se reporta pero **no decide el pase**: hay varios caminos válidos y sobreajustar la estrategia degrada el eval.

El chat limita a 12 req/min por usuario, así que el runner serializa con pausa (`EVAL_DELAY_MS`, 5.5s por defecto).

Node 22.16.0 (`.nvmrc`); `package.json` exige `>=20`.

### Datos y embeddings

```bash
npm run data:refresh                        # import + embeddings (flujo completo)
npm run data:import-resultado-json-2026     # carga convertidor/scripts/resultado_json → staging → tablas públicas
npm run embeddings                          # solo filas con embedding IS NULL (idempotente)
npm run embeddings:institutions             # --table=institutions | career_generic | programs
npm run embeddings:reset                    # regenera todos los embeddings
```

Los scripts corren con `tsx`, leen `.env` vía `dotenv/config` y usan `SUPABASE_SERVICE_ROLE_KEY` directamente (no pasan por el runtime de Nuxt). Los JSON fuente en `convertidor/scripts/resultado_json/` están gitignorados: sin ellos el import no corre.

## Arquitectura

### Capas

- **`pages/`** — rutas Nuxt. Protegidas con `definePageMeta({ middleware: 'auth' | 'admin' })`.
- **`stores/`** (Pinia) — estado + cache TTL con persistencia en localStorage; cada store envuelve un endpoint (`ranking`, `careerCatalog`, `programDetail`, `paesSimulator`, …). Los componentes leen del store, no hacen `$fetch` directo a esos endpoints.
- **`components/`** — registrados con `pathPrefix: false`, así que `components/ui/UserAvatar.vue` se usa como `<UserAvatar />` sin prefijo de carpeta.
- **`server/api/`** — Nitro. Dos familias: endpoints de la app (`/api/ranking`, `/api/careers`, `/api/saved`, `/api/admin`) y `/api/tools/*`, que son el backend de las tools del LLM y también se consumen desde el front.
- **`server/utils/`** — lógica compartida del servidor (auth, rate limit, retrieval, scoring, clientes Supabase).

### Sistema IA — leer `docs/KORA_SISTEMA_IA.md` antes de tocarlo

Es la documentación de referencia del chat y de Discover: capas, orden exacto de las rutas deterministas, catálogo de las 11 tools, esquema de telemetría y queries de monitoreo. `server/api/chat.post.ts` tiene ~2.200 líneas; no lo modifiques sin ese contexto.

Puntos estructurales que condicionan cualquier cambio:

- **Las rutas deterministas van primero.** Antes de llamar al LLM, `chat.post.ts` evalúa en orden fijo una cadena de detectores (exploración amplia, ranking, aclaración de nivel, saludo, overview de institución, context discovery, stats, búsqueda de programas). Si una aplica, responde sin gastar tokens. Al agregar comportamiento nuevo, decide conscientemente si va en esa cadena o en el camino LLM, y respeta el orden: mover un detector cambia qué preguntas caen en él.
- **La IA no inventa cifras.** Ingresos, empleabilidad, aranceles, mallas y puntajes salen siempre de una tool contra la BD oficial. Si no hay dato, se reporta la ausencia (`salary_source: 'none'`) en vez de estimar.
- **Contexto multi-turno sin sesión en BD:** `inferChatContext()` reinfiere institución/nivel/área desde el historial que manda el cliente en cada request.
- **Cadena de fallback de proveedores:** GitHub Models (`gpt-4.1-mini` → DeepSeek-V3 → Llama-3.1-8B) → Groq. Todo cambio de proveedor debe conservar el fallback y el registro en `ai_usage_events`.
- **`pickTools()`** manda solo 2-5 de las 10 tools por turno; agregar una tool al catálogo sin engancharla ahí la deja inaccesible (le pasó a `get_financial_stats`, que acabó eliminada del catálogo por muerta y duplicar a `get_career_stats_detailed`).
- **Presupuesto:** con `AI_MONTHLY_BUDGET_CLP` definido, superar el 80% activa modo `compact` (prompt reducido, menos tools).

### Contrato de las tools

- **Los enums de `metric` en `rank_careers`/`rank_institutions` deben coincidir con el `METRIC_MAP` de su endpoint.** El schema declara las claves cortas (`ingreso_4to`); el endpoint las traduce a columnas (`ingreso_4to_ano_clp`). Si añades una métrica, actualiza ambos lados.
- **Los nombres de parámetro del schema no siempre son los del endpoint.** `PARAM_ALIASES` en [ai-tools.ts](server/utils/ai-tools.ts) traduce (`nombre_institucion` → `institution` en search, → `nombre` en get_institution). Se hizo así para que el LLM vea un nombre único sin romper el contrato HTTP de `/api/tools/*`, que también consume el frontend.
- **Los errores deben ser accionables.** Los endpoints construyen `statusMessage` con la corrección concreta (la lista de métricas válidas, qué filtro aflojar); el orquestador los propaga al modelo con `e.data.statusMessage`. Nunca uses `e.message` de ofetch: es genérico y filtra la URL interna al contexto del LLM. Lo mismo aplica al caso "sin resultados": devuelve un `message` que diga qué hacer distinto, no un `count: 0` mudo.
- **El truncado de resultados recorta datos, no strings.** `stringifyToolResultForPrompt` va quitando elementos del array más largo hasta caber en `MAX_TOOL_RESULT_CHARS`; nunca hagas `slice()` sobre el JSON serializado, porque entrega al modelo un documento inválido.
- **`is_featured`/`priority` no viajan al LLM.** Son señales de monetización: sirven para ordenar en el servidor, pero sesgarían la narrativa del modelo.

### Retrieval y embeddings

Modelo local `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (384d, sin API key), cargado como singleton en `server/utils/embeddings.ts`. El mismo embedding de la pregunta sirve para el cache semántico (`match_chat_cache`, umbral 0.88) y para el RAG híbrido (`search_hybrid`, RPC pgvector).

**En desarrollo los embeddings están desactivados por defecto** para que Nuxt no cargue `@xenova/transformers` en el runtime y agote la memoria. Para probar retrieval semántico local: `AI_EMBEDDINGS_ENABLED=1 npm run dev` (PowerShell: `$env:AI_EMBEDDINGS_ENABLED='1'; npm run dev`). Cuando están apagados, `embedText()` devuelve `null` y el chat debe seguir funcionando — preserva esa degradación elegante.

`@xenova/transformers`, `onnxruntime-node` y `sharp` son `optionalDependencies` y están excluidos de Vite optimizeDeps, SSR bundle y externals de Nitro (`ML_LIBS` en `nuxt.config.ts`). No los importes de forma estática en código del servidor.

### Auth y acceso

- Supabase Auth con JWT. La sesión vive en localStorage (client-only), por eso los middlewares hacen `if (import.meta.server) return` y validan tras la hidratación.
- El cliente Supabase del browser se comparte vía `globalThis` (`composables/useSupabaseClient.ts`) para evitar instancias duplicadas; en el servidor los clientes anon/service se cachean por url+key.
- Endpoints protegidos: `requireAuth(event)` (JWT + rate limit por usuario) o `requireAdmin(event)` (además exige `role = 'admin'` en la tabla `users` o en los claims del token, y devuelve el cliente service_role).
- Rate limit persistido en la tabla `rate_limits`, con fallback in-memory si la tabla no existe.
- **Nunca uses el cliente service_role en código que llegue al browser**: `supabaseServiceKey` vive en `runtimeConfig` privado, no en `public`.

### Base de datos

Migración baseline única: `supabase/migrations/20260507000000_baseline.sql`. Esquema `staging.*` (raw de los JSON fuente) → tablas `public.*` (`institutions`, `programs`, `career_generic`, `career_stats`, `career_employability`, `program_admission_metrics`, `program_finance_reference`, `curricula`) + tablas de app (`users`, `saved`, `chat_messages`, `chat_cache`, `discovery_sessions`, `ai_usage_events`, `intent_events`, `plans`, `rate_limits`). Contexto operativo del rebuild 2026 en `docs/data/`.

El **score de ranking** (`server/utils/ranking-score.ts`) es una ponderación de acreditación 40% / retención 25% / PAES 20% / matrícula 15%, renormalizada sobre las métricas presentes: si falta un dato se excluye del peso en vez de contar como cero, y el resultado expone `score_data_coverage_pct` y el detalle de métricas incluidas/excluidas para mostrarlo en la UI. Mantén esa transparencia al tocar el cálculo.

### Variables de entorno

`.env` local (ver `.env.example`). Supabase es obligatorio; `APY_GIT`/`GROQ` habilitan los proveedores LLM; `OLLAMA_URL`/`OLLAMA_MODEL` son solo para desarrollo local y no deben configurarse en producción. `nuxt.config.ts` acepta varios alias por variable (`NUXT_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL` / `SUPABASE_URL`), pero los scripts de datos leen específicamente `VITE_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

## Deploy

Vercel vía GitHub Actions (`.github/workflows/deploy.yml`): push a `main` → producción, PR → preview. Nitro usa el preset `vercel` con `outputDirectory: .vercel/output`.

## Notas

- `build_log.txt`, `build_output.txt` y `build_result.txt` en la raíz son salidas de build versionadas accidentalmente; ignóralas y no las actualices.
- `utils/institution-aliases.json` mapea siglas a nombres oficiales (PUC, USM, UDP…). Se aplica al texto del usuario antes de cualquier matching; agrega ahí las siglas nuevas en vez de parchear la lógica de detección.
