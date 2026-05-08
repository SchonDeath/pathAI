-- =============================================================================
-- BASELINE ÚNICO — KoraChile 2026
-- Aplicar sobre una base Supabase recién reseteada.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------------
-- LIMPIEZA PREVIA (permite re-ejecutar el script sin errores)
-- ---------------------------------------------------------------------------
DROP SCHEMA IF EXISTS staging CASCADE;

DROP TABLE IF EXISTS public.program_finance_reference CASCADE;
DROP TABLE IF EXISTS public.program_admission_metrics CASCADE;
DROP TABLE IF EXISTS public.institution_subscriptions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.intent_events CASCADE;
DROP TABLE IF EXISTS public.ai_usage_events CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.discovery_sessions CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_cache CASCADE;
DROP TABLE IF EXISTS public.curricula CASCADE;
DROP TABLE IF EXISTS public.careers CASCADE;
DROP TABLE IF EXISTS public.saved CASCADE;
DROP TABLE IF EXISTS public.career_employability CASCADE;
DROP TABLE IF EXISTS public.career_stats CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.career_generic CASCADE;
DROP TABLE IF EXISTS public.campuses CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP TABLE IF EXISTS public.comunas CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.search_hybrid(vector, int, float);
DROP VIEW IF EXISTS public.v_program_full;
DROP VIEW IF EXISTS public.programs_current;

-- ---------------------------------------------------------------------------
-- SCHEMA STAGING (ETL interno, no expuesto por la API REST)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE staging.resultado_json_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_label text NOT NULL,
  source_folder text NOT NULL DEFAULT 'convertidor/scripts/resultado_json',
  source_year integer,
  notes text,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staging.informacion_institucion_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  institution_code integer,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

CREATE TABLE staging.oferta_academica_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  program_unique_code text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

CREATE TABLE staging.buscar_carrera_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  program_unique_code text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

CREATE TABLE staging.buscar_empleabilidad_ingresos_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

CREATE TABLE staging.buscar_estadisticas_carrera_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

CREATE TABLE staging.aranceles_referencia_2026_becas_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

CREATE TABLE staging.aranceles_referencia_2026_creditos_raw (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES staging.resultado_json_runs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, row_number)
);

-- ---------------------------------------------------------------------------
-- AUTH / USUARIOS
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id uuid NOT NULL,
  name text,
  email text,
  avatar_url text,
  interests text[] DEFAULT '{}',
  role text NOT NULL DEFAULT 'user',
  phone text,
  gender text CHECK (gender IS NULL OR gender = ANY (ARRAY['masculino','femenino','prefiero_no_decir'])),
  birth_date date,
  bio text,
  preferred_institution_types text[] DEFAULT '{}',
  preferred_areas text[] DEFAULT '{}',
  region_interes text,
  anio_egreso integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- GEOGRAFÍA
-- ---------------------------------------------------------------------------
CREATE TABLE public.regions (
  code text NOT NULL,
  nombre text NOT NULL,
  numero integer,
  CONSTRAINT regions_pkey PRIMARY KEY (code)
);

CREATE TABLE public.comunas (
  code text NOT NULL,
  nombre text NOT NULL,
  provincia text,
  region_code text,
  CONSTRAINT comunas_pkey PRIMARY KEY (code),
  CONSTRAINT comunas_region_code_fkey FOREIGN KEY (region_code) REFERENCES public.regions(code)
);

