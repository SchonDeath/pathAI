# Matriz de normalizacion de JSON 2026

## Objetivo

Definir, para los 7 JSON de `convertidor/scripts/resultado_json`, que campos:

- viven en una tabla maestra
- viven en una tabla satelite o de metricas
- se heredan por join y no deben duplicarse en la capa core
- deben preservarse como objeto JSON en staging o en una columna `jsonb`

## Regla general

1. La capa `staging` guarda cada JSON casi tal cual llega, sin perder columnas.
2. La capa `core` guarda cada atributo una sola vez en la entidad que le corresponde.
3. La capa de lectura puede denormalizar para frontend, pero no define ownership.

## Tablas core recomendadas

| Tabla | Grano | Fuente principal |
| --- | --- | --- |
| `institutions` | 1 fila por institucion | `informacion_institucion_objetos.json` |
| `campuses` | 1 fila por sede | `oferta_academica_objetos.json` |
| `programs` | 1 fila por oferta/programa (`codigo_unico`) | `oferta_academica_objetos.json` |
| `program_admission_metrics` | 1 fila por programa y periodo de admision | `buscar_carrera_objetos.json` |
| `program_finance_reference` | 1 fila por programa y anio de referencia financiera | `aranceles_*_objetos.json` |
| `generic_careers` | 1 fila por carrera generica normalizada | `oferta_academica_objetos.json` y `buscar_*` |
| `generic_career_outcomes` | 1 fila por carrera generica + area + tipo institucion + periodo | `buscar_empleabilidad_ingresos_objetos.json`, `buscar_estadisticas_carrera_objetos.json` |

## Llaves canonicas recomendadas

- `institution_code`: `Codigo_institucion` o `Codigo_IES`
- `campus_code`: `Codigo_Sede`
- `program_unique_code`: `Codigo_Unico` / `Codigo_Unico_de_carrera` / `codigo_unico`
- `generic_career_name`: nombre normalizado de `Area_Carrera_Generica`, `Carrera_generica` o `Nombre_carrera_generica`

## Regla de herencia

Si un campo describe una institucion, se guarda solo en `institutions` y otras tablas guardan la FK.

Si un campo describe una sede, se guarda solo en `campuses` y `programs` guarda `campus_id`.

Si un campo describe una oferta concreta, se guarda en `programs`.

Si un campo cambia por anio, cohorte o fuente estadistica, se guarda en una tabla satelite.

Si un campo es una estructura compleja de tramos, distribuciones, cohortes o metadatos de origen, se preserva como `jsonb` o en staging y no se aplana hasta que exista una necesidad de consulta clara.

## Fuente de verdad por dominio

| Dominio | Fuente de verdad | Fuentes secundarias |
| --- | --- | --- |
| Identidad institucional | `informacion_institucion_objetos.json` | `buscar_carrera`, `aranceles_*` |
| Identidad de sede | `oferta_academica_objetos.json` | `buscar_carrera`, `aranceles_*` |
| Identidad de programa | `oferta_academica_objetos.json` | `buscar_carrera`, `aranceles_*` |
| Metricas de admision y vacantes | `buscar_carrera_objetos.json` | `oferta_academica_objetos.json` |
| Referencia financiera | `aranceles_referencia_2026_becas_objetos.json` y `aranceles_referencia_2026_creditos_objetos.json` | `oferta_academica_objetos.json`, `buscar_carrera_objetos.json` |
| Estadisticas agregadas por carrera generica | `buscar_empleabilidad_ingresos_objetos.json`, `buscar_estadisticas_carrera_objetos.json` | ninguna |

## Matriz por archivo

