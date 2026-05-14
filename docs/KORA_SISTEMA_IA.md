# KoraChile — Documentación del Sistema IA

> Cómo funciona el chat con Kora y el módulo Discover

---

## Índice

1. [Visión general](#1-visión-general)
2. [Chat con Kora — Flujo completo](#2-chat-con-kora--flujo-completo)
   - [Capas del sistema](#capas-del-sistema)
   - [Paso a paso de un turno](#paso-a-paso-de-un-turno)
   - [Rutas deterministas (sin LLM)](#rutas-deterministas-sin-llm)
   - [Flujo LLM con tools](#flujo-llm-con-tools)
   - [Tipos de conversación](#tipos-de-conversación)
   - [Contexto activo](#contexto-activo)
   - [Presupuesto (budget)](#presupuesto-budget)
3. [Discover con Kora — Flujo completo](#3-discover-con-kora--flujo-completo)
4. [Tools disponibles](#4-tools-disponibles)
5. [Telemetría y monitoreo](#5-telemetría-y-monitoreo)
6. [Queries de monitoreo](#6-queries-de-monitoreo)

---

## 1. Visión general

KoraChile tiene dos flujos de IA distintos:

| Módulo | Endpoint | Rol |
|--------|----------|-----|
| **Chat** | `POST /api/chat` | Conversación continua con contexto, tools y RAG |
| **Discover** | `POST /api/discover` | Análisis psicológico del texto → 3 rutas vocacionales |

Ambos comparten los mismos proveedores LLM (con fallback en cadena) y el sistema de telemetría (`ai_usage_events`).

---

## 2. Chat con Kora — Flujo completo

### Capas del sistema

```
Usuario escribe
      │
      ▼
[1] Validación + Auth (requireAuth + rate limit)
      │
      ▼
[2] Resolución de aliases ("PUC" → "Pontificia Universidad Católica de Chile")
      │
      ▼
[3] inferChatContext()  → detecta institución activa, nivel, área, carrera
      │
      ▼
[4] classifyChatIntent()  → intent.kind (greeting / official_salary / ranking / …)
      │
      ▼
[5] RUTAS DETERMINISTAS (sin LLM, sin tokens)
      │                │
   early return    no match ─► continúa
      │
      ▼
[6] Cache semántico (checkSemanticCache)
      │                │
     hit           miss ──►
      │                 │
   responde         [7] RAG híbrido (pgvector search_hybrid)
                        │
                        ▼
                    [8] LLM loop con tool calling
                        │
                        ▼
                    [9] finalize() → persist + telemetría + respuesta
```

---

### Paso a paso de un turno

#### [1] Validación
- Exige JWT válido (Supabase Auth).
- Rate limit: máximo **12 requests / minuto** por usuario.
- Máximo **20 mensajes** en el body, cada uno ≤ 2000 caracteres.

#### [2] Resolución de aliases
- El archivo `utils/institution-aliases.json` mapea siglas a nombres oficiales.
- Ejemplos: `PUC` → `Pontificia Universidad Católica de Chile`, `USM` → `Universidad Técnica Federico Santa María`.
- Se aplica al texto del usuario **antes de todo** para que el matching de institución sea consistente.

#### [3] inferChatContext()
Extrae el contexto activo mirando el historial completo de mensajes:

```
ctx = {
  institution:        última IES mencionada (actual o previa)
  nivel:              nivel académico detectado (Profesional con Licenciatura, Técnico, etc.)
  area:               área de conocimiento (Salud, Tecnología, Derecho, etc.)
  careerQuery:        si el usuario nombró una carrera específica
  pendingCareerQuery: carrera mencionada en turno anterior (para preservar con follow-ups)
  lastInstitution:    IES del turno actual (para detectar cambio de institución)
  institutionChanged: true si cambió de IES respecto al turno anterior
}
```

Si el usuario cambia de institución → `institutionChanged = true` → se reinicia nivel y área.

#### [4] classifyChatIntent()
Clasificación rápida por regex (sin LLM) que devuelve:

| `kind` | Trigger | Budget |
|--------|---------|--------|
| `greeting` | "hola", "buenas", "hey" | 0 tools, 0 LLM rounds |
| `official_salary` | sueldo, ingreso, empleabilidad | 2 rounds, 3 calls |
| `official_program` | arancel, puntaje, malla, sede | 2 rounds, 3 calls |
| `institution_info` | nombre de IES, acreditación | 2 rounds, 3 calls |
| `ranking` | top, mejor, ranking, lista | 2 rounds, 3 calls |
| `comparison` | vs, comparar, diferencia | 3 rounds, 5 calls |
| `career_recommendation` | qué estudiar, recomiéndame | 2 rounds, 3 calls |
| `general` | cualquier otra cosa | 2 rounds, 2 calls |

Estos límites controlan cuántas veces el LLM puede llamar tools por turno (evita loops infinitos y gasto excesivo).

---

### Rutas deterministas (sin LLM)

Se evalúan en este orden exacto. Si alguna aplica → respuesta inmediata sin gastar tokens:

```
Orden de evaluación
────────────────────────────────────────────────────────────────────────
1. isBroadInstitutionExplorationTurn()
   Trigger: menciona tipo de institución (universidad/IP/CFT) pero SIN
   carrera específica, SIN nombre de IES, SIN datos concretos ni ranking.
   Ejemplos: "quiero explorar universidades", "qué hay en los CFT"
   Respuesta: texto guía + 4 quickActions para refinar.
   Telemetría: deterministic_route = "broad_institution"

2. detectRankingIntent() → isRankingTurn()
   Trigger: mejor/top/ranking/más acreditadas/mayor matrícula/etc.
   Detecta automáticamente: target (institutions/careers), métrica y orden.
   Llama rank_institutions o rank_careers → formatea TOP 10.
   Ejemplos:
     "universidades con más años de acreditación" → rank_institutions(acreditacion, desc)
     "mejores carreras por sueldo" → rank_careers(ingreso_4to_ano_clp, desc)
     "peores IPs por retención" → rank_institutions(retencion, asc, tipo=IP)
   Telemetría: deterministic_route = "ranking_institutions" o "ranking_careers"

3. asksForConcreteCareerWithoutLevel()
   Trigger: usuario menciona carrera específica (medicina, ingeniería, etc.)
   pero no especificó nivel y no hay nivel activo en contexto.
   Respuesta: pregunta el nivel + 5 quickActions (uno por nivel post-PAES).
   Telemetría: deterministic_route = "level_clarification"

4. intent.kind === 'greeting'
   Respuesta: presentación de Kora + 2 quickActions.
   Telemetría: deterministic_route = "greeting"

5. isInstitutionOnlyExploration() + activeInstitution
   Trigger: menciona solo una IES sin carrera, sin nivel, sin datos concretos.
   Llama: get_institution (datos generales) + search_career_match (vitrina: 6
   programas random agrupados por nivel_carrera).
   Telemetría: deterministic_route = "institution_overview"

6. isContextDiscoveryTurn() + activeInstitution
   Trigger: hay institución activa + el usuario agrega nivel/área o pide
   programas/oferta.
   Llama: search_career_match con { institution, nivel, area, keywords }.
   Si es exploración genérica: agrupa resultados por nivel_carrera.
   Telemetría: deterministic_route = "context_discovery"

7. isStatsLookupTurn()
   Trigger: pregunta por sueldo/empleabilidad sin institución activa.
   Llama: get_career_stats_detailed con la carrera extraída como keywords.
   Telemetría: deterministic_route = "stats_lookup"

8. isProgramSearchTurn()  (solo si no hay institución activa)
   Trigger: verbos de búsqueda (mostrar, buscar, opciones, programas)
   + al menos un filtro (keywords, región, tipo, nivel).
   Guard: excluye ranking/acreditación/mejor/top (los cuales van a ruta 2).
   Llama: search_career_match con todos los filtros detectados.
   Telemetría: deterministic_route = "program_search"
────────────────────────────────────────────────────────────────────────
Si ninguna aplica → va al LLM (deterministic_route = null en metadata)
```

---

### Flujo LLM con tools

Cuando ninguna ruta determinista aplica:

#### [6] Cache semántico
- Genera embedding de la pregunta (modelo de embeddings propio).
- Busca en `chat_cache` con `match_chat_cache` (pgvector RPC).
- Umbral de similitud: **0.88** (antes fue 0.93, ajustado).
- TTL: **24h** para respuestas volátiles (datos de instituciones), **30 días** para respuestas estables.
- Si hay institución activa → **salta el cache** (para no confundir IES similares).

#### [7] RAG híbrido
- Usa el mismo embedding del paso anterior (no recomputa).
- Llama `search_hybrid` RPC en Supabase (pgvector).
- Devuelve hasta 8 ítems relevantes: institutions, programs, careers genéricas.
- Se formatea e inyecta como `system message` adicional antes del historial.

#### [8] LLM loop con tool calling

```
buildSystemPrompt()        → BASE_SYSTEM_PROMPT (estático, cacheado por OpenAI)
buildCareersContextMessage() → si vino de /results, inyecta las carreras recomendadas
buildChatContextMessage()   → inyecta ctx activo (IES, nivel, área, carrera)
pickTools()                → filtra las 11 tools a solo las relevantes (~2-5)
trimUserHistory()          → mantiene últimos 5 turnos user/assistant

for ronda in 0..maxToolRounds:
  resp = LLM(conversation, tools=selectedTools)
  if resp.tool_calls:
    for call in resp.tool_calls (hasta maxToolCallsPerRound):
      result = runTool(call.name, call.args)
      conversation.push({ role: "tool", content: result })
  else:
    break → respuesta final

LLM(conversation, toolChoice='none') → síntesis final
```

**Proveedores LLM (en orden de prioridad):**
1. GitHub Models → `openai/gpt-4.1-mini` (principal)
2. GitHub Models → `deepseek/DeepSeek-V3-0324` (fallback 1)
3. GitHub Models → `meta/Meta-Llama-3.1-8B-Instruct` (fallback 2)
4. Groq → `llama-3.1-8b-instant` (fallback 3)

#### [9] finalize()
Siempre se ejecuta (determinista o LLM):
- `persistChatTurn()` → guarda en `chat_messages` (userId, sessionId, role, content).
- `logAiUsageEvent()` → guarda en `ai_usage_events` (tokens, costo, intent, tools, latencia, señales de conversación).
- Devuelve: `{ reply, toolsUsed, programCards, quickActions, programFullData, sessionId }`.

---

### Tipos de conversación

`classifyConversationType()` clasifica cada turno en uno de estos tipos. Se guarda en `ai_usage_events.metadata.conversation_type`:

| Tipo | Descripción | Señales |
|------|-------------|---------|
| `greeting` | Saludo inicial | intent = greeting |
| `exploration` | Sin objetivo concreto todavía | "qué estudiar", "oriéntame" |
| `institution` | Pregunta sobre una IES específica | institution activa, sin carrera |
| `career` | Busca o pregunta por una carrera | career hint detectado |
| `comparison` | Compara dos o más IES o carreras | "vs", "comparar", "diferencia" |
| `decision` | Está eligiendo (precio + beca, cuál conviene) | asks_price + asks_scholarship |
| `ranking` | Pide un TOP o listado ordenado | mejor/top/acreditación/mayor |
| `stats` | Pregunta datos de empleabilidad/puntaje | asks_employability / asks_score |
| `unknown` | No se pudo clasificar | — |

---

### Contexto activo

El sistema mantiene estado **multi-turno** sin base de datos de sesión: infiere el contexto de los mensajes enviados por el cliente.

```
Turno 1: "Cuéntame de la UDP"
  → institution = "Universidad Diego Portales"
  → nivel = null → pregunta nivel

Turno 2: "Pregrado"
  → institution = "UDP" (preservado)
  → nivel = "Profesional con Licenciatura"
  → busca programas UDP + nivel

Turno 3: "Y el sueldo de Derecho en la UDP?"
  → institution = "UDP" (preservado)
  → career = "Derecho"
  → llama get_career_employability_by_institution

Turno 4: "Y en la PUC?"
  → institutionChanged = true
  → institution = "PUC" (nuevo)
  → nivel reiniciado → vuelve a preguntar nivel
```

---

### Presupuesto (budget)

`getAiBudgetState()` lee `ai_usage_events` del mes actual y calcula el gasto estimado en CLP.

| Estado | Condición | Efecto |
|--------|-----------|--------|
| `normal` | < 80% del límite mensual | Sin restricciones |
| `compact` | ≥ 80% del límite mensual | Prompt reducido, máx 2 párrafos, menos tools |

Si no hay `AI_MONTHLY_BUDGET_CLP` en las variables de entorno → budget desactivado.

---

## 3. Discover con Kora — Flujo completo

El módulo Discover es **stateless**: no hay historial de conversación. El usuario describe libremente sus intereses y el sistema devuelve 3 rutas vocacionales.

```
Usuario escribe texto libre (5–1000 chars)
      │
      ▼
[1] Rate limit por IP (10 requests / 10 minutos, sin auth)
      │
      ▼
[2] LLM con análisis psicológico profundo
      │
      ▼
[3] Parse + validación + normalización del JSON
      │
      ▼
[4] Enriquecimiento con salarios oficiales SIES
      │
      ▼
[5] logAiUsageEvent() → telemetría
      │
      ▼
Respuesta: { query, summary, variations[3] }
```

### [2] Análisis psicológico con LLM

El sistema prompt de Discover le pide al LLM que aplique **internamente** (sin mencionarlo al usuario):

- **BIG FIVE** (Yarkoni 2010): detecta rasgos de personalidad desde el lenguaje.
  - Responsabilidad: verbos de proceso, "organizar", "planificar"
  - Apertura: lenguaje abstracto, metáforas, curiosidad
  - Extraversión: verbos de interacción social, "equipo", "gente"
  - Amabilidad: pronombres inclusivos, verbos de ayuda
  - Neuroticismo: palabras de preocupación, incertidumbre

- **Self-concept**: si usa jerga técnica sin explicarla → competencia real en esa área. Frecuencia de "nosotros" vs "yo" → perfil colaborativo vs independiente.

- **Análisis semántico**: sentiment (qué genera entusiasmo vs resignación), topic modeling implícito (temas recurrentes aunque no los declare), stylometry (pensamiento operativo / estratégico / creativo).

El LLM devuelve un **JSON estructurado** con 3 variaciones, cada una con:
- `title`, `tagline`, `description`, `emoji`, `match_score` (70-99)
- `pros` (3), `cons` (2), `skills` (5)
- `personality_types` (2 tipos MBTI)
- `fun_facts` (3)
- `job_demand` (Alta / Media / Muy Alta)
- `universities` (3 IES chilenas reales)
- `curriculum` (6 semestres de materias)

### Proveedores LLM en Discover

1. **GitHub Models GPT-4.1-mini** (principal, prompt completo con Big Five)
2. **GitHub Models DeepSeek-V3** (fallback, mismo prompt)
3. **Groq llama-3.1-8b-instant** (fallback, prompt compacto)
4. Si el JSON devuelto es inválido → **repairJsonWithProvider()** llama al LLM de nuevo solo para reparar el JSON roto.

### [3] Parse robusto

`tryParsePossiblyTruncatedJson()` maneja LLMs que truncan la respuesta:
- Elimina bloques `<think>` (DeepSeek)
- Elimina ```json ``` markdown wrappers
- Si el JSON está truncado: cierra comillas, brackets y braces abiertos
- Elimina comas colgantes

### [4] Enriquecimiento con salarios SIES

Después del LLM, el backend consulta la BD oficial por cada variación para agregar:
- `salary_source`: `'sies'` o `'none'`
- `salary_label`: rango de ingreso textual ("$850.000 – $1.200.000 CLP/mes")
- `salary_range`: `{ junior, mid, senior }` en CLP

Si no hay datos SIES para esa carrera → `salary_source = 'none'`, sin inventar valores.

---

## 4. Tools disponibles

El chat tiene acceso a **11 tools**. `pickTools()` filtra las relevantes por turno (evita enviar las 11 al LLM siempre, ahorra ~2.000 tokens de schema).

| Tool | Cuándo usarla | Endpoint |
|------|---------------|----------|
| `search_career_match` | Buscar programas por keywords, región, nivel, tipo IES | POST /api/tools/search-career-match |
| `get_program_detail` | Arancel, puntaje, vacantes, malla, duración de un programa específico | GET /api/tools/get-program-detail |
| `get_institution` | Info de una IES: acreditación, matrícula, sede, web | GET /api/tools/get-institution |
| `get_career_stats_detailed` | Empleabilidad + ingresos por carrera genérica (sin IES específica) | GET /api/tools/career-stats-detailed |
| `get_career_employability_by_institution` | Empleabilidad + ingreso de una carrera EN una IES concreta | GET /api/tools/career-employability-by-institution |
| `rank_careers` | TOP N carreras por métrica (ingreso, empleabilidad, retención) | GET /api/tools/rank-careers |
| `rank_institutions` | TOP N IES por métrica (acreditación, matrícula, m2, biblioteca) | GET /api/tools/rank-institutions |
| `compare_institutions` | Comparación lado a lado de 2 IES | GET /api/tools/compare-institutions |
| `compare_curriculums` | Comparación de mallas de 2 programas | POST /api/tools/compare-curriculums |
| `get_filters_catalog` | Catálogo de valores válidos (áreas, tipos, niveles, regiones) | GET /api/tools/filters-catalog |
| `get_financial_stats` | Arancel de referencia para becas (BES/BJG/BAES) y crédito (CAE) | GET /api/tools/financial-stats |

### Métricas de rank_institutions

`acreditacion` · `matricula` · `titulados` · `retencion` · `paes` · `nem` · `duracion_real` · `m2` · `biblioteca` · `laboratorios` · `computadores`

### Métricas de rank_careers

`ingreso_4to_ano_clp` · `empleabilidad_1er_ano_pct` · `retencion_1er_ano_pct` · `titulados` · `matricula`

---

## 5. Telemetría y monitoreo

Cada turno del chat y cada request de Discover guarda un registro en `ai_usage_events`:

```sql
ai_usage_events
  user_id              -- usuario autenticado (null en Discover = anon)
  session_id           -- UUID de la sesión de chat
  route                -- 'chat' | 'discover'
  intent               -- kind del classifyChatIntent()
  model                -- modelo LLM usado (puede ser null si fue ruta determinista)
  provider             -- 'github_models' | 'groq' | 'unknown'
  prompt_tokens        -- tokens de entrada (0 si ruta determinista)
  completion_tokens    -- tokens de salida (0 si ruta determinista)
  total_tokens         -- suma
  estimated_cost_clp   -- costo estimado en CLP (USD × tasa configurada)
  cache_hit            -- true si respondió desde cache semántico
  tools_used           -- array de tools llamadas en ese turno
  tool_call_count      -- cantidad de tool calls
  llm_call_count       -- cantidad de llamadas al LLM
  latency_ms           -- tiempo total del request
  metadata             -- objeto JSON con:
    conversation_type    -- greeting | exploration | institution | career | comparison | decision | ranking | stats | unknown
    deterministic_route  -- qué ruta determinista aplicó (null = fue al LLM)
    signals              -- has_institution, has_career_hint, asks_price, asks_scholarship, asks_score, etc.
    ctx                  -- { institution, nivel, area, has_career_query, institution_changed }
    complexity           -- cheap | standard | deep
    needs_official_data  -- boolean
    budget               -- estado del presupuesto mensual
```

---

## 6. Queries de monitoreo

### Distribución por tipo de conversación
```sql
SELECT
  metadata->>'conversation_type' AS tipo,
  COUNT(*) AS total,
  ROUND(AVG(latency_ms)) AS latencia_prom_ms,
  SUM(total_tokens) AS tokens_totales
FROM ai_usage_events
WHERE route = 'chat'
  AND created_at > now() - interval '7 days'
GROUP BY 1
ORDER BY 2 DESC;
```

### Rutas deterministas vs LLM
```sql
SELECT
  metadata->>'conversation_type' AS tipo,
  COALESCE(metadata->>'deterministic_route', 'llm') AS ruta,
  COUNT(*) AS veces,
  SUM(estimated_cost_clp) AS costo_clp
FROM ai_usage_events
WHERE route = 'chat'
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
```

### Intents que no usaron ninguna tool (posibles respuestas vacías)
```sql
SELECT cm.content AS pregunta, aue.intent, aue.latency_ms
FROM chat_messages cm
JOIN ai_usage_events aue ON aue.session_id::text = cm.session_id
WHERE cm.role = 'user'
  AND aue.tools_used = '{}' -- array vacío
  AND aue.metadata->>'deterministic_route' IS NULL -- no fue ruta determinista
ORDER BY cm.created_at DESC
LIMIT 50;
```

### Sesiones de decisión sin acción concreta
```sql
SELECT DISTINCT session_id
FROM ai_usage_events aue
WHERE metadata->>'conversation_type' = 'decision'
  AND NOT EXISTS (
    SELECT 1 FROM intent_events ie
    WHERE ie.session_id::text = aue.session_id::text
  );
```

### Conversaciones largas sin acción (usuarios que no fueron ayudados)
```sql
SELECT
  cm.session_id,
  array_agg(cm.content ORDER BY cm.created_at)
    FILTER (WHERE cm.role = 'user') AS preguntas
FROM chat_messages cm
LEFT JOIN intent_events ie ON ie.session_id::text = cm.session_id
WHERE ie.id IS NULL
GROUP BY cm.session_id
HAVING COUNT(CASE WHEN cm.role = 'user' THEN 1 END) >= 4
ORDER BY COUNT(*) DESC
LIMIT 20;
```

### Costo mensual del chat
```sql
SELECT
  DATE_TRUNC('month', created_at) AS mes,
  SUM(estimated_cost_clp) AS costo_clp,
  COUNT(*) AS requests,
  AVG(total_tokens) AS tokens_prom
FROM ai_usage_events
WHERE route = 'chat'
GROUP BY 1
ORDER BY 1 DESC;
```

### Tasa de hit del cache semántico
```sql
SELECT
  COUNT(*) FILTER (WHERE cache_hit = true) AS cache_hits,
  COUNT(*) FILTER (WHERE cache_hit = false) AS misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / COUNT(*), 1) AS hit_rate_pct
FROM ai_usage_events
WHERE route = 'chat'
  AND created_at > now() - interval '30 days';
```

---

*Última actualización: Mayo 2026*
