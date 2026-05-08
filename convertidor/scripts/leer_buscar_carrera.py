import argparse
import json
import re
from pathlib import Path

import pandas as pd

SHEET_NAME = "Busc. Carreras  2025-2026"
UF_VALUE = 39_727.96


COLUMN_RENAME_MAP = {
    "Código único de carrera": "Codigo_Unico_de_carrera",
    "Código institución": "Codigo_institucion",
    "Área del conocimiento": "Area_del_conocimiento",
    "Tipo de institución": "Tipo_de_institucion",
    "Nombre institución": "Nombre_institucion",
    "Nombre carrera": "Nombre_carrera",
    "Región": "Region",
    "Jornada": "Jornada",
    "Sede": "Sede",
    "Arancel Anual 2026": "Arancel_Anual_2026",
    "Costo de titulación": "Costo_de_titulacion",
    "Duración Formal (semestres)": "Duracion_Formal_semestres",
    "Nivel carrera": "Nivel_carrera",
    "Matrícula Total Femenina 2025": "_mat_tot_fem_2025",
    "Matrícula Total Masculina 2025": "_mat_tot_mas_2025",
    "Matrícula Total 2025": "_mat_tot_2025",
    "Matrícula 1er año Femenina 2025": "_mat_1er_fem_2025",
    "Matrícula 1er año Masculina 2025": "_mat_1er_mas_2025",
    "Matrícula 1er año Total 2025": "_mat_1er_tot_2025",
    "Titulación Femenina 2024": "_tit_fem_2024",
    "Titlación Masculina 2024": "_tit_mas_2024",
    "Titulación Total 2024": "_tit_tot_2024",
    "Rango ingreso a 1er año con PAES 2025": "_rango_ingreso_2025",
    "Promedio PAES 2025 de Matrícula 1er año 2025": "_prom_paes_2025",
    "Promedio NEM 2025 de Matrícula 2025": "_prom_nem_2025",
    "Vacantes 1er semestre": "_vacantes_2025",
    "NEM": "_pond_nem",
    "Ranking": "_pond_ranking",
    "PAES Lenguaje": "_pond_paes_lenguaje",
    "PAES Matemáticas": "_pond_paes_matematicas",
    "PAES Matemáticas 2": "_pond_paes_matematicas_2",
    "PAES Historia": "_pond_paes_historia",
    "PAES Ciencias": "_pond_paes_ciencias",
    "Otros": "_pond_otros",
    "Área Carrera Genérica": "Area_Carrera_Generica",
}


def parse_money_to_clp(value) -> int:
    if pd.isna(value):
        return 0

    s = str(value).strip()
    if not s or s.lower() in ("nan", "s/i", "-"):
        return 0

    def parse_number_token(token: str) -> float:
        token = token.strip()
        token = re.sub(r"[^\d,.-]", "", token)
        if not token:
            return 0.0

        if "," in token and "." in token:
            token = token.replace(".", "").replace(",", ".")
        elif "," in token:
            token = token.replace(",", ".")
        elif "." in token:
            parts = token.split(".")
            if len(parts) > 1 and all(len(p) == 3 for p in parts[1:]):
                token = "".join(parts)

        try:
            return float(token)
        except ValueError:
            return 0.0

    if "uf" in s.lower():
        match = re.search(r"uf\s*([\d\.,]+)", s, flags=re.IGNORECASE)
        uf_amount = parse_number_token(match.group(1) if match else s)
        return int(round(uf_amount * UF_VALUE))

    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else 0


def to_int(value) -> int:
    if pd.isna(value):
        return 0

    s = str(value).strip()
    if not s or s.lower() in ("nan", "s/i", "-"):
        return 0

    try:
        return int(float(s))
    except ValueError:
        return 0


def to_int_or_uf_clp(value) -> int:
    if pd.isna(value):
        return 0

    s = str(value).strip()
    if "uf" in s.lower():
        return parse_money_to_clp(s)

    return to_int(value)


def to_float(value) -> float:
    if pd.isna(value):
        return 0.0

    s = str(value).strip()
    if not s or s.lower() in ("nan", "s/i", "-"):
        return 0.0

    try:
        return float(s)
    except ValueError:
        return 0.0


def to_str_lower(value, keep_case: bool = False) -> str:
    if pd.isna(value):
        return ""

    s = str(value).strip()
    if not s or s.lower() in ("nan", "s/i", "-"):
        return ""

    if keep_case:
        return s
    return s.lower()