-- ---------------------------------------------------------------------------
-- CAPA ACADÉMICA MAESTRA
-- ---------------------------------------------------------------------------
CREATE TABLE public.institutions (
  institution_code integer NOT NULL,
  dataset_version text NOT NULL DEFAULT 'SIES_2026',
  tipo_institucion text,
  nombre_institucion text NOT NULL,
  autonomia text,
  direccion_sede_central text,
  pagina_web text,
  rut text,
  acreditacion_estado text,
  acreditacion_anos integer,
  acreditacion_vigencia_desde date,
  acreditacion_vigencia_hasta date,
  acreditacion_areas text[] NOT NULL DEFAULT '{}',
  acreditacion_areas_electivas text[] NOT NULL DEFAULT '{}',
  matricula_pregrado_actual integer,
  matricula_posgrado_actual integer,
  titulados_pregrado_actual integer,
  titulados_posgrado_actual integer,
  retencion_1er_ano_pct numeric,
  duracion_formal_semestres numeric,
  duracion_real_semestres numeric,
  total_jce numeric,
  promedio_nem numeric,
  promedio_paes numeric,
  ingresos_operacion_clp bigint,
  resultado_ejercicio_clp bigint,
  total_activos_clp bigint,
  patrimonio_total_clp bigint,
  m2_construidos numeric,
  volumenes_biblioteca integer,
  laboratorios_talleres integer,
  computadores integer,
  financial_statements_payload jsonb NOT NULL DEFAULT '{}',
  matricula_pregrado_por_ano jsonb NOT NULL DEFAULT '{}',
  matricula_posgrado_por_ano jsonb NOT NULL DEFAULT '{}',
  titulados_pregrado_por_ano jsonb NOT NULL DEFAULT '{}',
  titulados_posgrado_por_ano jsonb NOT NULL DEFAULT '{}',
  matricula_pct_por_area jsonb NOT NULL DEFAULT '{}',
  matricula_pct_por_origen jsonb NOT NULL DEFAULT '{}',
  jce_por_nivel_academico jsonb NOT NULL DEFAULT '{}',
  infrastructure_payload jsonb NOT NULL DEFAULT '{}',
  source_payload jsonb NOT NULL DEFAULT '{}',
  -- features admin
  is_featured boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  featured_until timestamptz,
  logo_url text,
  -- embedding pgvector
  embedding vector(384),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institutions_pkey PRIMARY KEY (institution_code)
);

CREATE TABLE public.campuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_code integer NOT NULL,
  campus_code text,
  nombre_sede text NOT NULL,
  region text,
  region_code text,
  provincia text,
  comuna text,
  comuna_code text,
  direccion text,
  normalized_name text,
  source_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campuses_pkey PRIMARY KEY (id),
  CONSTRAINT campuses_institution_code_fkey FOREIGN KEY (institution_code) REFERENCES public.institutions(institution_code),
  CONSTRAINT campuses_region_code_fkey FOREIGN KEY (region_code) REFERENCES public.regions(code),
  CONSTRAINT campuses_comuna_code_fkey FOREIGN KEY (comuna_code) REFERENCES public.comunas(code)
);

CREATE TABLE public.career_generic (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  area text NOT NULL,
  tipo_institucion text NOT NULL,
  nombre_carrera_generica text NOT NULL,
  normalized_name text NOT NULL,
  source_payload jsonb NOT NULL DEFAULT '{}',
  embedding vector(384),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_generic_pkey PRIMARY KEY (id),
  CONSTRAINT career_generic_slug_key UNIQUE (slug)
);

