import pandas as pd

file_path = r'C:\Dev\ZaintzaBus\Archivos_Excel\Flota Ekialdebus.xlsx'
df = pd.read_excel(file_path, skiprows=7)

print('PRIMERAS 5 FILAS (muestra):')
print('=' * 100)
cols_muestra = ['COD_BUS', 'MATRICULA', 'MODELO AUTOBÚS', 'N. CPU', 'ROUTER', 'CAMARA 1', 'VALIDADORA 1']
print(df[cols_muestra].head(5).to_string())

print()
print('VALORES ÚNICOS:')
print('=' * 100)
print(f"COD_BUS únicos: {df['COD_BUS'].nunique()}")
print(f"Ejemplos COD_BUS: {df['COD_BUS'].dropna().head(5).tolist()}")
print(f"Ejemplos MATRICULA: {df['MATRICULA'].dropna().head(5).tolist()}")
print(f"MODELOS únicos: {df['MODELO AUTOBÚS'].dropna().unique().tolist()}")

print()
print('EQUIPOS - Ejemplo de un bus:')
print('=' * 100)
row = df.iloc[0]
print(f"Bus: {row['COD_BUS']} - {row['MATRICULA']}")
equipos_cols = ['N. CPU', 'ROUTER', 'SWITCH', 'WIFI', 'CAMARA 1', 'CAMARA 2', 'CAMARA 3', 'CAMARA 4', 
                'VALIDADORA 1', 'VALIDADORA 2', 'VALIDADORA 3', 'N. AMPLIFICADOR', 'PUPITE']
for col in equipos_cols:
    valor = row.get(col, None)
    if pd.notna(valor) and str(valor).strip():
        print(f"  - {col}: {valor}")