### 1. aranceles_referencia_2026_becas_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `codigo_unico` | `program_finance_reference.program_unique_code` | Si | No | Llave de union con `programs`. |
| `tipo_de_institucion` | No | No | `institutions` | Redundante para core. Solo validar consistencia. |
| `nombre_institucion` | No | No | `institutions` | Redundante para core. |
| `nombre_de_la_sede` | No | No | `campuses` | Redundante para core. |
| `nombre_carrera` | No | No | `programs` | Redundante para core. |
| `jornada` | No | No | `programs` | Redundante si el programa ya fija jornada. |
| `version` | No | No | `programs` | Redundante si el programa ya fija version. |
| `arancel_anual` | `program_finance_reference.arancel_anual_source` | Si | No | Guardar valor y/o objeto original si viene estructurado. |
| `arancel_de_referencia_con_beca` | `program_finance_reference.arancel_referencia_beca` | Si | No | Metrica financiera propia de esta fuente. |
| `hoja_origen` | `program_finance_reference.source_sheet` | Si | No | Trazabilidad de importacion. |

### 2. aranceles_referencia_2026_creditos_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `codigo_unico` | `program_finance_reference.program_unique_code` | Si | No | Misma llave canonica del archivo de becas. |
| `tipo_de_institucion` | No | No | `institutions` | Redundante para core. |
| `nombre_institucion` | No | No | `institutions` | Redundante para core. |
| `nombre_de_la_sede` | No | No | `campuses` | Redundante para core. |
| `nombre_carrera` | No | No | `programs` | Redundante para core. |
| `jornada` | No | No | `programs` | Redundante. |
| `version` | No | No | `programs` | Redundante. |
| `arancel_anual` | `program_finance_reference.arancel_anual_source` | Si | No | Debe fusionarse con la fila del archivo de becas. |
| `arancel_de_referencia_con_creditos` | `program_finance_reference.arancel_referencia_credito` | Si | No | Metrica financiera propia de esta fuente. |
| `hoja_origen` | `program_finance_reference.source_sheet` | Si | No | Trazabilidad. |

### 3. buscar_carrera_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `Codigo_Unico_de_carrera` | `program_admission_metrics.program_unique_code` | Si | No | Llave de union con `programs`. |
| `Codigo_institucion` | No | No | `institutions` | FK derivable desde `programs`. Guardar solo en staging. |
| `Area_del_conocimiento` | `programs.knowledge_area` | No | `programs` | Si ya existe en `programs`, no repetir. |
| `Tipo_de_institucion` | No | No | `institutions` | Redundante. |
| `Nombre_institucion` | No | No | `institutions` | Redundante. |
| `Nombre_carrera` | No | No | `programs` | Redundante. |
| `Region` | No | No | `campuses` | Redundante si la sede ya define region. |
| `Jornada` | No | No | `programs` | Redundante. |
| `Sede` | No | No | `campuses` | Redundante. |
| `Arancel_Anual_2026` | `program_admission_metrics.arancel_anual_reportado` | Si | No | Guardar como metrica observada de esta fuente si desean comparar con finanzas. |
| `Costo_de_titulacion` | `programs.titling_cost` | No | `programs` | En `oferta_academica` ya existe `Costo_Titulacion`. No duplicar. |
| `Duracion_Formal_semestres` | `programs.formal_duration_semesters` | No | `programs` | Preferir la fuente maestra de programa. |
| `Nivel_carrera` | `programs.level` | No | `programs` | Redundante. |
| `Matricula_Total_Femenina` | `program_admission_metrics.enrollment_total_female_payload` | Si | No | Estructura compuesta; guardar JSON o desglosar despues. |
| `Matricula_Total_Masculina` | `program_admission_metrics.enrollment_total_male_payload` | Si | No | Igual criterio. |
| `Matricula_Total` | `program_admission_metrics.enrollment_total_payload` | Si | No | Igual criterio. |
| `Titulacion_Femenina` | `program_admission_metrics.graduation_female_payload` | Si | No | Igual criterio. |
| `Titulacion_Masculina` | `program_admission_metrics.graduation_male_payload` | Si | No | Igual criterio. |
| `Titulacion_Total` | `program_admission_metrics.graduation_total_payload` | Si | No | Igual criterio. |
| `Rango_ingreso_a_1er_ano_con_PAES` | `program_admission_metrics.entry_score_range_payload` | Si | No | Estructura compuesta de puntajes. |
| `Promedio_PAES_de_Matricula_1er_ano` | `program_admission_metrics.avg_paes_payload` | Si | No | Estructura compuesta. |
| `Promedio_NEM_de_Matricula` | `program_admission_metrics.avg_nem_payload` | Si | No | Estructura compuesta. |
| `Vacantes_1er_semestre` | `program_admission_metrics.first_semester_vacancies_payload` | Si | No | Estructura compuesta o historica. |
| `Ponderaciones` | `program_admission_metrics.weights_payload` | Si | No | Si quieren consulta atomica, luego migrar a columnas. |
| `Area_Carrera_Generica` | `programs.generic_career_name` | No | `programs` | Preferir la definicion maestra de programa. |
| `Valor_UF_Referencia` | `program_admission_metrics.uf_reference_value` | Si | No | Metrica contextual del periodo. |