CREATE TABLE public.programs (
  program_unique_code text NOT NULL,
  dataset_version text NOT NULL DEFAULT 'OFE_2026',
  admission_year integer,
  institution_code integer NOT NULL,
  campus_id uuid,
  career_generic_id uuid,
  area_conocimiento text,
  area_carrera_generica text,
  tipo_institucion text,
  tipo_institucion_detalle text,
  codigo_ies text,
  codigo_sede text,
  codigo_carrera text,
  nombre_carrera text NOT NULL,
  nombre_institucion text,
  nombre_sede text,
  region text,
  region_code text,
  provincia text,
  comuna text,
  comuna_code text,
  jornada text,
  modalidad text,
  version integer,
  nivel_carrera text,
  nivel_global text,
  tipo_carrera text,
  plan_especial text,
  regimen integer,
  duracion_formal_regimen integer,
  duracion_formal_semestres integer,
  duracion_titulacion integer,
  duracion_total integer,
  semestres_reconocidos integer,
  nombre_titulo text,
  grado_academico text,
  acreditacion_programa text,
  requisito_ingreso text,
  elegibilidad_beca_pedagogia text,
  demre boolean,
  ano_inicio integer,
  vacantes_semestre_1 integer,
  vacantes_semestre_2 integer,
  arancel_anual integer,
  matricula_anual integer,
  costo_titulacion integer,
  costo_certificado_diploma integer,
  arancel_referencia_becas integer,
  arancel_referencia_creditos integer,
  brecha_arancel_becas integer GENERATED ALWAYS AS (
    CASE WHEN arancel_anual IS NOT NULL AND arancel_referencia_becas IS NOT NULL AND arancel_anual > arancel_referencia_becas
         THEN arancel_anual - arancel_referencia_becas ELSE 0 END
  ) STORED,
  brecha_arancel_creditos integer GENERATED ALWAYS AS (
    CASE WHEN arancel_anual IS NOT NULL AND arancel_referencia_creditos IS NOT NULL AND arancel_anual > arancel_referencia_creditos
         THEN arancel_anual - arancel_referencia_creditos ELSE 0 END
  ) STORED,
  matricula_total_2025 integer,
  matricula_total_fem_2025 integer,
  matricula_total_mas_2025 integer,
  matricula_primer_ano_2025 integer,
  matricula_primer_ano_fem_2025 integer,
  matricula_primer_ano_mas_2025 integer,
  titulacion_total_2024 integer,
  titulacion_fem_2024 integer,
  titulacion_mas_2024 integer,
  promedio_nem numeric,
  -- puntajes PAES reales (promedio de matriculados):
  puntaje_promedio_matriculados numeric,
  anio_puntajes integer,
  -- rango percentil PAES (dato descriptivo del JSON, ej: "80% <= x <= 100%"):
  rango_percentil_paes text,
  -- ponderaciones
  pond_nem numeric,
  pond_ranking numeric,
  pond_lenguaje numeric,
  pond_matematicas numeric,
  pond_matematicas_2 numeric,
  pond_historia numeric,
  pond_ciencias numeric,
  pond_otros numeric,
  areas_destino_cine jsonb NOT NULL DEFAULT '{}',
  origen_matricula_pct jsonb NOT NULL DEFAULT '{}',
  source_payload jsonb NOT NULL DEFAULT '{}',
  -- features admin
  is_featured boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  featured_until timestamptz,
  -- embedding pgvector
  embedding vector(384),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programs_pkey PRIMARY KEY (program_unique_code),
  CONSTRAINT programs_institution_code_fkey FOREIGN KEY (institution_code) REFERENCES public.institutions(institution_code),
  CONSTRAINT programs_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES public.campuses(id),
  CONSTRAINT programs_career_generic_id_fkey FOREIGN KEY (career_generic_id) REFERENCES public.career_generic(id),
  CONSTRAINT programs_region_code_fkey FOREIGN KEY (region_code) REFERENCES public.regions(code),
  CONSTRAINT programs_comuna_code_fkey FOREIGN KEY (comuna_code) REFERENCES public.comunas(code)
);

CREATE TABLE public.career_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dataset_version text NOT NULL DEFAULT 'SIES_2026',
  career_generic_id uuid,
  area text NOT NULL,
  tipo_institucion text NOT NULL,
  nombre_carrera_generica text NOT NULL,
  ingreso_1er_ano_clp integer,
  ingreso_2do_ano_clp integer,
  ingreso_3er_ano_clp integer,
  ingreso_4to_ano_clp integer,
  ingreso_5to_ano_clp integer,
  empleabilidad_1er_ano_pct numeric,
  empleabilidad_2do_ano_pct numeric,
  retencion_1er_ano_pct numeric,
  duracion_formal_semestres numeric,
  duracion_real_semestres numeric,
  titulados_2024_total integer,
  titulados_2024_fem integer,
  titulados_2024_mas integer,
  matricula_primer_ano_2025_total integer,
  matricula_primer_ano_2025_fem integer,
  matricula_primer_ano_2025_mas integer,
  matricula_total_2025_total integer,
  matricula_total_2025_fem integer,
  matricula_total_2025_mas integer,
  tramos_ingreso jsonb NOT NULL DEFAULT '{}',
  evolucion_ingreso_4 jsonb NOT NULL DEFAULT '{}',
  evolucion_empleabilidad_1 jsonb NOT NULL DEFAULT '{}',
  evolucion_empleabilidad_2 jsonb NOT NULL DEFAULT '{}',
  distribucion_origen_pct jsonb NOT NULL DEFAULT '{}',
  source_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_stats_pkey PRIMARY KEY (id),
  CONSTRAINT career_stats_career_generic_id_fkey FOREIGN KEY (career_generic_id) REFERENCES public.career_generic(id)
);

