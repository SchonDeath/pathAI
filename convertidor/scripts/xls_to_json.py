"""
Convierte archivo XLS/XLSX a JSON limpio.

Uso:
    python scripts/xls_to_json.py <archivo.xlsx> [hoja] [--head N] [--header-row N] [--preset buscar_carrera|empleabilidad_ingresos|estadisticas_carrera]

Ejemplos:
    python scripts/xls_to_json.py "oferta_academica_2026.xlsx"
    python scripts/xls_to_json.py "oferta_academica_2026.xlsx" "Hoja1"
    python scripts/xls_to_json.py "oferta_academica_2026.xlsx" --head 10
    python scripts/xls_to_json.py "buscar_carrera.xlsx" --preset buscar_carrera
    python scripts/xls_to_json.py "Buscador_EstadísticasCarrera_2025_2026_SIES.xlsx" --preset estadisticas_carrera
"""

import sys
import json
import re
import pandas as pd
from pathlib import Path


PERCENT_FIELDS = {
    'municipal_y_servicios_locales': 'Municipal y Servicios Locales',
    'particular_subvencionado': 'Particular Subvencionado',
    'particular_pagado': 'Particular Pagado',
    'administración_delegada': 'Administración Delegada',
}

PONDERACION_FIELDS = {
    'nem': 'NEM',
    'ranking': 'Ranking',
    'paes_lenguaje': 'PAES Lenguaje',
    'paes_matemáticas': 'PAES Matemáticas',
    'paes_matemáticas_2': 'PAES Matemáticas 2',
    'paes_historia': 'PAES Historia',
    'paes_ciencias': 'PAES Ciencias',
    'otros': 'Otros',
}

EMPLEABILIDAD_SHEET = 'Carreras e IES (2025-2026)'
ESTADISTICAS_SHEET = 'Hoja1'


def clean_key(col: str) -> str:
    """Convierte nombre de columna a snake_case limpio"""
    col = str(col).strip().lower()
    col = re.sub(r'[\s\-/\\()°%#]+', '_', col)
    col = re.sub(r'[^a-z0-9_áéíóúüñ]', '', col)
    col = re.sub(r'_+', '_', col).strip('_')
    return col or 'col'


def parse_money(text: str):
    """Convierte strings como '$ 3.407.000' a int"""
    if not isinstance(text, str):
        return text
    s = text.strip().replace('$', '').replace('.', '').replace(' ', '')
    if s.isdigit():
        return int(s)
    return text


def normalize_value(val):
    """Normaliza valores con heurísticas para texto numérico y vacíos comunes"""
    if pd.isna(val):
        return None

    if isinstance(val, str):
        raw = val.strip()
        if raw in ('', '-', 's/i', 'S/I', 'NO APLICA'):
            return None

        money = parse_money(raw)
        if isinstance(money, int):
            return money

        # Decimal simple
        if re.fullmatch(r'\d+\.\d+', raw):
            num = float(raw)
            if num.is_integer():
                return int(num)
            return num

        # Entero simple
        if re.fullmatch(r'\d+', raw):
            return int(raw)

        return raw

    if isinstance(val, float):
        if val.is_integer():
            return int(val)
        return val

    return val


def resolve_file_path(path_arg: str) -> Path:
    file_path = Path(path_arg)
    if file_path.exists():
        return file_path

    desktop = Path.home() / 'Desktop'
    alt = desktop / file_path.name
    if alt.exists():
        return alt

    raise FileNotFoundError(f'Archivo no encontrado: {file_path}')


def dedupe_columns(columns):
    seen = {}
    out = []
    for col in columns:
        if col in seen:
            seen[col] += 1
            out.append(f'{col}_{seen[col]}')
        else:
            seen[col] = 0
            out.append(col)
    return out


def build_record_generic(row, columns):
    record = {}
    for col in columns:
        val = normalize_value(row[col])
        if val is not None:
            record[col] = val
    return record