### 4. buscar_empleabilidad_ingresos_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `Codigo` | `generic_career_outcomes.source_row_code` | Si | No | Identificador de fila de la fuente, no llave de negocio. |
| `Tipo_de_institucion` | `generic_career_outcomes.institution_type` | Si | No | Parte del grano agregado. |
| `Nombre_de_institucion` | No | No | Ninguna fija | No usar como FK maestra salvo validacion; esta fuente parece agregada. |
| `Area` | `generic_career_outcomes.area` | Si | No | Parte del grano agregado. |
| `Nombre_carrera_generica` | `generic_career_outcomes.generic_career_name` | Si | No | Debe pasar por catalogo `generic_careers`. |
| `Porcentaje_titulados_con_continuidad_de_estudios` | `generic_career_outcomes.study_continuity_pct_text` | Si | No | Guardar inicialmente como texto normalizado o numero derivado. |
| `Retencion_1er_ano` | `generic_career_outcomes.retention_year_1_text` | Si | No | Igual criterio. |
| `Empleabilidad_1er_ano` | `generic_career_outcomes.employability_year_1_text` | Si | No | Igual criterio. |
| `Empleabilidad_2do_ano` | `generic_career_outcomes.employability_year_2_text` | Si | No | Igual criterio. |
| `Ingreso_Promedio_al_4to_ano` | `generic_career_outcomes.avg_income_year_4_text` | Si | No | Guardar como texto bruto y numero parseado si aplica. |

### 5. buscar_estadisticas_carrera_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `ID` | `generic_career_outcomes.source_row_id` | Si | No | Identificador tecnico de la fuente. |
| `Area` | `generic_career_outcomes.area` | Si | No | Parte del grano agregado. |
| `Tipo_de_institucion` | `generic_career_outcomes.institution_type` | Si | No | Parte del grano agregado. |
| `Carrera_generica` | `generic_career_outcomes.generic_career_name` | Si | No | Catalogar y normalizar. |
| `Ingreso_promedio_bruto_mensual_septiembre` | `generic_career_outcomes.gross_income_september_payload` | Si | No | Estructura compuesta. |
| `Tramos_de_ingreso_bruto_mensual_septiembre` | `generic_career_outcomes.gross_income_brackets_payload` | Si | No | JSON compuesto. |
| `Evolucion_Ingresos_al_4to_ano_cohortes_2016_a_2020` | `generic_career_outcomes.income_evolution_payload` | Si | No | JSON compuesto por cohorte. |
| `Empleabilidad` | `generic_career_outcomes.employability_payload` | Si | No | JSON compuesto. |
| `Evolucion_Empleabilidad_1er_ano_cohortes_2019_a_2023` | `generic_career_outcomes.employability_year_1_evolution_payload` | Si | No | JSON compuesto por cohorte. |
| `Evolucion_Empleabilidad_2do_ano_cohortes_2018_a_2022` | `generic_career_outcomes.employability_year_2_evolution_payload` | Si | No | JSON compuesto por cohorte. |
| `Titulados` | `generic_career_outcomes.graduates_payload` | Si | No | JSON compuesto. |
| `Duracion_Titulados_semestres` | `generic_career_outcomes.graduate_duration_payload` | Si | No | JSON compuesto. |
| `Matricula_1er_ano` | `generic_career_outcomes.first_year_enrollment_payload` | Si | No | JSON compuesto. |
| `Matricula_Total` | `generic_career_outcomes.total_enrollment_payload` | Si | No | JSON compuesto. |
| `Retencion_cohorte_2023` | `generic_career_outcomes.retention_2023_payload` | Si | No | JSON compuesto. |
| `Distribucion_segun_establecimiento_de_origen_Matricula_2025` | `generic_career_outcomes.origin_school_distribution_payload` | Si | No | JSON compuesto. |