CREATE TABLE public.career_employability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dataset_version text NOT NULL DEFAULT 'SIES_2026',
  source_row_code integer,
  institution_code integer,
  career_generic_id uuid,
  tipo_institucion text,
  nombre_institucion text,
  area text,
  nombre_carrera_generica text NOT NULL,
  continuidad_estudios_pct numeric,
  retencion_1_ano_pct numeric,
  empleabilidad_1_ano_pct numeric,
  empleabilidad_2_ano_pct numeric,
  ingreso_promedio_4to_ano_clp integer,
  ingreso_label text,
  source_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_employability_pkey PRIMARY KEY (id),
  CONSTRAINT career_employability_career_generic_id_fkey FOREIGN KEY (career_generic_id) REFERENCES public.career_generic(id)
);

CREATE TABLE public.program_admission_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_unique_code text NOT NULL,
  institution_code integer,
  source_dataset text NOT NULL DEFAULT 'BUSCAR_CARRERA_2026',
  reference_year integer NOT NULL DEFAULT 2026,
  arancel_anual_reportado integer,
  costo_titulacion_reportado integer,
  duracion_formal_semestres_reportado integer,
  nivel_carrera_reportado text,
  valor_uf_referencia numeric,
  matricula_total_femenina_payload jsonb NOT NULL DEFAULT '{}',
  matricula_total_masculina_payload jsonb NOT NULL DEFAULT '{}',
  matricula_total_payload jsonb NOT NULL DEFAULT '{}',
  titulacion_femenina_payload jsonb NOT NULL DEFAULT '{}',
  titulacion_masculina_payload jsonb NOT NULL DEFAULT '{}',
  titulacion_total_payload jsonb NOT NULL DEFAULT '{}',
  rango_ingreso_paes_payload jsonb NOT NULL DEFAULT '{}',
  promedio_paes_payload jsonb NOT NULL DEFAULT '{}',
  promedio_nem_payload jsonb NOT NULL DEFAULT '{}',
  vacantes_primer_semestre_payload jsonb NOT NULL DEFAULT '{}',
  ponderaciones_payload jsonb NOT NULL DEFAULT '{}',
  source_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_admission_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT program_admission_metrics_program_unique_code_fkey FOREIGN KEY (program_unique_code) REFERENCES public.programs(program_unique_code),
  CONSTRAINT program_admission_metrics_institution_code_fkey FOREIGN KEY (institution_code) REFERENCES public.institutions(institution_code)
);

CREATE TABLE public.program_finance_reference (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_unique_code text NOT NULL,
  source_dataset text NOT NULL DEFAULT 'ARANCELES_REFERENCIA_2026',
  reference_year integer NOT NULL DEFAULT 2026,
  arancel_anual_payload jsonb NOT NULL DEFAULT '{}',
  arancel_referencia_becas integer,
  arancel_referencia_creditos integer,
  hoja_origen_becas text,
  hoja_origen_creditos text,
  source_payload_becas jsonb NOT NULL DEFAULT '{}',
  source_payload_creditos jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_finance_reference_pkey PRIMARY KEY (id),
  CONSTRAINT program_finance_reference_program_unique_code_fkey FOREIGN KEY (program_unique_code) REFERENCES public.programs(program_unique_code)
);

-- ---------------------------------------------------------------------------
-- CARRERAS GENÉRICAS (catálogo de orientación vocacional)
-- ---------------------------------------------------------------------------
CREATE TABLE public.careers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  tagline text,
  description text,
  emoji text DEFAULT '🎯',
  category text,
  skills text[] DEFAULT '{}',
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  salary_junior integer,
  salary_mid integer,
  salary_senior integer,
  job_demand text CHECK (job_demand = ANY (ARRAY['Alta','Media','Muy Alta','Baja'])),
  personality_types text[] DEFAULT '{}',
  fun_facts text[] DEFAULT '{}',
  roadmap jsonb DEFAULT '[]',
  books jsonb DEFAULT '[]',
  notable_people jsonb DEFAULT '[]',
  match_keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT careers_pkey PRIMARY KEY (id),
  CONSTRAINT careers_slug_key UNIQUE (slug)
);