def load_rows_as_objects(xlsx_path: Path) -> list[dict]:
    # header=1 ignora la primera fila con el título "BUSCADOR DE CARRERAS 2026"
    df = pd.read_excel(xlsx_path, sheet_name=SHEET_NAME, header=1)
    df.columns = [str(c).strip() for c in df.columns]
    df = df.rename(columns=COLUMN_RENAME_MAP)

    required_columns = [
        "Codigo_Unico_de_carrera",
        "Codigo_institucion",
        "Area_del_conocimiento",
        "Tipo_de_institucion",
        "Nombre_institucion",
        "Nombre_carrera",
        "Region",
        "Jornada",
        "Sede",
        "Arancel_Anual_2026",
        "Costo_de_titulacion",
        "Duracion_Formal_semestres",
        "Nivel_carrera",
        "_mat_tot_fem_2025",
        "_mat_tot_mas_2025",
        "_mat_tot_2025",
        "_tit_fem_2024",
        "_tit_mas_2024",
        "_tit_tot_2024",
        "_rango_ingreso_2025",
        "_prom_paes_2025",
        "_prom_nem_2025",
        "_vacantes_2025",
        "_pond_nem",
        "_pond_ranking",
        "_pond_paes_lenguaje",
        "_pond_paes_matematicas",
        "_pond_paes_matematicas_2",
        "_pond_paes_historia",
        "_pond_paes_ciencias",
        "_pond_otros",
        "Area_Carrera_Generica",
    ]

    missing_columns = [c for c in required_columns if c not in df.columns]
    if missing_columns:
        raise ValueError(f"Faltan columnas requeridas: {', '.join(missing_columns)}")

    records = []
    for _, row in df.iterrows():
        codigo_unico = to_str_lower(row.get("Codigo_Unico_de_carrera"), keep_case=True)
        if not codigo_unico:
            continue

        obj = {
            "Codigo_Unico_de_carrera": codigo_unico,
            "Codigo_institucion": to_int(row.get("Codigo_institucion")),
            "Area_del_conocimiento": to_str_lower(row.get("Area_del_conocimiento")),
            "Tipo_de_institucion": to_str_lower(row.get("Tipo_de_institucion")),
            "Nombre_institucion": to_str_lower(row.get("Nombre_institucion")),
            "Nombre_carrera": to_str_lower(row.get("Nombre_carrera")),
            "Region": to_str_lower(row.get("Region")),
            "Jornada": to_str_lower(row.get("Jornada")),
            "Sede": to_str_lower(row.get("Sede")),
            "Arancel_Anual_2026": parse_money_to_clp(row.get("Arancel_Anual_2026")),
            "Costo_de_titulacion": parse_money_to_clp(row.get("Costo_de_titulacion")),
            "Duracion_Formal_semestres": to_int(row.get("Duracion_Formal_semestres")),
            "Nivel_carrera": to_str_lower(row.get("Nivel_carrera")),
            "Matricula_Total_Femenina": {
                "ano_2025": to_int_or_uf_clp(row.get("_mat_tot_fem_2025"))
            },
            "Matricula_Total_Masculina": {
                "ano_2025": to_int_or_uf_clp(row.get("_mat_tot_mas_2025"))
            },
            "Matricula_Total": {
                "ano_2025": to_int_or_uf_clp(row.get("_mat_tot_2025"))
            },
            "Titulacion_Femenina": {
                "ano_2024": to_int(row.get("_tit_fem_2024"))
            },
            "Titulacion_Masculina": {
                "ano_2024": to_int(row.get("_tit_mas_2024"))
            },
            "Titulacion_Total": {
                "ano_2024": to_int(row.get("_tit_tot_2024"))
            },
            "Rango_ingreso_a_1er_ano_con_PAES": {
                "ano_2025": to_str_lower(row.get("_rango_ingreso_2025"))
            },
            "Promedio_PAES_de_Matricula_1er_ano": {
                "ano_2025": to_float(row.get("_prom_paes_2025"))
            },
            "Promedio_NEM_de_Matricula": {
                "ano_2025": to_float(row.get("_prom_nem_2025"))
            },
            "Vacantes_1er_semestre": {
                "ano_2025": to_int(row.get("_vacantes_2025"))
            },
            "Ponderaciones": {
                "ano_2026": {
                    "NEM": to_int(row.get("_pond_nem")),
                    "Ranking": to_int(row.get("_pond_ranking")),
                    "PAES_Lenguaje": to_int(row.get("_pond_paes_lenguaje")),
                    "PAES_Matematicas": to_int(row.get("_pond_paes_matematicas")),
                    "PAES_Matematicas_2": to_int(row.get("_pond_paes_matematicas_2")),
                    "PAES_Historia": to_int(row.get("_pond_paes_historia")),
                    "PAES_Ciencias": to_int(row.get("_pond_paes_ciencias")),
                    "Otros": to_int(row.get("_pond_otros")),
                }
            },
            "Area_Carrera_Generica": to_str_lower(row.get("Area_Carrera_Generica")),
            "Valor_UF_Referencia": UF_VALUE,
        }

        records.append(obj)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lee buscar_carrera.xlsx y convierte cada fila en un objeto con estructura anidada por anio."
    )
    parser.add_argument(
        "-i", "--input", default="buscar_carrera.xlsx", help="Ruta del archivo XLSX de entrada."
    )
    parser.add_argument(
        "-o", "--output", default="buscar_carrera_objetos.json", help="Ruta del archivo JSON de salida."
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