### 6. informacion_institucion_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `Codigo_institucion` | `institutions.institution_code` | Si | No | Llave maestra institucional. |
| `Tipo_de_institucion` | `institutions.institution_type` | Si | No | Atributo propio de institucion. |
| `Nombre_institucion` | `institutions.name` | Si | No | Nombre canonico. |
| `Autonomia` | `institutions.autonomy_status` | Si | No | Atributo institucional. |
| `Direccion_Sede_Central` | `institutions.main_campus_address` | Si | No | Atributo institucional, no de todas las sedes. |
| `Pagina_web` | `institutions.website_url` | Si | No | Atributo institucional. |
| `Acreditacion_30_octubre_2025` | `institutions.accreditation_status_2025_10_30` | Si | No | Snapshot institucional. |
| `Anos_acreditacion_30_octubre_2025` | `institutions.accreditation_years_2025_10_30` | Si | No | Snapshot institucional. |
| `Vigencia_acreditacion_30_octubre_2025` | `institutions.accreditation_valid_until_text` | Si | No | Snapshot institucional. |
| `Areas_acreditadas_30_octubre_2025` | `institutions.accredited_areas_text` | Si | No | Si luego se necesita, separar a tabla hija. |
| `Areas_electivas_acreditacion_30_octubre_2025` | `institutions.elective_accreditation_areas_text` | Si | No | Igual criterio. |
| `Informacion_Financiera_Estados_Financieros_2024` | `institutions.financial_statements_2024_payload` | Si | No | JSON compuesto. |
| `Matricula_Pregrado` | `institutions.undergraduate_enrollment_payload` | Si | No | JSON compuesto. |
| `Porcentaje_Matricula_Pregrado_2025_por_area` | `institutions.undergraduate_enrollment_by_area_payload` | Si | No | JSON compuesto. |
| `Porcentaje_Matricula_Pregrado_2025_por_establecimiento_origen` | `institutions.undergraduate_enrollment_origin_payload` | Si | No | JSON compuesto. |
| `Retencion_Pregrado` | `institutions.undergraduate_retention_payload` | Si | No | JSON compuesto. |
| `Estudiantes_2025` | `institutions.students_2025_payload` | Si | No | JSON compuesto. |
| `Titulados_Pregrado` | `institutions.undergraduate_graduates_payload` | Si | No | JSON compuesto. |
| `Duracion_Programas_Pregrado_2024` | `institutions.undergraduate_program_duration_2024_payload` | Si | No | JSON compuesto. |
| `Matricula_Posgrado` | `institutions.postgraduate_enrollment_payload` | Si | No | JSON compuesto. |
| `Titulados_Posgrado` | `institutions.postgraduate_graduates_payload` | Si | No | JSON compuesto. |
| `Distribucion_Academicos_JCE_2025` | `institutions.academic_staff_distribution_2025_payload` | Si | No | JSON compuesto. |
| `Personal_Academico_2025` | `institutions.academic_staff_2025_payload` | Si | No | JSON compuesto. |
| `Infraestructura_y_Equipamiento_Junio_2025` | `institutions.infrastructure_2025_06_payload` | Si | No | JSON compuesto. |

### 7. oferta_academica_objetos.json

