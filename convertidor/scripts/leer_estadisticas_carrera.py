import argparse
import json
from pathlib import Path

import pandas as pd


SHEET_NAME = "Hoja1"

COLUMN_RENAME_MAP = {
    "ID": "ID",
    "Área": "Area",
    "Tipo de institución": "Tipo_de_institucion",
    "Carrera genérica": "Carrera_generica",
    "1er año": "1er_ano",
    "2° año": "2do_ano",
    "3er año": "3er_ano",
    "4° año": "4to_ano",
    "5° año": "5to_ano",
    "10% inferior 1er año": "Percentil_10_inferior_1er_ano",
    "25% inferior 1er año": "Percentil_25_inferior_1er_ano",
    "Percentil 50 1er año": "Percentil_50_1er_ano",
    "25% superior 1er año": "Percentil_25_superior_1er_ano",
    "10% superior 1er año": "Percentil_10_superior_1er_ano",
    "10% inferior 5° año": "Percentil_10_inferior_5to_ano",
    "25% inferior 5° año": "Percentil_25_inferior_5to_ano",
    "Percentil 50 5° año": "Percentil_50_5to_ano",
    "25% superior 5° año": "Percentil_25_superior_5to_ano",
    "10% superior 5° año": "Percentil_10_superior_5to_ano",
    "Ingresos al 4° año 2020": "Ingresos_al_4to_ano_2020",
    "Ingresos al 4° año 2021": "Ingresos_al_4to_ano_2021",
    "Ingresos al 4° año 2022": "Ingresos_al_4to_ano_2022",
    "Ingresos al 4° año 2023": "Ingresos_al_4to_ano_2023",
    "Ingresos al 4° año 2024": "Ingresos_al_4to_ano_2024",
    "Empleabilidad 1er año": "Empleabilidad_1er_ano",
    "Empleabilidad 2° año": "Empleabilidad_2do_ano",
    "Empleabilidad 1er año - 2020": "Empleabilidad_1er_ano_2020",
    "Empleabilidad 1er año - 2021": "Empleabilidad_1er_ano_2021",
    "Empleabilidad 1er año - 2022": "Empleabilidad_1er_ano_2022",
    "Empleabilidad 1er año - 2023": "Empleabilidad_1er_ano_2023",
    "Empleabilidad 1er año - 2024": "Empleabilidad_1er_ano_2024",
    "Empleabilidad 2° año - 2020": "Empleabilidad_2do_ano_2020",
    "Empleabilidad 2° año - 2021": "Empleabilidad_2do_ano_2021",
    "Empleabilidad 2° año - 2022": "Empleabilidad_2do_ano_2022",
    "Empleabilidad 2° año - 2023": "Empleabilidad_2do_ano_2023",
    "Empleabilidad 2° año - 2024": "Empleabilidad_2do_ano_2024",
    "Titulados Mujeres": "Titulados_Mujeres",
    "Titulados Hombres": "Titulados_Hombres",
    "Titulados Total": "Titulados_Total",
    "Duración Formal": "Duracion_Formal",
    "Duración Real": "Duracion_Real",
    "Matrícula 1er año Mujeres": "Matricula_1er_ano_Mujeres",
    "Matrícula 1er año Hombres": "Matricula_1er_ano_Hombres",
    "Total Matrícula 1er año": "Total_Matricula_1er_ano",
    "Matrícula Total Mujeres": "Matricula_Total_Mujeres",
    "Matrícula Total Hombres": "Matricula_Total_Hombres",
    "Matrícula Total": "Matricula_Total",
    "Retención 1er año": "Retencion_1er_ano",
    "Retención 2° año": "Retencion_2do_ano",
    "Municipal y Servicios Locales": "Municipal_y_Servicios_Locales",
    "Partiular Subvencionado": "Particular_Subvencionado",
    "Particular Subvencionado": "Particular_Subvencionado",
    "Particular Pagado": "Particular_Pagado",
    "Administración Delegada": "Administracion_Delegada",
}


