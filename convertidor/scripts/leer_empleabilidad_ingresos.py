import argparse
import json
from pathlib import Path

import pandas as pd


SHEET_NAME = "Carreras e IES (2025-2026)"

COLUMN_RENAME_MAP = {
    "Código": "Codigo",
    "Tipo de institución": "Tipo_de_institucion",
    "Nombre de institución": "Nombre_de_institucion",
    "Área": "Area",
    "Nombre carrera genérica": "Nombre_carrera_generica",
    "% titulados con continuidad de estudios": "Porcentaje_titulados_con_continuidad_de_estudios",
    "Retención 1er año": "Retencion_1er_ano",
    "Empleabilidad 1er año": "Empleabilidad_1er_ano",
    "Empleabilidad 2° año": "Empleabilidad_2do_ano",
    "Ingreso Promedio al 4° año": "Ingreso_Promedio_al_4to_ano",
}


def normalize_column_name(name: str) -> str:
    # Reemplaza espacios no separables (NBSP) y compacta espacios.
    return " ".join(str(name).replace("\xa0", " ").split())


def is_empty_or_si(value) -> bool:
    if pd.isna(value):
        return True
    text = str(value).strip().lower()
    return text in {"", "nan", "s/i", "-"}


def to_number_or_zero(value):
    if is_empty_or_si(value):
        return 0
    try:
        number = float(str(value).replace(",", "."))
        if number.is_integer():
            return int(number)
        return number
    except ValueError:
        return 0


def to_lower_text(value) -> str:
    if is_empty_or_si(value):
        return ""
    return str(value).strip().lower()


def to_percent_string(value) -> str:
    if is_empty_or_si(value):
        return "0%"

    text = str(value).strip().replace(",", ".")
    if text.endswith("%"):
        clean = text[:-1].strip()
        try:
            num = float(clean)
        except ValueError:
            return "0%"
    else:
        try:
            num = float(text)
        except ValueError:
            return "0%"
        if num <= 1:
            num *= 100

    if float(num).is_integer():
        return f"{int(num)}%"

    return f"{num:.2f}".rstrip("0").rstrip(".") + "%"


def ingreso_value(value) -> str:
    if is_empty_or_si(value):
        return "sin informacion"
    return str(value).strip().lower()


def load_rows_as_objects(xlsx_path: Path) -> list[dict]:
    df = pd.read_excel(xlsx_path, sheet_name=SHEET_NAME)
    df.columns = [normalize_column_name(col) for col in df.columns]
    df = df.rename(columns=COLUMN_RENAME_MAP)

    required = [
        "Codigo",
        "Tipo_de_institucion",
        "Nombre_de_institucion",
        "Area",
        "Nombre_carrera_generica",
        "Porcentaje_titulados_con_continuidad_de_estudios",
        "Retencion_1er_ano",
        "Empleabilidad_1er_ano",
        "Empleabilidad_2do_ano",
        "Ingreso_Promedio_al_4to_ano",
    ]

    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas requeridas: {', '.join(missing)}")

    records = []
    for _, row in df.iterrows():
        codigo = to_number_or_zero(row.get("Codigo"))
        if codigo == 0:
            continue

        obj = {
            "Codigo": codigo,
            "Tipo_de_institucion": to_lower_text(row.get("Tipo_de_institucion")),
            "Nombre_de_institucion": to_lower_text(row.get("Nombre_de_institucion")),
            "Area": to_lower_text(row.get("Area")),
            "Nombre_carrera_generica": to_lower_text(row.get("Nombre_carrera_generica")),
            "Porcentaje_titulados_con_continuidad_de_estudios": to_percent_string(row.get("Porcentaje_titulados_con_continuidad_de_estudios")),
            "Retencion_1er_ano": to_percent_string(row.get("Retencion_1er_ano")),
            "Empleabilidad_1er_ano": to_percent_string(row.get("Empleabilidad_1er_ano")),
            "Empleabilidad_2do_ano": to_percent_string(row.get("Empleabilidad_2do_ano")),
            "Ingreso_Promedio_al_4to_ano": ingreso_value(row.get("Ingreso_Promedio_al_4to_ano")),
        }

        records.append(obj)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lee el buscador de empleabilidad/ingresos y genera objetos con columnas seleccionadas."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="Buscador_Empleabilidad_ingresos_2025_2026_SIES.xlsx",
        help="Ruta del archivo XLSX de entrada.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="buscar_empleabilidad_ingresos_objetos.json",
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