| Campo origen | Destino core | Guardar en core | Se hereda de | Decision |
| --- | --- | --- | --- | --- |
| `Codigo_Unico` | `programs.program_unique_code` | Si | No | Llave maestra de programa. |
| `Tipo_Institucion_2` | No | No | `institutions` | Redundante para core. |
| `Region_Sede` | `campuses.region` | Si | No | Atributo de sede. |
| `Provincia_Sede` | `campuses.province` | Si | No | Atributo de sede. |
| `Comuna_Sede` | `campuses.commune` | Si | No | Atributo de sede. |
| `Area_del_conocimiento` | `programs.knowledge_area` | Si | No | Atributo de programa. |
| `Area_Carrera_Generica` | `programs.generic_career_name` | Si | No | Atributo puente hacia `generic_careers`. |
| `Codigo_IES` | `programs.institution_code` | Si | No | FK hacia `institutions`. |
| `Nombre_IES` | No | No | `institutions` | Redundante. |
| `Codigo_Sede` | `programs.campus_code` | Si | No | FK hacia `campuses`. |
| `Nombre_Sede` | `campuses.name` | Si | No | Atributo de sede. |
| `Codigo_Carrera` | `programs.career_code` | Si | No | Codigo funcional de carrera, no reemplaza `Codigo_Unico`. |
| `Nombre_Carrera` | `programs.name` | Si | No | Nombre de programa. |
| `Modalidad` | `programs.modality` | Si | No | Atributo de programa. |
| `Jornada` | `programs.shift` | Si | No | Atributo de programa. |
| `Version` | `programs.version` | Si | No | Atributo de programa. |
| `Tipo_Carrera` | `programs.career_type` | Si | No | Atributo de programa. |
| `Plan_Especial` | `programs.special_plan_flag_text` | Si | No | Atributo de programa. |
| `Duracion_Estudios` | `programs.study_duration_semesters` | Si | No | Atributo de programa. |
| `Duracion_Titulacion` | `programs.titling_duration_semesters` | Si | No | Atributo de programa. |
| `Duracion_Total` | `programs.total_duration_semesters` | Si | No | Atributo de programa. |
| `Regimen` | `programs.regimen_value` | Si | No | Atributo de programa. |
| `Duracion_formal_del_Regimen` | `programs.regimen_formal_duration` | Si | No | Atributo de programa. |
| `Nombre_Titulo` | `programs.title_name` | Si | No | Atributo de programa. |
| `Grado_Academico` | `programs.academic_degree` | Si | No | Atributo de programa. |
| `Nivel_Carrera` | `programs.level` | Si | No | Atributo de programa. |
| `Demre` | `programs.demre_flag` | Si | No | Atributo de programa. |
| `Ano_Inicio` | `programs.start_year` | Si | No | Atributo de programa. |
| `Acreditacion_Carrera_o_Programa` | `programs.program_accreditation_text` | Si | No | Atributo de programa. |
| `Elegibilidad_Beca_Pedagogia` | `programs.pedagogy_scholarship_eligibility_text` | Si | No | Atributo de programa. |
| `Requisito_Ingreso` | `programs.entry_requirement_text` | Si | No | Atributo de programa. |
| `Semestres_reconocidos` | `programs.recognized_semesters` | Si | No | Atributo de programa. |
| `Ponderacion_Notas` | `programs.weight_grades` | Si | No | Atributo de programa. |
| `Ponderacion_Ranking_Notas` | `programs.weight_ranking` | Si | No | Atributo de programa. |
| `Ponderacion_Lenguaje` | `programs.weight_language` | Si | No | Atributo de programa. |
| `Ponderacion_Matematicas` | `programs.weight_math_1` | Si | No | Atributo de programa. |
| `Ponderacion_Matematicas_2` | `programs.weight_math_2` | Si | No | Atributo de programa. |
| `Ponderacion_Historia` | `programs.weight_history` | Si | No | Atributo de programa. |
| `Ponderacion_Ciencias` | `programs.weight_science` | Si | No | Atributo de programa. |
| `Ponderacion_Otros` | `programs.weight_other` | Si | No | Atributo de programa. |
| `Vacantes_Semestre_Uno` | `programs.first_semester_vacancies` | Si | No | Atributo de programa; si cambia por anio, mover a tabla anual. |
| `Vacantes_Semestre_Dos` | `programs.second_semester_vacancies` | Si | No | Mismo criterio. |
| `Matricula_Anual` | `programs.annual_enrollment_capacity_or_count` | Si | No | Revisar semantica exacta al cargar. |
| `Costo_Titulacion` | `programs.titling_cost` | Si | No | Atributo de programa. |
| `Costo_Certificado_Diploma` | `programs.diploma_certificate_cost` | Si | No | Atributo de programa. |
| `Arancel_Anual` | `programs.annual_tuition_list_price` | Si | No | Precio de lista del programa. No reemplaza referencias financieras. |

