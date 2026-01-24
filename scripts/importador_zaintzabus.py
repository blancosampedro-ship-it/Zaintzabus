"""
=============================================================================
IMPORTADOR ZAINTZABUS - Script de importación de flota a Firestore
=============================================================================
Este script importa datos de vehículos y equipos desde un archivo Excel
a la base de datos Firestore, siguiendo la estructura multi-tenant del proyecto.

Para usar con otro operador, simplemente cambia las variables de configuración.
=============================================================================
"""

import os
import pandas as pd
from datetime import datetime
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

# =============================================================================
# CONFIGURACIÓN - CAMBIA SOLO EL ARCHIVO EXCEL
# El operador y código se leen automáticamente del Excel (filas 5-6)
# =============================================================================

ARCHIVO_EXCEL = 'Flota Ekialdebus.xlsx'

# Estos valores se auto-detectan del Excel, pero puedes sobrescribirlos si es necesario
TENANT_ID = None  # Se lee de fila 6, columna C (Codigo de Operador)
OPERADOR_NOMBRE = None  # Se lee de fila 5, columna C (Operador)

# =============================================================================
# RUTAS (no modificar a menos que cambies la estructura de carpetas)
# =============================================================================

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
EXCEL_PATH = PROJECT_ROOT / 'Archivos_Excel' / ARCHIVO_EXCEL
SERVICE_ACCOUNT_PATH = SCRIPT_DIR / 'serviceAccountKey.json'

# =============================================================================
# MAPEO DE COLUMNAS
# =============================================================================

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

# Columnas de equipos -> (tipo_firestore, tiene_telefono_asociado)
COLUMNAS_EQUIPOS = {
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
    'SIM m2m': ('sim_card', True),
    'SIM WIFI 3G': ('sim_card', True),
}

# Teléfonos asociados a SIMs
TELEFONOS_SIM = {
    'SIM m2m': 'TELEFONO SIM m2m',
    'SIM WIFI 3G': 'TELEFONO SIM WIFI 3G',
}

# =============================================================================
# FUNCIONES AUXILIARES
# =============================================================================

def leer_operador_desde_excel(excel_path: Path) -> tuple:
    """
    Lee el nombre del operador y su código desde las filas 5-6 del Excel.
    
    Estructura esperada del Excel (formato de flota):
    - Fila 5 (índice 4): "Operador: " en col A, nombre en col C
    - Fila 6 (índice 5): "Codigo de Operador: " en col A, código en col C
    - Fila 8 (índice 7): Headers de columnas
    - Fila 9+ (índice 8+): Datos
    
    Si el Excel tiene una estructura diferente, intenta extraer info del nombre del archivo.
    
    Returns:
        tuple: (tenant_id, operador_nombre, codigo_operador)
    """
    try:
        # Leer las primeras filas sin headers
        df_meta = pd.read_excel(excel_path, header=None, nrows=7)
        
        operador_nombre = None
        codigo_operador = None
        
        # Verificar que tiene suficientes columnas (estructura de flota)
        if df_meta.shape[1] >= 3:
            # Fila 5 (índice 4): Operador
            if pd.notna(df_meta.iloc[4, 2]):
                operador_nombre = str(df_meta.iloc[4, 2]).strip()
            
            # Fila 6 (índice 5): Código de Operador
            if pd.notna(df_meta.iloc[5, 2]):
                val = df_meta.iloc[5, 2]
                codigo_operador = str(int(val) if isinstance(val, float) else val).strip()
        
        # Si no se encontró, intentar extraer del nombre del archivo
        if not operador_nombre:
            nombre_archivo = excel_path.name
            # Buscar patrones comunes en nombre de archivo
            for patron in ['ekialdebus', 'lurraldebus', 'dbus', 'bizkaibus']:
                if patron.lower() in nombre_archivo.lower():
                    operador_nombre = patron.upper()
                    break
            
            if not operador_nombre:
                print("   ⚠️  No se pudo detectar operador del Excel, usando valores por defecto")
                operador_nombre = "DESCONOCIDO"
        
        # Generar tenant_id desde el nombre del operador
        tenant_id = None
        if operador_nombre:
            # Convertir a minúsculas, reemplazar espacios por guiones
            tenant_id = operador_nombre.lower().replace(' ', '-').replace('_', '-')
            # Eliminar caracteres especiales
            tenant_id = ''.join(c for c in tenant_id if c.isalnum() or c == '-')
        
        return tenant_id, operador_nombre, codigo_operador
        
    except Exception as e:
        print(f"   ⚠️  Error leyendo metadatos del Excel: {e}")
        return None, None, None