def decimal_to_pct_string(value):
    """0.5869 -> '58.7%' ; 58.7 -> '58.7%'"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        n = float(value)
        if n <= 1:
            n *= 100
        return f'{n:.1f}%'
    return value


def normalize_percent_str(value):
    """Convierte 0.71875 a '71.9%' y mantiene strings ya formateados"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        n = float(value)
        if n <= 1:
            n *= 100
        return f'{n:.1f}%'
    s = str(value).strip()
    if s == '':
        return None
    if s.endswith('%'):
        return s
    try:
        n = float(s)
        if n <= 1:
            n *= 100
        return f'{n:.1f}%'
    except ValueError:
        return s


def build_record_empleabilidad_ingresos(row, row_idx):
    """
    Mapea la hoja de empleabilidad a un esquema cercano al solicitado por el usuario.
    Algunos campos no existen en este archivo y se devuelven en null.
    """
    area = normalize_value(row.get('área'))
    tipo_inst = normalize_value(row.get('tipo_de_institución'))
    carrera_gen = normalize_value(row.get('nombre_carrera_genérica'))

    ingreso_tramo_4 = normalize_value(row.get('ingreso_promedio_al_4_año'))

    record = {
        'ID': row_idx + 1,
        'Área': area,
        'Tipo de institución': tipo_inst,
        'Carrera genérica': carrera_gen,
        'Nombre institución': normalize_value(row.get('nombre_de_institución')),
        'Nombre carrera (título)': normalize_value(row.get('nombre_carrera_del_título')),

        'Ingreso promedio bruto mensual ($ septiembre 2025)': {
            '1er año': None,
            '2° año': None,
            '3er año': None,
            '4° año': None,
            '5° año': None,
            '4° año (tramo informado)': ingreso_tramo_4,
        },

        'Tramos de ingreso bruto mensual ($ septiembre 2025)': {
            '1er año': {
                '10% inferior': None,
                '25% inferior': None,
                'Percentil 50': None,
                '25% superior': None,
                '10% superior': None,
            },
            '5° año': {
                '10% inferior': None,
                '25% inferior': None,
                'Percentil 50': None,
                '25% superior': None,
                '10% superior': None,
            }
        },

        'Evolución ingresos al 4° año de titulación (cohortes 2016-2020)': {
            '2020': None,
            '2021': None,
            '2022': None,
            '2023': None,
            '2024': None,
        },

        'Empleabilidad': {
            '1er año': normalize_percent_str(row.get('empleabilidad_1er_año')),
            '2° año': normalize_percent_str(row.get('empleabilidad_2_año')),
        },

        'Evolución empleabilidad 1er año (cohortes 2019-2023)': {
            '2020': None,
            '2021': None,
            '2022': None,
            '2023': None,
            '2024': None,
        },

        'Evolución empleabilidad 2° año (cohortes 2018-2022)': {
            '2020': None,
            '2021': None,
            '2022': None,
            '2023': None,
            '2024': None,
        },

        'Titulados 2024': {
            'Mujeres': None,
            'Hombres': None,
            'Total': None,
        },

        'Duración titulados 2024 (semestres)': {
            'Formal': None,
            'Real': normalize_value(row.get('duración_real_semestres')),
        },

        'Matrícula 1er año 2025': {
            'Mujeres': None,
            'Hombres': None,
            'Total': None,
        },

        'Matrícula Total 2025': {
            'Mujeres': None,
            'Hombres': None,
            'Total': None,
        },

        'Retención (cohorte 2023)': {
            '1er año': normalize_percent_str(row.get('retención_1er_año')),
            '2° año': 's/i',
        },

        'Distribución según establecimiento de origen Matrícula 2025': {
            'Municipal y Servicios Locales': None,
            'Particular Subvencionado': None,
            'Particular Pagado': None,
            'Administración Delegada': None,
        },

        '% titulados con continuidad de estudios': normalize_percent_str(row.get('titulados_con_continuidad_de_estudios')),
        'Acreditación institución (al 31 de octubre 2025)': normalize_value(row.get('acreditación_institución_al_31_de_octubre_2025')),
    }

    return record