## Duplicados que no deben quedar repetidos en core

| Campo conceptual | Donde aparece | Donde debe vivir |
| --- | --- | --- |
| Nombre institucion | `informacion_institucion`, `buscar_carrera`, `aranceles_*`, `oferta_academica` | `institutions.name` |
| Tipo de institucion | casi todos los archivos | `institutions.institution_type` |
| Nombre sede | `oferta_academica`, `buscar_carrera`, `aranceles_*` | `campuses.name` |
| Jornada | `oferta_academica`, `buscar_carrera`, `aranceles_*` | `programs.shift` |
| Version | `oferta_academica`, `aranceles_*` | `programs.version` |
| Nombre carrera | `oferta_academica`, `buscar_carrera`, `aranceles_*` | `programs.name` |
| Arancel anual | `oferta_academica`, `buscar_carrera`, `aranceles_*` | `programs.annual_tuition_list_price` mas `program_finance_reference` para referencias oficiales |
| Nivel carrera | `oferta_academica`, `buscar_carrera` | `programs.level` |
| Area del conocimiento | `oferta_academica`, `buscar_carrera` | `programs.knowledge_area` |
| Carrera generica | `oferta_academica`, `buscar_carrera`, `buscar_empleabilidad_ingresos`, `buscar_estadisticas_carrera` | `generic_careers` y FK desde `programs` / `generic_career_outcomes` |

## Que conviene heredar y no copiar

- `programs` debe guardar `institution_id` y `campus_id`, no volver a copiar nombre de institucion ni nombre de sede.
- `program_admission_metrics` debe guardar `program_id` y solo metricas de admision o observadas en esa fuente.
- `program_finance_reference` debe guardar `program_id`, `reference_year`, valores de beca y credito, y trazabilidad de origen.
- `generic_career_outcomes` no debe colgar directo de `institutions` ni de `programs` si la fuente es agregada; debe colgar de `generic_careers` y usar dimensiones de area y tipo institucion.

## Campos que conviene dejar como JSONB al inicio

- Todos los campos que en la inspeccion aparecen como objeto compuesto.
- Ejemplos: matriculas, titulaciones, rangos PAES, ponderaciones estructuradas, tramos de ingresos, distribuciones, cohortes, infraestructura y estados financieros.

Esto reduce riesgo de perder informacion al reconstruir la base. Luego se pueden extraer tablas hijas especificas solo para los objetos que realmente se consulten.

## Criterio operativo para la migracion

1. Cargar los 7 JSON a `staging` sin descartar columnas.
2. Construir catalogos canonicos: instituciones, sedes, carreras genericas, programas.
3. Resolver `program_unique_code` como la union principal entre `oferta_academica`, `buscar_carrera` y `aranceles_*`.
4. Resolver `institution_code` como la union principal entre `informacion_institucion` y `programs`.
5. Normalizar nombres solo para matching y catalogos, no como columnas duplicadas.
6. Crear vistas de lectura que devuelvan el perfil completo de institucion y programa.

## Decision corta

No se deben usar todos los campos en todas las tablas.

Si un dato ya tiene dueno en la capa core, las otras fuentes lo aportan solo como validacion o staging.

Lo repetido se hereda por join. Lo variable por periodo o fuente se guarda en satelites. Lo complejo se preserva como JSONB hasta que haga falta modelarlo en tablas hijas.