REQUIRED_COLUMNS = [
    "ID",
    "Area",
    "Tipo_de_institucion",
    "Carrera_generica",
    "1er_ano",
    "2do_ano",
    "3er_ano",
    "4to_ano",
    "5to_ano",
    "Percentil_10_inferior_1er_ano",
    "Percentil_25_inferior_1er_ano",
    "Percentil_50_1er_ano",
    "Percentil_25_superior_1er_ano",
    "Percentil_10_superior_1er_ano",
    "Percentil_10_inferior_5to_ano",
    "Percentil_25_inferior_5to_ano",
    "Percentil_50_5to_ano",
    "Percentil_25_superior_5to_ano",
    "Percentil_10_superior_5to_ano",
    "Ingresos_al_4to_ano_2020",
    "Ingresos_al_4to_ano_2021",
    "Ingresos_al_4to_ano_2022",
    "Ingresos_al_4to_ano_2023",
    "Ingresos_al_4to_ano_2024",
    "Empleabilidad_1er_ano",
    "Empleabilidad_2do_ano",
    "Empleabilidad_1er_ano_2020",
    "Empleabilidad_1er_ano_2021",
    "Empleabilidad_1er_ano_2022",
    "Empleabilidad_1er_ano_2023",
    "Empleabilidad_1er_ano_2024",
    "Empleabilidad_2do_ano_2020",
    "Empleabilidad_2do_ano_2021",
    "Empleabilidad_2do_ano_2022",
    "Empleabilidad_2do_ano_2023",
    "Empleabilidad_2do_ano_2024",
    "Titulados_Mujeres",
    "Titulados_Hombres",
    "Titulados_Total",
    "Duracion_Formal",
    "Duracion_Real",
    "Matricula_1er_ano_Mujeres",
    "Matricula_1er_ano_Hombres",
    "Total_Matricula_1er_ano",
    "Matricula_Total_Mujeres",
    "Matricula_Total_Hombres",
    "Matricula_Total",
    "Retencion_1er_ano",
    "Retencion_2do_ano",
    "Municipal_y_Servicios_Locales",
    "Particular_Subvencionado",
    "Particular_Pagado",
    "Administracion_Delegada",
]


def normalize_col_name(name: str) -> str:
    return " ".join(str(name).replace("\xa0", " ").split())


def is_empty_si_dash(value) -> bool:
    if pd.isna(value):
        return True
    text = str(value).strip().lower()
    return text in {"", "nan", "s/i", "-"}


def clean_text_lower(value) -> str:
    if is_empty_si_dash(value):
        return ""
    return str(value).strip().lower()


def clean_number_or_empty(value):
    if is_empty_si_dash(value):
        return ""

    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return value

    text = str(value).strip().replace(",", ".")
    try:
        number = float(text)
        if number.is_integer():
            return int(number)
        return number
    except ValueError:
        return clean_text_lower(value)


def to_float_or_empty(value):
    if is_empty_si_dash(value):
        return ""
    try:
        return float(str(value).strip().replace(",", "."))
    except ValueError:
        return ""


def to_int_or_empty(value):
    if is_empty_si_dash(value):
        return ""
    try:
        return int(float(str(value).strip().replace(",", ".")))
    except ValueError:
        return ""


def to_clp_or_empty(value):
    if is_empty_si_dash(value):
        return ""
    try:
        return int(round(float(str(value).strip().replace(",", "."))))
    except ValueError:
        return ""


def to_percentage_or_empty(value):
    if is_empty_si_dash(value):
        return ""

    try:
        number = float(str(value).strip().replace(",", "."))
    except ValueError:
        return ""

    if number <= 1:
        number = number * 100

    return round(number, 1)