def as_int(value):
    v = normalize_value(value)
    if v is None:
        return None
    if isinstance(v, float):
        return int(round(v))
    if isinstance(v, int):
        return v
    return v


def as_float(value):
    v = normalize_value(value)
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    return v


def as_pct(value):
    return normalize_percent_str(value)


def build_record_estadisticas(values):
    # values: lista en orden de columnas (ID..Administración Delegada)
    return {
        'ID': as_int(values[0]),
        'Área': normalize_value(values[1]),
        'Tipo de institución': normalize_value(values[2]),
        'Carrera genérica': normalize_value(values[3]),
        'Ingreso promedio bruto mensual ($ septiembre 2025)': {
            '1er año': as_int(values[4]),
            '2° año': as_int(values[5]),
            '3er año': as_int(values[6]),
            '4° año': as_int(values[7]),
            '5° año': as_int(values[8]),
        },
        'Tramos de ingreso bruto mensual ($ septiembre 2025)': {
            '1er año': {
                '10% inferior': as_int(values[9]),
                '25% inferior': as_int(values[10]),
                'Percentil 50': as_int(values[11]),
                '25% superior': as_int(values[12]),
                '10% superior': as_int(values[13]),
            },
            '5° año': {
                '10% inferior': as_int(values[14]),
                '25% inferior': as_int(values[15]),
                'Percentil 50': as_int(values[16]),
                '25% superior': as_int(values[17]),
                '10% superior': as_int(values[18]),
            }
        },
        'Evolución ingresos al 4° año de titulación (cohortes 2016-2020)': {
            '2020': as_int(values[19]),
            '2021': as_int(values[20]),
            '2022': as_int(values[21]),
            '2023': as_int(values[22]),
            '2024': as_int(values[23]),
        },
        'Empleabilidad': {
            '1er año': as_pct(values[24]),
            '2° año': as_pct(values[25]),
        },
        'Evolución empleabilidad 1er año (cohortes 2019-2023)': {
            '2020': as_pct(values[26]),
            '2021': as_pct(values[27]),
            '2022': as_pct(values[28]),
            '2023': as_pct(values[29]),
            '2024': as_pct(values[30]),
        },
        'Evolución empleabilidad 2° año (cohortes 2018-2022)': {
            '2020': as_pct(values[31]),
            '2021': as_pct(values[32]),
            '2022': as_pct(values[33]),
            '2023': as_pct(values[34]),
            '2024': as_pct(values[35]),
        },
        'Titulados 2024': {
            'Mujeres': as_int(values[36]),
            'Hombres': as_int(values[37]),
            'Total': as_int(values[38]),
        },
        'Duración titulados 2024 (semestres)': {
            'Formal': as_float(values[39]),
            'Real': as_float(values[40]),
        },
        'Matrícula 1er año 2025': {
            'Mujeres': as_int(values[41]),
            'Hombres': as_int(values[42]),
            'Total': as_int(values[43]),
        },
        'Matrícula Total 2025': {
            'Mujeres': as_int(values[44]),
            'Hombres': as_int(values[45]),
            'Total': as_int(values[46]),
        },
        'Retención (cohorte 2023)': {
            '1er año': as_pct(values[47]),
            '2° año': normalize_value(values[48]) if normalize_value(values[48]) is not None else 's/i',
        },
        'Distribución según establecimiento de origen Matrícula 2025': {
            'Municipal y Servicios Locales': as_pct(values[49]),
            'Particular Subvencionado': as_pct(values[50]),
            'Particular Pagado': as_pct(values[51]),
            'Administración Delegada': as_pct(values[52]),
        }
    }