def inicializar_firebase():
    """Inicializa la conexión con Firebase Admin SDK."""
    if not SERVICE_ACCOUNT_PATH.exists():
        raise FileNotFoundError(
            f"❌ No se encontró el archivo de credenciales: {SERVICE_ACCOUNT_PATH}\n"
            "   Asegúrate de tener el archivo serviceAccountKey.json en la carpeta scripts/"
        )
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
        firebase_admin.initialize_app(cred)
    
    return firestore.client()


def limpiar_valor(valor):
    """Limpia un valor: si es NaN, vacío o '-', retorna None."""
    if pd.isna(valor):
        return None
    valor_str = str(valor).strip()
    if valor_str in ['', '-', 'nan', 'NaN', 'None']:
        return None
    return valor_str


def convertir_fecha(valor):
    """Convierte un valor a datetime si es posible."""
    if pd.isna(valor):
        return None
    if isinstance(valor, datetime):
        return valor
    if isinstance(valor, pd.Timestamp):
        return valor.to_pydatetime()
    try:
        return pd.to_datetime(valor).to_pydatetime()
    except:
        return None


def procesar_matricula(matricula):
    """Procesa la matrícula: si es '¿¿??' la cambia a 'PENDIENTE'."""
    if matricula is None:
        return 'PENDIENTE'
    matricula_str = str(matricula).strip()
    if matricula_str in ['¿¿??', '??', '']:
        return 'PENDIENTE'
    return matricula_str


def procesar_migrado(valor):
    """Convierte SI/NO a boolean."""
    if valor is None:
        return False
    valor_str = str(valor).strip().upper()
    return valor_str == 'SI'


# =============================================================================
# FUNCIÓN PRINCIPAL DE IMPORTACIÓN
# =============================================================================

