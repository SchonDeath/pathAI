import argparse
import json
from pathlib import Path

import pandas as pd


COLUMN_RENAME_MAP = {
    "Año": "Ano",
    "Código Único": "Codigo_Unico",
    "Tipo Institución 1": "Tipo_Institucion_1",
    "Tipo Institución 2": "Tipo_Institucion_2",
    "Tipo Institución 3": "Tipo_Institucion_3",
    "Región Sede": "Region_Sede",
    "Provincia Sede": "Provincia_Sede",
    "Comuna Sede": "Comuna_Sede",
    "Área del conocimiento": "Area_del_conocimiento",
    "Cine-F 97 Área": "Cine-F_97_Area",
    "Cine-F 97 Subárea": "Cine-F_97_Subarea",
    "Área Carrera Genérica": "Area_Carrera_Generica",
    "Cine-F 13 Área": "Cine-F_13_Area",
    "Cine-F 13 Subárea": "Cine-F_13_Subarea",
    "Tipo de institución": "Tipo_de_institucion",
    "Código IES": "Codigo_IES",
    "Nombre IES": "Nombre_IES",
    "Código Sede": "Codigo_Sede",
    "Nombre Sede": "Nombre_Sede",
    "Código Carrera": "Codigo_Carrera",
    "Nombre Carrera": "Nombre_Carrera",
    "Modalidad": "Modalidad",
    "Jornada": "Jornada",
    "Versión": "Version",
    "Tipo Carrera": "Tipo_Carrera",
    "Plan Especial": "Plan_Especial",
    "Duración Estudios": "Duracion_Estudios",
    "Duración Titulación": "Duracion_Titulacion",
    "Duración Total": "Duracion_Total",
    "Régimen": "Regimen",
    "Duración formal del Régimen": "Duracion_formal_del_Regimen",
    "Nombre Título": "Nombre_Titulo",
    "Grado Académico": "Grado_Academico",
    "Nivel Global": "Nivel_Global",
    "Nivel Carrera": "Nivel_Carrera",
    "Demre": "Demre",
    "Año Inicio": "Ano_Inicio",
    "Acreditación Carrera o Programa": "Acreditacion_Carrera_o_Programa",
    "Elegibilidad Beca Pedagogía": "Elegibilidad_Beca_Pedagogia",
    "Pedagogía Medicina Odontología, Otro": "Pedagogia_Medicina_Odontologia_Otro",
    "Requisito Ingreso": "Requisito_Ingreso",
    "Semestres reconocidos": "Semestres_reconocidos",
    "Área Actual o Área Origen del programa": "Area_Actual_o_Area_Origen_del_programa",
    "Área destino de Administración de Empresas y Derecho": "Area_destino_de_Administracion_de_Empresas_y_Derecho",
    "Área destino de Agricultura, Silvicultura, Pesca y Veterinaria": "Area_destino_de_Agricultura_Silvicultura_Pesca_y_Veterinaria",
    "Área destino de Artes y Humanidades": "Area_destino_de_Artes_y_Humanidades",
    "Área destino de Ciencias naturales, matemáticas y estadística": "Area_destino_de_Ciencias_naturales_matematicas_y_estadistica",
    "Área destino de Ciencias Sociales, Periodismo e Información": "Area_destino_de_Ciencias_Sociales_Periodismo_e_Informacion",
    "Área destino de Educación": "Area_destino_de_Educacion",
    "Área destino de Ingeniería, Industria y Construcción": "Area_destino_de_Ingenieria_Industria_y_Construccion",
    "Área destino de Salud y Bienestar": "Area_destino_de_Salud_y_Bienestar",
    "Área destino de Servicios": "Area_destino_de_Servicios",
    "Área destino de Tecnología de la Información y la Comunicación (TIC)": "Area_destino_de_Tecnologia_de_la_Informacion_y_la_Comunicacion_TIC",
    "Ponderación Notas": "Ponderacion_Notas",
    "Ponderación Ranking Notas": "Ponderacion_Ranking_Notas",
    "Ponderación Lenguaje": "Ponderacion_Lenguaje",
    "Ponderación Matemáticas": "Ponderacion_Matematicas",
    "Ponderación Matemáticas 2": "Ponderacion_Matematicas_2",
    "Ponderación Historia": "Ponderacion_Historia",
    "Ponderación Ciencias": "Ponderacion_Ciencias",
    "Ponderación Otros": "Ponderacion_Otros",
    "Vacantes Semestre Uno": "Vacantes_Semestre_Uno",
    "Vacantes Semestre Dos": "Vacantes_Semestre_Dos",
    "Formato Valor": "Formato_Valor",
    "Matrícula Anual": "Matricula_Anual",
    "Costo Titulación": "Costo_Titulacion",
    "Costo Certificado Diploma": "Costo_Certificado_Diploma",
    "Arancel Anual": "Arancel_Anual",
    "Vigencia": "Vigencia",
}