def convert_estadisticas_carrera(file_path: Path, head: int | None = None):
    # Fila 1: títulos de bloque | Fila 2: nombres de columnas | Fila 3+: datos
    raw = pd.read_excel(file_path, sheet_name=ESTADISTICAS_SHEET, header=None)
    raw = raw.dropna(how='all')

    # Data comienza en índice 2
    data = raw.iloc[2:].reset_index(drop=True)

    if head:
        data = data.head(head)

    records = []
    for _, row in data.iterrows():
        values = row.tolist()
        # Asegura longitud esperada de 53 columnas
        if len(values) < 53:
            values += [None] * (53 - len(values))
        record = build_record_estadisticas(values[:53])
        # Descarta filas vacías o sin ID
        if record.get('ID') is not None:
            records.append(record)

    return records


def build_record_buscar_carrera(row, columns):
    # Base con formato amigable (como tu ejemplo)
    base = {
        'Código único de carrera': normalize_value(row.get('código_único_de_carrera')),
        'Código institución': normalize_value(row.get('código_institución')),
        'Área del conocimiento': normalize_value(row.get('área_del_conocimiento')),
        'Tipo de institución': normalize_value(row.get('tipo_de_institución')),
        'Nombre institución': normalize_value(row.get('nombre_institución')),
        'Nombre carrera': normalize_value(row.get('nombre_carrera')),
        'Región': normalize_value(row.get('región')),
        'Jornada': normalize_value(row.get('jornada')),
        'Sede': normalize_value(row.get('sede')),
        'Arancel Anual 2026': normalize_value(row.get('arancel_anual_2026')),
        'Costo de titulación': normalize_value(row.get('costo_de_titulación')),
        'Duración Formal (semestres)': normalize_value(row.get('duración_formal_semestres')),
        'Nivel carrera': normalize_value(row.get('nivel_carrera')),
        'Matrícula Total Femenina 2025': normalize_value(row.get('matrícula_total_femenina_2025')),
        'Matrícula Total Masculina 2025': normalize_value(row.get('matrícula_total_masculina_2025')),
        'Matrícula Total 2025': normalize_value(row.get('matrícula_total_2025')),
        'Matrícula 1er año Femenina 2025': normalize_value(row.get('matrícula_1er_año_femenina_2025')),
        'Matrícula 1er año Masculina 2025': normalize_value(row.get('matrícula_1er_año_masculina_2025')),
        'Matrícula 1er año Total 2025': normalize_value(row.get('matrícula_1er_año_total_2025')),
        'Titulación Femenina 2024': normalize_value(row.get('titulación_femenina_2024')),
        'Titulación Masculina 2024': normalize_value(row.get('titlación_masculina_2024')),
        'Titulación Total 2024': normalize_value(row.get('titulación_total_2024')),
        'Rango ingreso a 1er año con PAES 2025': normalize_value(row.get('rango_ingreso_a_1er_año_con_paes_2025')),
        'Promedio PAES 2025 de Matrícula 1er año': normalize_value(row.get('promedio_paes_2025_de_matrícula_1er_año_2025')),
        'Promedio NEM 2025 de Matrícula 1er año': normalize_value(row.get('promedio_nem_2025_de_matrícula_2025')),
        'Vacantes 1er semestre': normalize_value(row.get('vacantes_1er_semestre')),
        'Área Carrera Genérica': normalize_value(row.get('área_carrera_genérica')),
    }

    porcentaje = {}
    for key, label in PERCENT_FIELDS.items():
        v = normalize_value(row.get(key))
        if v is not None:
            porcentaje[label] = decimal_to_pct_string(v)

    ponderaciones = {}
    for key, label in PONDERACION_FIELDS.items():
        v = normalize_value(row.get(key))
        if v is not None:
            ponderaciones[label] = v

    # Limpia None del bloque principal
    record = {k: v for k, v in base.items() if v is not None}
    if porcentaje:
        record['Porcentaje matriculados según establecimiento de origen'] = porcentaje
    if ponderaciones:
        record['Ponderaciones'] = ponderaciones

    return record