def importar_flota():
    """Función principal que ejecuta la importación."""
    global TENANT_ID, OPERADOR_NOMBRE
    
    # Verificar que existe el archivo Excel
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"❌ No se encontró el archivo Excel: {EXCEL_PATH}")
    
    # Auto-detectar operador desde el Excel si no está configurado
    if TENANT_ID is None or OPERADOR_NOMBRE is None:
        print("🔍 Detectando operador desde el archivo Excel...")
        detected_tenant, detected_nombre, detected_codigo = leer_operador_desde_excel(EXCEL_PATH)
        
        if TENANT_ID is None:
            TENANT_ID = detected_tenant
        if OPERADOR_NOMBRE is None:
            OPERADOR_NOMBRE = detected_nombre
        
        print(f"   📋 Operador detectado: {OPERADOR_NOMBRE}")
        print(f"   📋 Código de operador: {detected_codigo}")
        print(f"   📋 Tenant ID generado: {TENANT_ID}")
        print()
    
    print("=" * 70)
    print(f"🚀 INICIANDO IMPORTACIÓN PARA {OPERADOR_NOMBRE}")
    print("=" * 70)
    print(f"   Archivo Excel: {EXCEL_PATH}")
    print(f"   Tenant ID: {TENANT_ID}")
    print()
    
    # Inicializar Firebase
    print("🔥 Conectando con Firestore...")
    db = inicializar_firebase()
    print("   ✅ Conexión establecida")
    print()
    
    # Leer Excel
    print("📊 Leyendo archivo Excel...")
    df = pd.read_excel(EXCEL_PATH, skiprows=7)
    
    # IMPORTANTE: Limpiar nombres de columnas (quitar espacios)
    df.columns = df.columns.str.strip()
    
    print(f"   ✅ {len(df)} filas leídas")
    print()
    
    # Contadores
    total_buses = 0
    total_equipos = 0
    
    # Iniciar batch
    batch = db.batch()
    operaciones_batch = 0
    LIMITE_BATCH = 500
    
    # Función auxiliar para hacer commit si es necesario
    def commit_si_necesario():
        nonlocal batch, operaciones_batch
        if operaciones_batch >= LIMITE_BATCH:
            print(f"   💾 Guardando batch ({operaciones_batch} operaciones)...")
            batch.commit()
            batch = db.batch()
            operaciones_batch = 0
    
    # Procesar cada fila (bus)
    print("📦 Procesando vehículos y equipos...")
    print("-" * 70)
    
    for idx, row in df.iterrows():
        cod_bus = row.get('COD_BUS')
        if pd.isna(cod_bus):
            continue
        
        cod_bus_str = str(int(cod_bus) if isinstance(cod_bus, float) else cod_bus)
        matricula = procesar_matricula(row.get('MATRICULA'))
        
        print(f"   📦 Procesando bus {cod_bus_str} ({matricula})...")
        
        # =====================================================================
        # 1. CREAR DOCUMENTO DEL ACTIVO (VEHÍCULO)
        # =====================================================================
        
        activo_data = {
            'codigo': cod_bus_str,
            'matricula': matricula,
            'chasis': limpiar_valor(row.get('Nº Obra / Chasis')),
            'modelo': limpiar_valor(row.get('MODELO AUTOBÚS')),
            'carroceria': limpiar_valor(row.get('CARROCERIA')),
            'fechaPreInstalacion': convertir_fecha(row.get('FECHA PRE  INSTALACION')),
            'fechaInstalacion': convertir_fecha(row.get('FECHA INSTALACIÓN')),
            'instalador': limpiar_valor(row.get('INSTALADOR')),
            'migrado': procesar_migrado(row.get('BUS MIGRADO SI/NO')),
            'comentarios': limpiar_valor(row.get('COMENTARIOS')),
            # Campos adicionales del modelo de datos
            'tipo': 'autobus',
            'estado': 'operativo',
            'tenantId': TENANT_ID,
            'operadorNombre': OPERADOR_NOMBRE,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }
        
        # Eliminar campos None para no guardarlos en Firestore
        activo_data = {k: v for k, v in activo_data.items() if v is not None}
        
        # Referencia al documento usando COD_BUS como ID
        activo_ref = db.collection(f'tenants/{TENANT_ID}/activos').document(cod_bus_str)
        batch.set(activo_ref, activo_data)
        operaciones_batch += 1
        total_buses += 1
        
        commit_si_necesario()
        
        # =====================================================================
        # 2. CREAR DOCUMENTOS DE EQUIPOS (INVENTARIO)
        # =====================================================================
        
        for col_excel, (tipo_equipo, tiene_telefono) in COLUMNAS_EQUIPOS.items():
            valor_serie = row.get(col_excel)
            
            # Verificar si tiene valor válido
            serie = limpiar_valor(valor_serie)
            if serie is None:
                continue
            
            # Preparar datos del equipo
            equipo_data = {
                'tipo': tipo_equipo,
                'serie': str(serie),
                'activoId': cod_bus_str,
                'activoCodigo': cod_bus_str,
                'activoMatricula': matricula,
                'estado': 'instalado',
                'tenantId': TENANT_ID,
                'origenColumna': col_excel,  # Para trazabilidad
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            # Si es SIM, agregar teléfono asociado
            if tiene_telefono and col_excel in TELEFONOS_SIM:
                tel_col = TELEFONOS_SIM[col_excel]
                telefono = limpiar_valor(row.get(tel_col))
                if telefono:
                    equipo_data['telefono'] = str(telefono)
            
            # Crear documento con ID automático
            equipo_ref = db.collection(f'tenants/{TENANT_ID}/inventario').document()
            batch.set(equipo_ref, equipo_data)
            operaciones_batch += 1
            total_equipos += 1
            
            commit_si_necesario()
    
    # Commit final de las operaciones restantes
    if operaciones_batch > 0:
        print(f"   💾 Guardando batch final ({operaciones_batch} operaciones)...")
        batch.commit()
    
    # Resumen final
    print()
    print("=" * 70)
    print("✅ IMPORTACIÓN COMPLETADA")
    print("=" * 70)
    print(f"   🚌 Vehículos subidos: {total_buses}")
    print(f"   🔧 Equipos subidos: {total_equipos}")
    print(f"   📍 Tenant: {TENANT_ID}")
    print()
    print(f"✅ Éxito: {total_buses} vehículos y {total_equipos} equipos subidos a {TENANT_ID}.")
    print()


# =============================================================================
# PUNTO DE ENTRADA
# =============================================================================

if __name__ == '__main__':
    try:
        importar_flota()
    except Exception as e:
        print()
        print("❌ ERROR DURANTE LA IMPORTACIÓN:")
        print(f"   {e}")
        print()
        raise