CREATE TABLE public.curricula (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  career_id uuid,
  institution text NOT NULL,
  institution_type text CHECK (institution_type = ANY (ARRAY['Universidad','Instituto','CFT','Online'])),
  location text,
  program text,
  duration_semesters integer,
  monthly_cost integer,
  total_cost integer,
  subjects jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT curricula_pkey PRIMARY KEY (id),
  CONSTRAINT curricula_career_id_fkey FOREIGN KEY (career_id) REFERENCES public.careers(id)
);

-- ---------------------------------------------------------------------------
-- CHAT Y SESIONES
-- ---------------------------------------------------------------------------
CREATE TABLE public.chat_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  embedding vector(384) NOT NULL,
  tags text[] DEFAULT '{}',
  hits integer DEFAULT 0,
  volatile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_hit_at timestamptz DEFAULT now(),
  CONSTRAINT chat_cache_pkey PRIMARY KEY (id)
);

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role = ANY (ARRAY['user','assistant'])),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.discovery_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  query text NOT NULL,
  result jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT discovery_sessions_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------------
-- RATE LIMITING
-- ---------------------------------------------------------------------------
CREATE TABLE public.rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_rate_limits_ip_created_at ON public.rate_limits (ip, created_at);

-- ---------------------------------------------------------------------------
-- PLANES Y SUSCRIPCIONES
-- ---------------------------------------------------------------------------
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  price_clp integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_slug_key UNIQUE (slug)
);

CREATE TABLE public.institution_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_code integer NOT NULL,
  plan_slug text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT institution_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT institution_subscriptions_plan_slug_fkey FOREIGN KEY (plan_slug) REFERENCES public.plans(slug),
  CONSTRAINT institution_subscriptions_institution_code_fkey FOREIGN KEY (institution_code) REFERENCES public.institutions(institution_code)
);

-- ---------------------------------------------------------------------------
-- GUARDADOS / FAVORITOS
-- ---------------------------------------------------------------------------
CREATE TABLE public.saved (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  career_id uuid,
  program_unique_code text,
  institution_code integer,
  career_generic_id uuid,
  nombre_carrera_snapshot text,
  nombre_institucion_snapshot text,
  nombre_sede_snapshot text,
  region_snapshot text,
  comuna_snapshot text,
  source text NOT NULL DEFAULT 'app',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT saved_pkey PRIMARY KEY (id),
  CONSTRAINT saved_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT saved_career_id_fkey FOREIGN KEY (career_id) REFERENCES public.careers(id)
);

-- ---------------------------------------------------------------------------
-- ANALYTICS / TELEMETRÍA
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  route text NOT NULL CHECK (route = ANY (ARRAY['chat','discover','admin','other'])),
  intent text,
  provider text,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens integer NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated_tokens boolean NOT NULL DEFAULT false,
  estimated_cost_usd numeric NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  estimated_cost_clp integer NOT NULL DEFAULT 0 CHECK (estimated_cost_clp >= 0),
  cache_hit boolean NOT NULL DEFAULT false,
  tools_used text[] NOT NULL DEFAULT '{}',
  tool_call_count integer NOT NULL DEFAULT 0 CHECK (tool_call_count >= 0),
  llm_call_count integer NOT NULL DEFAULT 0 CHECK (llm_call_count >= 0),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_events_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE public.intent_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  event_name text NOT NULL CHECK (event_name ~ '^[a-z0-9_]{3,64}$'),
  source text NOT NULL DEFAULT 'app',
  program_unique_code text,
  institution_code integer,
  career_generic_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intent_events_pkey PRIMARY KEY (id),
  CONSTRAINT intent_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------
-- institutions
CREATE INDEX idx_institutions_featured    ON public.institutions (is_featured, priority DESC);
CREATE INDEX idx_institutions_logo_url    ON public.institutions (logo_url) WHERE logo_url IS NOT NULL;
CREATE INDEX idx_institutions_embedding   ON public.institutions USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- career_generic
CREATE INDEX idx_career_generic_area      ON public.career_generic (area, tipo_institucion);
CREATE INDEX idx_career_generic_embedding ON public.career_generic USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- programs
CREATE INDEX idx_programs_institution     ON public.programs (institution_code);
CREATE INDEX idx_programs_career_generic  ON public.programs (career_generic_id);
CREATE INDEX idx_programs_region          ON public.programs (region_code);
CREATE INDEX idx_programs_tipo            ON public.programs (tipo_institucion);
CREATE INDEX idx_programs_featured        ON public.programs (is_featured, priority DESC);
CREATE INDEX idx_programs_nombre_trgm     ON public.programs USING gin (nombre_carrera gin_trgm_ops);
CREATE INDEX idx_programs_embedding       ON public.programs USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- career_employability
CREATE INDEX idx_emp_inst_generic         ON public.career_employability (institution_code, career_generic_id);
CREATE INDEX idx_emp_nombre_trgm          ON public.career_employability USING gin (nombre_carrera_generica gin_trgm_ops);