def main():
    args = sys.argv[1:]

    if not args:
        print('❌ Uso: python scripts/xls_to_json.py <archivo.xlsx> [hoja] [--head N] [--header-row N] [--preset buscar_carrera]')
        sys.exit(1)

    try:
        file_path = resolve_file_path(args[0])
    except FileNotFoundError as e:
        print(f'❌ {e}')
        sys.exit(1)

    # Parsear argumentos opcionales
    sheet = 0
    head = None
    header_row = 0
    preset = None
    i = 1
    while i < len(args):
        if args[i] == '--head' and i + 1 < len(args):
            head = int(args[i + 1])
            i += 2
        elif args[i] == '--header-row' and i + 1 < len(args):
            header_row = int(args[i + 1])
            i += 2
        elif args[i] == '--preset' and i + 1 < len(args):
            preset = args[i + 1]
            i += 2
        else:
            # Intentar como número de hoja o nombre
            try:
                sheet = int(args[i])
            except ValueError:
                sheet = args[i]
            i += 1

    # Autodetectar preset para buscar_carrera
    if preset is None and 'buscar_carrera' in file_path.stem.lower():
        preset = 'buscar_carrera'
    if preset is None and 'empleabilidad' in file_path.stem.lower():
        preset = 'empleabilidad_ingresos'
    if preset is None and 'estadisticascarrera' in file_path.stem.lower():
        preset = 'estadisticas_carrera'

    if preset == 'buscar_carrera':
        # Estructura conocida: hoja específica y header en fila 2
        sheet = 'Busc. Carreras  2025-2026'
        header_row = 1
    elif preset == 'empleabilidad_ingresos':
        # Estructura conocida del buscador empleabilidad/ingresos
        sheet = EMPLEABILIDAD_SHEET
        header_row = 0

    if preset == 'estadisticas_carrera':
        print(f'📖 Leyendo: {file_path.name} | Hoja: {ESTADISTICAS_SHEET} | Header de 2 filas (datos desde fila 3)')
        records = convert_estadisticas_carrera(file_path, head=head)

        out_name = file_path.stem + '.json'
        out_path = Path('scripts') / out_name
        out_path.parent.mkdir(exist_ok=True)

        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        size_kb = out_path.stat().st_size / 1024
        print(f'✅ Guardado en: {out_path}')
        print(f'📦 {len(records)} registros | {size_kb:.1f} KB')
        print('\nEjemplo (primer registro):')
        print(json.dumps(records[0] if records else {}, ensure_ascii=False, indent=2))
        return

    print(f'📖 Leyendo: {file_path.name} | Hoja: {sheet} | Header row: {header_row + 1}')

    # Leer Excel
    df = pd.read_excel(file_path, sheet_name=sheet, header=header_row)

    # Eliminar filas completamente vacías
    df = df.dropna(how='all')

    # Limpiar nombres de columnas
    df.columns = [clean_key(c) for c in df.columns]

    # Resolver columnas duplicadas añadiendo sufijo numérico
    df.columns = dedupe_columns(df.columns)

    print(f"✅ {len(df)} filas | {len(df.columns)} columnas")
    print(f"📋 Columnas: {list(df.columns)}\n")

    if head:
        df = df.head(head)
        print(f"⚠️  Mostrando solo primeras {head} filas\n")

    # Convertir a lista de dicts limpia
    records = []
    for idx, row in df.iterrows():
        if preset == 'buscar_carrera':
            record = build_record_buscar_carrera(row, df.columns)
        elif preset == 'empleabilidad_ingresos':
            record = build_record_empleabilidad_ingresos(row, idx)
        else:
            record = build_record_generic(row, df.columns)
        if record:  # Saltar filas vacías
            records.append(record)

    # Guardar JSON
    out_name = file_path.stem + '.json'
    out_path = Path('scripts') / out_name
    out_path.parent.mkdir(exist_ok=True)

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    size_kb = out_path.stat().st_size / 1024
    print(f"✅ Guardado en: {out_path}")
    print(f"📦 {len(records)} registros | {size_kb:.1f} KB")
    print(f"\nEjemplo (primer registro):")
    print(json.dumps(records[0] if records else {}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
