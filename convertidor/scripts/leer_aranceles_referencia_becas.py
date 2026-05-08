import argparse
import json
import re
from pathlib import Path

import pandas as pd


UF_2026 = 39727.96
SOURCE_SHEETS = ["Universidades", "CFT e IP", "FFAA"]


def _normalize_col_name(column: str) -> str:
    normalized = column.strip().lower()
    normalized = normalized.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    normalized = normalized.replace("ñ", "n")
    normalized = re.sub(r"\s+", "_", normalized)
    normalized = re.sub(r"[^a-z0-9_]+", "", normalized)
    return normalized


def _to_lower_strings(value):
    if pd.isna(value):
        return ""
    if isinstance(value, str):
        return value.strip().lower()
    return value


def _extract_numeric(text: str) -> float | None:
    cleaned = text.strip().lower()
    if cleaned == "":
        return None

    # Mantiene solo digitos, separadores y signo.
    cleaned = re.sub(r"[^0-9,.-]", "", cleaned)
    if cleaned == "":
        return None

    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")

    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_amount(value):
    if pd.isna(value):
        return ""

    if isinstance(value, str):
        text = value.strip().lower()
        if text == "":
            return ""

        number = _extract_numeric(text)
        if number is None:
            return ""

        if "uf" in text:
            return int(round(number * UF_2026))

        return int(round(number))

    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return ""


def _build_record(row: pd.Series, normalized_columns: dict[str, str], sheet_name: str) -> dict:
    record = {}
    for original_col, normalized_col in normalized_columns.items():
        if original_col in {
            "ARANCEL ANUAL 2026",
            "Arancel de Referencia 2026 Final Becas (incremento = 0)",
        }:
            continue
        record[normalized_col] = _to_lower_strings(row.get(original_col))

    arancel_anual_monto = _parse_amount(row.get("ARANCEL ANUAL 2026"))
    arancel_referencia_beca_monto = _parse_amount(
        row.get("Arancel de Referencia 2026 Final Becas (incremento = 0)")
    )

    record["arancel_anual"] = {
        "2026": {
            "monto": arancel_anual_monto,
        }
    }
    record["arancel_de_referencia_con_beca"] = {
        "2026": {
            "monto": arancel_referencia_beca_monto,
        }
    }
    record["hoja_origen"] = sheet_name.strip().lower()

    return record


def load_rows_as_objects(xlsx_path: Path) -> list[dict]:
    all_records = []

    for sheet_name in SOURCE_SHEETS:
        df = pd.read_excel(xlsx_path, sheet_name=sheet_name)
        normalized_columns = {column: _normalize_col_name(column) for column in df.columns}

        for _, row in df.iterrows():
            record = _build_record(row, normalized_columns, sheet_name)
            if record.get("codigo_unico", "") == "":
                continue
            all_records.append(record)

    return all_records


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lee anexo de aranceles 2026 becas y convierte las filas de 3 hojas en objetos JSON."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="anexo_1_aranceles_de_referencia_2026_becas.xlsx",
        help="Ruta del archivo XLSX de entrada.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="resultado_json/aranceles_referencia_2026_becas_objetos.json",
        help="Ruta del archivo JSON de salida.",
    )
    args = parser.parse_args()

    rows = load_rows_as_objects(Path(args.input))

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Filas convertidas: {len(rows)}")
    print(f"Archivo generado: {output_path}")


if __name__ == "__main__":
    main()