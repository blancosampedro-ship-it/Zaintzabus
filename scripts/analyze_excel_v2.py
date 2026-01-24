import pandas as pd

file_path = r'C:\Dev\ZaintzaBus\Archivos_Excel\Flota Ekialdebus.xlsx'
df = pd.read_excel(file_path, skiprows=7)

# LIMPIAR NOMBRES DE COLUMNAS (espacios al inicio/final)
df.columns = df.columns.str.strip()

print("=" * 80)
print("ANÁLISIS COMPLETO DE DATOS A EXTRAER (con columnas limpias)")
print("=" * 80)

print("\n📋 TODAS LAS COLUMNAS DEL EXCEL (después de strip):")
print("-" * 80)
for i, col in enumerate(df.columns):
    print(f"  {i+1:2}. '{col}'")

# Definición de todas las columnas de equipos que vamos a procesar
COLUMNAS_EQUIPOS = {
    # Columna Excel -> (tipo_firestore, es_sim)
    'N. AMPLIFICADOR': ('amplificador', False),
    'N. CPU': ('cpu', False),
    'LICENCIA': ('licencia_software', False),
    'SWITCH': ('switch', False),
    'ROUTER': ('router', False),
    'WIFI': ('modulo_wifi', False),
    'COMMS 1': ('comunicacion', False),
    'COMMS 2': ('comunicacion', False),
    'CAMARA 1': ('camara', False),
    'CAMARA 2': ('camara', False),
    'CAMARA 3': ('camara', False),
    'CAMARA 4': ('camara', False),
    'PUPITE': ('pupitre', False),
    'VALIDADORA 1': ('validadora', False),
    'VALIDADORA 2': ('validadora', False),
    'VALIDADORA 3': ('validadora', False),
    'IP SIM': ('ip_fija', False),
    'SIM m2m': ('sim_card', True),  # Tiene teléfono asociado
    'SIM WIFI 3G': ('sim_card', True),  # Tiene teléfono asociado
}

# Columnas de teléfono asociadas a SIMs
TELEFONOS_SIM = {
    'SIM m2m': 'TELEFONO SIM m2m',
    'SIM WIFI 3G': 'TELEFONO SIM WIFI 3G',
}

# Columnas del activo (vehículo)
COLUMNAS_ACTIVO = {
    'COD_BUS': 'codigo',
    'MATRICULA': 'matricula',
    'Nº Obra / Chasis': 'chasis',
    'MODELO AUTOBÚS': 'modelo',
    'CARROCERIA': 'carroceria',
    'FECHA PRE  INSTALACION': 'fechaPreInstalacion',
    'FECHA INSTALACIÓN': 'fechaInstalacion',
    'INSTALADOR': 'instalador',
    'BUS MIGRADO SI/NO': 'migrado',
    'COMENTARIOS': 'comentarios',
}

print("\n\n📋 COLUMNAS DEL ACTIVO (VEHÍCULO):")
print("-" * 80)
for col_excel, campo_fs in COLUMNAS_ACTIVO.items():
    existe = col_excel in df.columns
    if existe:
        no_vacios = df[col_excel].dropna().count()
        ejemplos = df[col_excel].dropna().head(3).tolist()
        print(f"  ✅ '{col_excel}' → {campo_fs}")
        print(f"     Registros con datos: {no_vacios}/{len(df)}")
        print(f"     Ejemplos: {ejemplos}")
    else:
        print(f"  ❌ '{col_excel}' → NO EXISTE EN EXCEL")

print("\n\n📦 COLUMNAS DE EQUIPOS (INVENTARIO):")
print("-" * 80)

total_equipos = 0
resumen_equipos = {}

for col_excel, (tipo_fs, es_sim) in COLUMNAS_EQUIPOS.items():
    existe = col_excel in df.columns
    if existe:
        # Contar valores válidos (no vacíos, no '-')
        valores = df[col_excel].dropna()
        valores_validos = valores[valores.astype(str).str.strip() != '-']
        valores_validos = valores_validos[valores_validos.astype(str).str.strip() != '']
        count = len(valores_validos)
        ejemplos = valores_validos.head(3).tolist()
        
        total_equipos += count
        if tipo_fs not in resumen_equipos:
            resumen_equipos[tipo_fs] = 0
        resumen_equipos[tipo_fs] += count
        
        print(f"  ✅ '{col_excel}' → tipo: '{tipo_fs}'")
        print(f"     Registros con datos: {count}/{len(df)}")
        if ejemplos:
            print(f"     Ejemplos de serie: {ejemplos}")
        
        # Si es SIM, mostrar teléfono asociado
        if es_sim and col_excel in TELEFONOS_SIM:
            tel_col = TELEFONOS_SIM[col_excel]
            if tel_col in df.columns:
                tel_ejemplos = df[tel_col].dropna().head(3).tolist()
                print(f"     Teléfono asociado ({tel_col}): {tel_ejemplos}")
    else:
        print(f"  ❌ '{col_excel}' → NO EXISTE EN EXCEL")

print("\n\n📊 RESUMEN:")
print("-" * 80)
print(f"  Total vehículos (activos): {len(df)}")
print(f"  Total equipos a crear: {total_equipos}")
print("\n  Desglose por tipo:")
for tipo, count in sorted(resumen_equipos.items(), key=lambda x: -x[1]):
    print(f"    - {tipo}: {count}")

print("\n\n🔍 MUESTRA COMPLETA DE UN BUS (fila 0):")
print("-" * 80)
row = df.iloc[0]
cod_bus = row.get('COD_BUS', 'N/A')
print(f"  COD_BUS: {cod_bus}")
print(f"  MATRICULA: {row.get('MATRICULA', 'N/A')}")
print(f"  MODELO: {row.get('MODELO AUTOBÚS', 'N/A')}")
print(f"  FECHA INSTALACIÓN: {row.get('FECHA INSTALACIÓN', 'N/A')}")
print(f"  INSTALADOR: {row.get('INSTALADOR', 'N/A')}")
print("\n  Equipos de este bus:")
for col_excel, (tipo_fs, es_sim) in COLUMNAS_EQUIPOS.items():
    if col_excel in df.columns:
        valor = row.get(col_excel)
        if pd.notna(valor) and str(valor).strip() not in ['', '-']:
            telefono = ""
            if es_sim and col_excel in TELEFONOS_SIM:
                tel_col = TELEFONOS_SIM[col_excel]
                tel_valor = row.get(tel_col, '')
                if pd.notna(tel_valor):
                    telefono = f" | Tel: {tel_valor}"
            print(f"    - {tipo_fs}: {valor}{telefono}")