-- chat_cache
CREATE INDEX idx_chat_cache_embedding     ON public.chat_cache USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ai_usage_events
CREATE INDEX idx_ai_usage_user_created    ON public.ai_usage_events (user_id, created_at DESC);

-- intent_events
CREATE INDEX idx_intent_user_created      ON public.intent_events (user_id, created_at DESC);

-- saved
CREATE INDEX idx_saved_user               ON public.saved (user_id);

-- chat_messages
CREATE INDEX idx_chat_messages_session    ON public.chat_messages (session_id, created_at DESC);

-- campuses
CREATE INDEX idx_campuses_institution     ON public.campuses (institution_code);
CREATE UNIQUE INDEX idx_campuses_inst_sede ON public.campuses (institution_code, nombre_sede);

-- career_generic (upsert conflict key)
ALTER TABLE public.career_generic
  ADD CONSTRAINT career_generic_area_tipo_nombre_key
  UNIQUE (area, tipo_institucion, nombre_carrera_generica);

-- program_admission_metrics (upsert conflict key)
ALTER TABLE public.program_admission_metrics
  ADD CONSTRAINT pam_code_dataset_year_key
  UNIQUE (program_unique_code, source_dataset, reference_year);

-- program_finance_reference (upsert conflict key)
ALTER TABLE public.program_finance_reference
  ADD CONSTRAINT pfr_code_dataset_year_key
  UNIQUE (program_unique_code, source_dataset, reference_year);

-- career_stats (upsert conflict key)
ALTER TABLE public.career_stats
  ADD CONSTRAINT career_stats_version_area_tipo_nombre_key
  UNIQUE (dataset_version, area, tipo_institucion, nombre_carrera_generica);

-- career_employability (upsert conflict key)
ALTER TABLE public.career_employability
  ADD CONSTRAINT career_emp_version_code_inst_nombre_key
  UNIQUE (dataset_version, source_row_code, nombre_institucion, nombre_carrera_generica);

-- ---------------------------------------------------------------------------
-- VISTA: programas vigentes (última versión por código único)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.programs_current AS
SELECT *
FROM public.programs;

-- ---------------------------------------------------------------------------
-- VISTA: ficha completa de programa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_program_full AS
SELECT
  p.*,
  i.tipo_institucion       AS inst_tipo,
  i.acreditacion_estado    AS inst_acreditacion_estado,
  i.acreditacion_anos      AS inst_acreditacion_anos,
  i.retencion_1er_ano_pct  AS inst_retencion,
  i.logo_url               AS inst_logo_url,
  i.pagina_web             AS inst_web,
  cg.nombre_carrera_generica,
  cg.area                  AS area_generica
FROM public.programs p
LEFT JOIN public.institutions i  ON i.institution_code = p.institution_code
LEFT JOIN public.career_generic cg ON cg.id = p.career_generic_id;