def load_rows_as_objects(xlsx_path: Path) -> list[dict]:
    df = pd.read_excel(xlsx_path, sheet_name=SHEET_NAME, header=1)
    df.columns = [normalize_col_name(c) for c in df.columns]
    df = df.rename(columns=COLUMN_RENAME_MAP)

    missing_columns = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_columns:
        missing = ", ".join(missing_columns)
        raise ValueError(f"Faltan columnas en el Excel: {missing}")

    records = []
    for _, row in df.iterrows():
        record_id = clean_number_or_empty(row.get("ID"))
        if record_id == "":
            continue

        obj = {
            "ID": record_id,
            "Area": clean_text_lower(row.get("Area")),
            "Tipo_de_institucion": clean_text_lower(row.get("Tipo_de_institucion")),
            "Carrera_generica": clean_text_lower(row.get("Carrera_generica")),
            "Ingreso_promedio_bruto_mensual_septiembre": {
                "ano_2025": {
                    "1er_ano": to_clp_or_empty(row.get("1er_ano")),
                    "2do_ano": to_clp_or_empty(row.get("2do_ano")),
                    "3er_ano": to_clp_or_empty(row.get("3er_ano")),
                    "4to_ano": to_clp_or_empty(row.get("4to_ano")),
                    "5to_ano": to_clp_or_empty(row.get("5to_ano")),
                }
            },
            "Tramos_de_ingreso_bruto_mensual_septiembre": {
                "ano_2025": {
                    "Percentil_10_inferior_1er_ano": to_clp_or_empty(row.get("Percentil_10_inferior_1er_ano")),
                    "Percentil_25_inferior_1er_ano": to_clp_or_empty(row.get("Percentil_25_inferior_1er_ano")),
                    "Percentil_50_1er_ano": to_clp_or_empty(row.get("Percentil_50_1er_ano")),
                    "Percentil_25_superior_1er_ano": to_clp_or_empty(row.get("Percentil_25_superior_1er_ano")),
                    "Percentil_10_superior_1er_ano": to_clp_or_empty(row.get("Percentil_10_superior_1er_ano")),
                    "Percentil_10_inferior_5to_ano": to_clp_or_empty(row.get("Percentil_10_inferior_5to_ano")),
                    "Percentil_25_inferior_5to_ano": to_clp_or_empty(row.get("Percentil_25_inferior_5to_ano")),
                    "Percentil_50_5to_ano": to_clp_or_empty(row.get("Percentil_50_5to_ano")),
                    "Percentil_25_superior_5to_ano": to_clp_or_empty(row.get("Percentil_25_superior_5to_ano")),
                    "Percentil_10_superior_5to_ano": to_clp_or_empty(row.get("Percentil_10_superior_5to_ano")),
                }
            },
            "Evolucion_Ingresos_al_4to_ano_cohortes_2016_a_2020": {
                "ano_2020": to_clp_or_empty(row.get("Ingresos_al_4to_ano_2020")),
                "ano_2021": to_clp_or_empty(row.get("Ingresos_al_4to_ano_2021")),
                "ano_2022": to_clp_or_empty(row.get("Ingresos_al_4to_ano_2022")),
                "ano_2023": to_clp_or_empty(row.get("Ingresos_al_4to_ano_2023")),
                "ano_2024": to_clp_or_empty(row.get("Ingresos_al_4to_ano_2024")),
            },
            "Empleabilidad": {
                "Empleabilidad_1er_ano": to_percentage_or_empty(row.get("Empleabilidad_1er_ano")),
                "Empleabilidad_2do_ano": to_percentage_or_empty(row.get("Empleabilidad_2do_ano")),
            },
            "Evolucion_Empleabilidad_1er_ano_cohortes_2019_a_2023": {
                "ano_2020": to_percentage_or_empty(row.get("Empleabilidad_1er_ano_2020")),
                "ano_2021": to_percentage_or_empty(row.get("Empleabilidad_1er_ano_2021")),
                "ano_2022": to_percentage_or_empty(row.get("Empleabilidad_1er_ano_2022")),
                "ano_2023": to_percentage_or_empty(row.get("Empleabilidad_1er_ano_2023")),
                "ano_2024": to_percentage_or_empty(row.get("Empleabilidad_1er_ano_2024")),
            },
            "Evolucion_Empleabilidad_2do_ano_cohortes_2018_a_2022": {
                "ano_2020": to_percentage_or_empty(row.get("Empleabilidad_2do_ano_2020")),
                "ano_2021": to_percentage_or_empty(row.get("Empleabilidad_2do_ano_2021")),
                "ano_2022": to_percentage_or_empty(row.get("Empleabilidad_2do_ano_2022")),
                "ano_2023": to_percentage_or_empty(row.get("Empleabilidad_2do_ano_2023")),
                "ano_2024": to_percentage_or_empty(row.get("Empleabilidad_2do_ano_2024")),
            },
            "Titulados": {
                "ano_2024": {
                    "Titulados_Mujeres": to_int_or_empty(row.get("Titulados_Mujeres")),
                    "Titulados_Hombres": to_int_or_empty(row.get("Titulados_Hombres")),
                    "Titulados_Total": to_int_or_empty(row.get("Titulados_Total")),
                }
            },
            "Duracion_Titulados_semestres": {
                "ano_2024": {
                    "Duracion_Formal": to_float_or_empty(row.get("Duracion_Formal")),
                    "Duracion_Real": to_float_or_empty(row.get("Duracion_Real")),
                }
            },
            "Matricula_1er_ano": {
                "ano_2025": {
                    "Matricula_1er_ano_Mujeres": to_int_or_empty(row.get("Matricula_1er_ano_Mujeres")),
                    "Matricula_1er_ano_Hombres": to_int_or_empty(row.get("Matricula_1er_ano_Hombres")),
                    "Total_Matricula_1er_ano": to_int_or_empty(row.get("Total_Matricula_1er_ano")),
                }
            },
            "Matricula_Total": {
                "ano_2025": {
                    "Matricula_Total_Mujeres": to_int_or_empty(row.get("Matricula_Total_Mujeres")),
                    "Matricula_Total_Hombres": to_int_or_empty(row.get("Matricula_Total_Hombres")),
                    "Matricula_Total": to_int_or_empty(row.get("Matricula_Total")),
                }
            },
            "Retencion_cohorte_2023": {
                "Retencion_1er_ano": to_percentage_or_empty(row.get("Retencion_1er_ano")),
                "Retencion_2do_ano": to_percentage_or_empty(row.get("Retencion_2do_ano")),
            },
            "Distribucion_segun_establecimiento_de_origen_Matricula_2025": {
                "Municipal_y_Servicios_Locales": to_percentage_or_empty(row.get("Municipal_y_Servicios_Locales")),
                "Particular_Subvencionado": to_percentage_or_empty(row.get("Particular_Subvencionado")),
                "Particular_Pagado": to_percentage_or_empty(row.get("Particular_Pagado")),
                "Administracion_Delegada": to_percentage_or_empty(row.get("Administracion_Delegada")),
            },
        }

        records.append(obj)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lee estadísticas de carrera y genera objetos anidados por año/cohorte."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="Buscador_EstadísticasCarrera_2025_2026_SIES.xlsx",
        help="Ruta del archivo XLSX de entrada.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="buscar_estadisticas_carrera_objetos.json",
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