SELECTED_COLUMNS = [
    "Codigo_Unico",
    "Tipo_Institucion_2",
    "Region_Sede",
    "Provincia_Sede",
    "Comuna_Sede",
    "Area_del_conocimiento",
    "Area_Carrera_Generica",
    "Codigo_IES",
    "Nombre_IES",
    "Codigo_Sede",
    "Nombre_Sede",
    "Codigo_Carrera",
    "Nombre_Carrera",
    "Modalidad",
    "Jornada",
    "Version",
    "Tipo_Carrera",
    "Plan_Especial",
    "Duracion_Estudios",
    "Duracion_Titulacion",
    "Duracion_Total",
    "Regimen",
    "Duracion_formal_del_Regimen",
    "Nombre_Titulo",
    "Grado_Academico",
    "Nivel_Carrera",
    "Demre",
    "Ano_Inicio",
    "Acreditacion_Carrera_o_Programa",
    "Elegibilidad_Beca_Pedagogia",
    "Requisito_Ingreso",
    "Semestres_reconocidos",
    "Ponderacion_Notas",
    "Ponderacion_Ranking_Notas",
    "Ponderacion_Lenguaje",
    "Ponderacion_Matematicas",
    "Ponderacion_Matematicas_2",
    "Ponderacion_Historia",
    "Ponderacion_Ciencias",
    "Ponderacion_Otros",
    "Vacantes_Semestre_Uno",
    "Vacantes_Semestre_Dos",
    "Matricula_Anual",
    "Costo_Titulacion",
    "Costo_Certificado_Diploma",
    "Arancel_Anual",
]


def load_rows_as_objects(xlsx_path: Path) -> list[dict]:
    df = pd.read_excel(xlsx_path)
    df = df.rename(columns=COLUMN_RENAME_MAP)

    missing_columns = [column for column in SELECTED_COLUMNS if column not in df.columns]
    if missing_columns:
        missing_list = ", ".join(missing_columns)
        raise ValueError(f"Faltan columnas en el Excel: {missing_list}")

    filtered_df = df[SELECTED_COLUMNS]

    # Elegibilidad_Beca_Pedagogia: vacío → 'No Tiene'
    filtered_df["Elegibilidad_Beca_Pedagogia"] = (
        filtered_df["Elegibilidad_Beca_Pedagogia"].fillna("No Tiene")
    )

    # Resto de NaN → 0
    filtered_df = filtered_df.fillna(0)

    # Columnas que deben ser enteros
    int_columns = [
        "Duracion_formal_del_Regimen",
        "Ponderacion_Notas",
        "Ponderacion_Ranking_Notas",
        "Ponderacion_Lenguaje",
        "Ponderacion_Matematicas",
        "Ponderacion_Matematicas_2",
        "Ponderacion_Historia",
        "Ponderacion_Ciencias",
        "Ponderacion_Otros",
    ]
    for col in int_columns:
        filtered_df[col] = filtered_df[col].astype(int)

    records = filtered_df.to_dict(orient="records")

    def normalize_row(row: dict) -> dict:
        result = {}
        for key, value in row.items():
            if isinstance(value, str) and key != "Codigo_Unico":
                result[key] = value.lower()
            else:
                result[key] = value
        return result

    return [normalize_row(row) for row in records]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lee oferta academica XLSX y convierte cada fila en un objeto con columnas seleccionadas."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="oferta_academica.xlsx",
        help="Ruta del archivo XLSX de entrada.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="oferta_academica_objetos.json",
        help="Ruta del archivo JSON de salida.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    rows = load_rows_as_objects(input_path)

    output_path.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Filas convertidas: {len(rows)}")
    print(f"Archivo generado: {output_path}")


if __name__ == "__main__":
    main()