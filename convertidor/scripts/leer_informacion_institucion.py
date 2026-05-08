import argparse
import json
from pathlib import Path

import pandas as pd


SHEET_NAME = "Buscador IES 25-26"


def clean_value(value):
    if pd.isna(value):
        return ""

    if isinstance(value, str):
        text = value.strip()
        if text.lower() in {"", "n/a", "-", "s/i", "nan"}:
            return ""
        return text

    if isinstance(value, float) and value.is_integer():
        return int(value)

    return value


def clean_percentage_value(value):
    if pd.isna(value):
        return ""

    if isinstance(value, str):
        text = value.strip()
        if text.lower() in {"", "n/a", "-", "s/i", "nan"}:
            return ""
        if text.endswith("%"):
            text = text[:-1].strip()
        text = text.replace(",", ".")
        try:
            return float(text)
        except ValueError:
            return text

    try:
        # Mantiene el valor numérico tal como viene de Excel, sin redondear.
        return float(value)
    except (ValueError, TypeError):
        return ""


def build_obj(row: pd.Series) -> dict:
    return {
        "Codigo_institucion": clean_value(row.get("Código institución")),
        "Tipo_de_institucion": clean_value(row.get("Tipo de institución")),
        "Nombre_institucion": clean_value(row.get("Nombre institución")),
        "Autonomia": clean_value(row.get("Autonomía")),
        "Direccion_Sede_Central": clean_value(row.get("Dirección Sede Central")),
        "Pagina_web": clean_value(row.get("Página web")),
        "Acreditacion_30_octubre_2025": clean_value(row.get("Acreditación (30 de octubre de 2025)")),
        "Anos_acreditacion_30_octubre_2025": clean_value(row.get("Años acreditación (30 de octubre de 2025)")),
        "Vigencia_acreditacion_30_octubre_2025": clean_value(row.get("Vigencia acreditación (30 de octubre de 2025)")),
        "Areas_acreditadas_30_octubre_2025": clean_value(row.get("Áreas acreditadas (30 de octubre de 2025)")),
        "Areas_electivas_acreditacion_30_octubre_2025": clean_value(row.get("Áreas electivas de acreditación (30 de octubre de 2025)")),
        "Informacion_Financiera_Estados_Financieros_2024": {
            "Tipo_de_sociedad": clean_value(row.get("Tipo de sociedad")),
            "RUT": clean_value(row.get("RUT")),
            "Estado_Financiero": clean_value(row.get("Estado Financiero")),
            "Principio_contable": clean_value(row.get("Principio contable")),
            "Activo_corriente": clean_value(row.get("Activo corriente")),
            "Activo_No_corriente": clean_value(row.get("Activo No corriente")),
            "Total_Activos": clean_value(row.get("Total Activos")),
            "Pasivo_Corriente": clean_value(row.get("Pasivo Corriente")),
            "Pasivo_No_corriente": clean_value(row.get("Pasivo No corriente")),
            "Patrimonio_Total": clean_value(row.get("Patrimonio Total")),
            "Total_Pasivo_y_Patrimonio": clean_value(row.get("Total Pasivo y Patrimonio")),
            "Ingresos_de_la_operacion": clean_value(row.get("Ingresos de la operación")),
            "Costos_y_Gastos_de_la_operacion": clean_value(row.get("Costos y Gastos de la operación")),
            "Otras_ganancias_o_perdidas": clean_value(row.get("Otras ganancias o pérdidas")),
            "Resultado_Financiero": clean_value(row.get("Resultado Financiero")),
            "Resultado_del_Ejercicio": clean_value(row.get("Resultado del Ejercicio")),
        },
        "Matricula_Pregrado": {
            "Matricula_Pregrado_2020": clean_value(row.get("Matrícula Pregrado 2020")),
            "Matricula_Pregrado_2021": clean_value(row.get("Matrícula Pregrado 2021")),
            "Matricula_Pregrado_2022": clean_value(row.get("Matrícula Pregrado 2022")),
            "Matricula_Pregrado_2023": clean_value(row.get("Matrícula Pregrado 2023")),
            "Matricula_Pregrado_2024": clean_value(row.get("Matrícula Pregrado 2024")),
            "Matricula_Pregrado_2025": clean_value(row.get("Matrícula Pregrado 2025")),
        },
        "Porcentaje_Matricula_Pregrado_2025_por_area": {
            "Administracion_y_Comercio": clean_percentage_value(row.get("Administración y Comercio")),
            "Agropecuaria": clean_percentage_value(row.get("Agropecuaria")),
            "Arte_y_Arquitectura": clean_percentage_value(row.get("Arte y Arquitectura")),
            "Ciencias_Basicas": clean_percentage_value(row.get("Ciencias Básicas")),
            "Ciencias_Sociales": clean_percentage_value(row.get("Ciencias Sociales")),
            "Derecho": clean_percentage_value(row.get("Derecho")),
            "Educacion": clean_percentage_value(row.get("Educación")),
            "Humanidades": clean_percentage_value(row.get("Humanidades")),
            "Salud": clean_percentage_value(row.get("Salud")),
            "Tecnologia": clean_percentage_value(row.get("Tecnología")),
        },
        "Porcentaje_Matricula_Pregrado_2025_por_establecimiento_origen": {
            "Municipal_y_Servicios_locales": clean_percentage_value(row.get("Municipal y Servicios locales")),
            "Particular_Subvencionado": clean_percentage_value(row.get("Particular Subvencionado")),
            "Particular_Pagado": clean_percentage_value(row.get("Particular Pagado")),
            "Administracion_Delegada": clean_percentage_value(row.get("Administración Delegada")),
        },
        "Retencion_Pregrado": {
            "Retencion_1er_ano_metodologia_historica": clean_percentage_value(row.get("Retención 1er año (acorde a metodología histórica del buscador)")),
            "Retencion_2do_ano": clean_percentage_value(row.get("Retención 2° año")),
            "Retencion_1er_ano_carreras_prof_tec_cohorte_2024": clean_percentage_value(row.get("Retención 1er año (carreras profesionales y técnicas) Cohorte 2024 (no está en el buscador)")),
        },
        "Estudiantes_2025": {
            "Promedio_NEM_matriculados_1er_ano_2025": clean_value(row.get("Promedio NEM matriculados 1er año 2025")),
            "Rango_estudiantes_con_NEM_1er_ano_2025": clean_value(row.get("Rango estudiantes con NEM")),
            "Promedio_PAES_matriculados_1er_ano_2025": clean_value(row.get("Promedio PAES matriculados 1er año 2025")),
            "Rango_estudiantes_con_PAES_1er_ano_2025": clean_value(row.get("Rango estudiantes con PAES")),
        },
        "Titulados_Pregrado": {
            "Titulados_Pregrado_2020": clean_value(row.get("Titulados Pregrado 2020")),
            "Titulados_Pregrado_2021": clean_value(row.get("Titulados Pregrado 2021")),
            "Titulados_Pregrado_2022": clean_value(row.get("Titulados Pregrado 2022")),
            "Titulados_Pregrado_2023": clean_value(row.get("Titulados Pregrado 2023")),
            "Titulados_Pregrado_2024": clean_value(row.get("Titulados Pregrado 2024")),
        },
        "Duracion_Programas_Pregrado_2024": {
            "Duracion_Formal": clean_value(row.get("Duración Formal")),
            "Duracion_Real": clean_value(row.get("Duración Real")),
        },
        "Matricula_Posgrado": {
            "Matricula_Posgrado_2020": clean_value(row.get("Matrícula Posgrado 2020")),
            "Matricula_Posgrado_2021": clean_value(row.get("Matrícula Posgrado 2021")),
            "Matricula_Posgrado_2022": clean_value(row.get("Matrícula Posgrado 2022")),
            "Matricula_Posgrado_2023": clean_value(row.get("Matrícula Posgrado 2023")),
            "Matricula_Posgrado_2024": clean_value(row.get("Matrícula Posgrado 2024")),
            "Matricula_Posgrado_2025": clean_value(row.get("Matrícula Posgrado 2025")),
        },
        "Titulados_Posgrado": {
            "Titulados_Posgrado_2020": clean_value(row.get("Titulados Posgrado 2020")),
            "Titulados_Posgrado_2021": clean_value(row.get("Titulados Posgrado 2021")),
            "Titulados_Posgrado_2022": clean_value(row.get("Titulados Posgrado 2022")),
            "Titulados_Posgrado_2023": clean_value(row.get("Titulados Posgrado 2023")),
            "Titulados_Posgrado_2024": clean_value(row.get("Titulados Posgrado 2024")),
        },
        "Distribucion_Academicos_JCE_2025": {
            "N_JCE_Doctorado": clean_value(row.get("N° JCE Doctorado ")),
            "N_JCE_Magister": clean_value(row.get("N° JCE Magíster")),
            "N_JCE_Especialidad_medica_y_odontologica": clean_value(row.get("N° JCE Especialidad médica y odontológica")),
            "N_JCE_Profesionales_y_Licenciados": clean_value(row.get("N° JCE Profesionales y Licenciados ")),
            "N_JCE_Tecnicos": clean_value(row.get("N° JCE Técnicos")),
            "N_JCE_Sin_grado_o_titulo": clean_value(row.get("N° JCE Sin grado o título o s/i")),
            "Total_JCE": clean_value(row.get("Total JCE")),
            "Estudiantes_Pre_y_Posgrado_por_JCE": clean_value(row.get("Estudiantes (Pre y Posgrado)/JCE")),
        },
        "Personal_Academico_2025": {
            "Porcentaje_JCE_con_Doctorado": clean_percentage_value(row.get("% JCE con Doctorado")),
            "Porcentaje_JCE_con_Magister": clean_percentage_value(row.get("% JCE con Magíster")),
            "Porcentaje_JCE_Especialidad_medica_y_odontologica": clean_percentage_value(row.get("% JCE con Especialidad médica y odontológica")),
            "Porcentaje_JCE_titulo_Profesional_y_Licenciados": clean_percentage_value(row.get("% JCE título Profesional y Licenciados")),
            "Porcentaje_JCE_titulo_Tecnico": clean_percentage_value(row.get("% JCE con título Técnico ")),
            "Porcentaje_JCE_sin_grado_o_titulo": clean_percentage_value(row.get("% JCE sin grado o título o s/i")),
        },
        "Infraestructura_y_Equipamiento_Junio_2025": {
            "m2_construidos": clean_value(row.get("m² construidos")),
            "m2_construidos_ponderados": clean_value(row.get("m² construidos ponderados")),
            "N_volumenes_biblioteca": clean_value(row.get("N° de volúmenes de biblioteca")),
            "N_laboratorios_y_talleres": clean_value(row.get("N° de laboratorios y talleres")),
            "m2_construidos_laboratorios_y_talleres": clean_value(row.get("m² construidos laboratorios y talleres")),
            "N_computadores": clean_value(row.get("N° de computadores")),
            "m2_construidos_por_estudiante_jornada": clean_value(row.get("m² construidos por estudiante (jornada principal)")),
            "Volumenes_por_estudiante_Pre_y_Posgrado": clean_value(row.get("Volúmenes por estudiante (Pregrado y Posgrado)")),
            "Computadores_por_estudiante": clean_value(row.get("Computadores por estudiante (Pregrado y Posgrado)")),
            "m2_construidos_biblioteca": clean_value(row.get("m² construidos biblioteca")),
            "m2_areas_verdes_y_esparcimiento": clean_value(row.get("m² áreas verdes y esparcimiento")),
        },
    }


def load_rows_as_objects(xlsx_path: Path) -> list[dict]:
    df = pd.read_excel(xlsx_path, sheet_name=SHEET_NAME, header=1)

    records = []
    for _, row in df.iterrows():
        obj = build_obj(row)
        if obj["Codigo_institucion"] == "":
            continue
        records.append(obj)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lee informacion de instituciones 2025-2026 y genera objetos agrupados."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="informacion_institucion_2025_2026.xlsx",
        help="Ruta del archivo XLSX de entrada.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="informacion_institucion_objetos.json",
        help="Ruta del archivo JSON de salida.",
    )
    args = parser.parse_args()

    rows = load_rows_as_objects(Path(args.input))

    Path(args.output).write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Filas convertidas: {len(rows)}")
    print(f"Archivo generado: {args.output}")


if __name__ == "__main__":
    main()