-- ---------------------------------------------------------------------------
-- FUNCIÓN RPC: búsqueda híbrida (embedding + filtros SQL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_hybrid(
  q_embedding vector(384),
  k int DEFAULT 6,
  min_score float DEFAULT 0.30
)
RETURNS TABLE (
  kind    text,
  ref_id  text,
  nombre  text,
  score   float,
  payload jsonb
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    'institution'::text,
    institution_code::text,
    nombre_institucion,
    (1 - (embedding <=> q_embedding))::float AS score,
    jsonb_build_object(
      'tipo',                 tipo_institucion,
      'direccion',            direccion_sede_central,
      'web',                  pagina_web,
      'acreditacion_anos',    acreditacion_anos,
      'matricula_pregrado',   matricula_pregrado_actual,
      'titulados_pregrado',   titulados_pregrado_actual,
      'retencion_pct',        retencion_1er_ano_pct
    ) AS payload
  FROM public.institutions
  WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> q_embedding)) >= min_score

  UNION ALL

  SELECT
    'career'::text,
    id::text,
    nombre_carrera_generica,
    (1 - (embedding <=> q_embedding))::float AS score,
    jsonb_build_object(
      'area',             area,
      'tipo_institucion', tipo_institucion
    ) AS payload
  FROM public.career_generic
  WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> q_embedding)) >= min_score

  UNION ALL

  SELECT
    'program'::text,
    program_unique_code,
    nombre_carrera || ' — ' || COALESCE(nombre_institucion, '') || ' (' || COALESCE(nombre_sede, '') || ')',
    (1 - (embedding <=> q_embedding))::float AS score,
    jsonb_build_object(
      'nombre_carrera',     nombre_carrera,
      'nombre_institucion', nombre_institucion,
      'nombre_sede',        nombre_sede,
      'region',             region,
      'jornada',            jornada,
      'arancel_anual',      arancel_anual,
      'vacantes_semestre_1',vacantes_semestre_1,
      'puntaje_promedio_matriculados', puntaje_promedio_matriculados
    ) AS payload
  FROM public.programs
  WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> q_embedding)) >= min_score

  ORDER BY score DESC
  LIMIT k;
$$;

REVOKE EXECUTE ON FUNCTION public.search_hybrid(vector, int, float) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_hybrid(vector, int, float) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own" ON public.users FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users_admin" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- saved
ALTER TABLE public.saved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_own" ON public.saved FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_admin" ON public.saved FOR ALL TO service_role USING (true) WITH CHECK (true);

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_own" ON public.chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_messages_admin" ON public.chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ai_usage_events
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_own" ON public.ai_usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "ai_usage_admin" ON public.ai_usage_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- intent_events
ALTER TABLE public.intent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intent_own" ON public.intent_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "intent_admin" ON public.intent_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- rate_limits (solo service_role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service manages rate_limits" ON public.rate_limits;
CREATE POLICY "service manages rate_limits" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- institutions (lectura pública, escritura solo service_role)
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions_read" ON public.institutions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "institutions_admin" ON public.institutions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs_read" ON public.programs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "programs_admin" ON public.programs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- career_generic
ALTER TABLE public.career_generic ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_generic_read" ON public.career_generic FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "career_generic_admin" ON public.career_generic FOR ALL TO service_role USING (true) WITH CHECK (true);

-- career_stats
ALTER TABLE public.career_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_stats_read" ON public.career_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "career_stats_admin" ON public.career_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- career_employability
ALTER TABLE public.career_employability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_employability_read" ON public.career_employability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "career_employability_admin" ON public.career_employability FOR ALL TO service_role USING (true) WITH CHECK (true);

-- campuses
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campuses_read" ON public.campuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "campuses_admin" ON public.campuses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- regions / comunas (lectura libre)
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions_read" ON public.regions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "regions_admin" ON public.regions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.comunas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comunas_read" ON public.comunas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comunas_admin" ON public.comunas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- careers / curricula (lectura libre)
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "careers_read" ON public.careers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "careers_admin" ON public.careers FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curricula_read" ON public.curricula FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "curricula_admin" ON public.curricula FOR ALL TO service_role USING (true) WITH CHECK (true);

-- discovery_sessions (lectura libre, escritura service_role)
ALTER TABLE public.discovery_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discovery_read" ON public.discovery_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "discovery_admin" ON public.discovery_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- chat_cache (service_role solo)
ALTER TABLE public.chat_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_cache_admin" ON public.chat_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

-- plans / institution_subscriptions
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read" ON public.plans FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "plans_admin" ON public.plans FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inst_subs_admin" ON public.institution_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- program_admission_metrics / program_finance_reference
ALTER TABLE public.program_admission_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pam_read" ON public.program_admission_metrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pam_admin" ON public.program_admission_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.program_finance_reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pfr_read" ON public.program_finance_reference FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pfr_admin" ON public.program_finance_reference FOR ALL TO service_role USING (true) WITH CHECK (true);
