"""
=============================================================================
IMPORTADOR DE EQUIPOS A FIRESTORE - ZaintzaBus
=============================================================================

Este script importa equipos desde un archivo Excel a la colección 'equipos'
de Firestore, con la estructura correcta para que aparezcan en la app.

REQUISITOS:
- Python 3.8+
- pip install pandas openpyxl firebase-admin

CONFIGURACIÓN:
1. Modifica las variables en la sección "CONFIGURACIÓN DEL OPERADOR"
2. Asegúrate de que el archivo Excel tenga las columnas correctas
3. Ejecuta el script

USO:
    python scripts/importar_equipos.py

AUTOR: ZaintzaBus Team
FECHA: 2026-01-23
=============================================================================
"""

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from typing import Dict, List, Any, Optional
import re
import sys

# =============================================================================
# CONFIGURACIÓN DEL OPERADOR
# Solo necesitas cambiar ARCHIVO_EXCEL - el operador se detecta automáticamente
# =============================================================================

# Archivo Excel con los datos
ARCHIVO_EXCEL = "Archivos_Excel/Flota Ekialdebus.xlsx"

# Hoja del Excel a leer (None = auto-detectar desde nombre del operador)
HOJA_EXCEL = None

# Fila donde empiezan los headers (0-indexed, fila 8 del Excel = índice 7)
HEADER_ROW = 7

# Columna que contiene el número de bus
COLUMNA_BUS = "COD_BUS"

# Identificador del operador (None = auto-detectar desde Excel fila 5-6)
OPERADOR_ID = None
OPERADOR_NOMBRE = None
CODIGO_OPERADOR = None

# Prefijo para IDs de autobús (se concatena con el número de bus)
PREFIJO_BUS = "BUS"


# =============================================================================
# FUNCIÓN DE AUTO-DETECCIÓN DE OPERADOR
# =============================================================================

def leer_operador_desde_excel(archivo_excel: str) -> tuple:
    """
    Lee automáticamente el nombre del operador y su código desde el Excel.
    
    Estructura esperada del Excel (formato de flota):
    - Fila 5 (índice 4): "Operador: " en col A, nombre en col C (ej: "EKIALDEBUS")
    - Fila 6 (índice 5): "Codigo de Operador: " en col A, código en col C (ej: 26)
    - Fila 8 (índice 7): Headers de columnas (COD_BUS, MATRICULA, etc.)
    - Fila 9+ (índice 8+): Datos de vehículos y equipos
    
    Si el Excel tiene una estructura diferente, intenta extraer info del nombre del archivo.
    
    Returns:
        tuple: (operador_id, operador_nombre, codigo_operador)
    """
    try:
        # Leer las primeras filas sin headers
        df_meta = pd.read_excel(archivo_excel, header=None, nrows=7)
        
        operador_nombre = None
        codigo_operador = None
        
        # Verificar que tiene suficientes columnas (estructura de flota)
        if df_meta.shape[1] >= 3:
            # Fila 5 (índice 4): Operador - columna C (índice 2)
            if pd.notna(df_meta.iloc[4, 2]):
                operador_nombre = str(df_meta.iloc[4, 2]).strip()
            
            # Fila 6 (índice 5): Código de Operador - columna C (índice 2)
            if pd.notna(df_meta.iloc[5, 2]):
                val = df_meta.iloc[5, 2]
                codigo_operador = str(int(val) if isinstance(val, float) else val).strip()
        
        # Si no se encontró, intentar extraer del nombre del archivo
        if not operador_nombre:
            import os
            nombre_archivo = os.path.basename(archivo_excel)
            # Buscar patrones comunes en nombre de archivo
            for patron in ['ekialdebus', 'lurraldebus', 'dbus', 'bizkaibus']:
                if patron.lower() in nombre_archivo.lower():
                    operador_nombre = patron.upper()
                    break
            
            if not operador_nombre:
                print("   ⚠️  No se pudo detectar operador del Excel, usando valores por defecto")
                operador_nombre = "DESCONOCIDO"
        
        # Generar operador_id desde el nombre
        operador_id = None
        if operador_nombre:
            # Convertir a minúsculas, reemplazar espacios por guiones
            operador_id = operador_nombre.lower().replace(' ', '-').replace('_', '-')
            # Eliminar caracteres especiales excepto alfanuméricos y guiones
            operador_id = ''.join(c for c in operador_id if c.isalnum() or c == '-')
        
        return operador_id, operador_nombre, codigo_operador
        
    except Exception as e:
        print(f"   ⚠️  Error leyendo metadatos del Excel: {e}")
        return None, None, None
        # Eliminar caracteres especiales excepto alfanuméricos y guiones
        operador_id = ''.join(c for c in operador_id if c.isalnum() or c == '-')
    
    return operador_id, operador_nombre, codigo_operador


def obtener_hoja_excel(archivo_excel: str, operador_nombre: str) -> str:
    """
    Obtiene el nombre de la hoja a usar en el Excel.
    Si la hoja con el nombre del operador existe, la usa. Si no, usa la primera hoja.
    """
    xl = pd.ExcelFile(archivo_excel)
    hojas = xl.sheet_names
    
    # Intentar encontrar hoja con nombre del operador
    if operador_nombre:
        for hoja in hojas:
            if hoja.upper() == operador_nombre.upper():
                return hoja
    
    # Si no, usar la primera hoja
    return hojas[0] if hojas else None

# =============================================================================
# MAPEO DE TIPOS DE EQUIPO
# =============================================================================
# Cada tipo tiene:
#   - codigo: prefijo para codigoInterno (ej: "AMP" -> "AMP-321-001")
#   - nombre: nombre legible del tipo
#   - categoria: categoría funcional
#   - campos: qué campos aplican para este tipo
#   - posicion: posición típica en el bus (opcional)

TIPOS_EQUIPO = {
    "amplificador": {
        "codigo": "AMP",
        "nombre": "Amplificador",
        "categoria": "Audio",
        "campos": {"numeroSerie": True, "ip": False, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": "CABINA_CONDUCTOR",
    },
    "cpu": {
        "codigo": "CPU",
        "nombre": "CPU / Ordenador Embarcado",
        "categoria": "Procesamiento",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": True, "telefono": False, "mac": True},
        "posicion": "TECHO_DELANTERO",
    },
    "licencia_software": {
        "codigo": "LIC",
        "nombre": "Licencia Software",
        "categoria": "Software",
        "campos": {"numeroSerie": False, "ip": False, "sim": False, "licencia": True, "telefono": False, "mac": False},
        "posicion": None,
    },
    "switch": {
        "codigo": "SWT",
        "nombre": "Switch de Red",
        "categoria": "Conectividad",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": True},
        "posicion": "TECHO_DELANTERO",
    },
    "router": {
        "codigo": "RTR",
        "nombre": "Router",
        "categoria": "Conectividad",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": True},
        "posicion": "TECHO_DELANTERO",
    },
    "modulo_wifi": {
        "codigo": "WIF",
        "nombre": "Modulo WiFi",
        "categoria": "Conectividad",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": True},
        "posicion": "TECHO_CENTRAL",
    },
    "comunicacion": {
        "codigo": "COM",
        "nombre": "Equipo de Comunicaciones",
        "categoria": "Comunicaciones",
        "campos": {"numeroSerie": True, "ip": False, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": "CABINA_CONDUCTOR",
    },
    "camara": {
        "codigo": "CAM",
        "nombre": "Camara CCTV",
        "categoria": "Videovigilancia",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": True},
        "posicion": "TECHO_CENTRAL",
    },
    "pupitre": {
        "codigo": "PUP",
        "nombre": "Pupitre Conductor",
        "categoria": "SAE",
        "campos": {"numeroSerie": True, "ip": False, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": "CABINA_CONDUCTOR",
    },
    "validadora": {
        "codigo": "VAL",
        "nombre": "Validadora",
        "categoria": "Billetaje",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": "ZONA_PASAJEROS_DELANTERA",
    },
    "ip_fija": {
        "codigo": "IPF",
        "nombre": "Asignacion IP Fija",
        "categoria": "Conectividad",
        "campos": {"numeroSerie": False, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": None,
    },
    "sim_card": {
        "codigo": "SIM",
        "nombre": "Tarjeta SIM",
        "categoria": "Conectividad",
        "campos": {"numeroSerie": True, "ip": False, "sim": True, "licencia": False, "telefono": True, "mac": False},
        "posicion": None,
    },
    "dvr": {
        "codigo": "DVR",
        "nombre": "DVR / Grabador Video",
        "categoria": "Videovigilancia",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": True},
        "posicion": "MALETERO",
    },
    "pantalla": {
        "codigo": "PAN",
        "nombre": "Pantalla Informativa",
        "categoria": "Carteleria",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": "ZONA_PASAJEROS_CENTRAL",
    },
    "contador_pasajeros": {
        "codigo": "CNT",
        "nombre": "Contador de Pasajeros",
        "categoria": "SAE",
        "campos": {"numeroSerie": True, "ip": True, "sim": False, "licencia": False, "telefono": False, "mac": False},
        "posicion": "ZONA_PASAJEROS_DELANTERA",
    },
}

# =============================================================================
# MAPEO DE COLUMNAS DEL EXCEL
# =============================================================================
# Define qué columna del Excel corresponde a cada tipo de equipo
# El formato es: "nombre_columna_excel": ("tipo_equipo", indice_si_multiple)
# Si hay múltiples equipos del mismo tipo, usar índice (1, 2, 3...)

def get_mapeo_columnas_ekialdebus() -> Dict[str, tuple]:
    """
    Mapeo específico para el Excel de Ekialdebus.
    Retorna un diccionario donde:
    - key: nombre de la columna en el Excel
    - value: tupla (tipo_equipo, indice, campo_adicional)
    
    Columnas del Excel Ekialdebus:
    - COD_BUS, MATRICULA, Nº Obra / Chasis, MODELO AUTOBÚS, CARROCERIA
    - N. AMPLIFICADOR, N. CPU, LICENCIA, SWITCH, ROUTER
    - IP SIM, SIM m2m, TELEFONO SIM m2m, SIM WIFI 3G, TELEFONO SIM WIFI 3G
    - WIFI, COMMS 1, COMMS 2
    - CAMARA 1, CAMARA 2, CAMARA 3, CAMARA 4
    - PUPITE, VALIDADORA 1, VALIDADORA 2, VALIDADORA 3
    """
    return {
        # Amplificador
        "N. AMPLIFICADOR": ("amplificador", 1, "numeroSerie"),
        
        # CPU
        "N. CPU": ("cpu", 1, "numeroSerie"),
        
        # Licencia
        "LICENCIA": ("licencia_software", 1, "licencia"),
        
        # Switch
        "SWITCH": ("switch", 1, "numeroSerie"),
        
        # Router
        "ROUTER": ("router", 1, "numeroSerie"),
        
        # Módulo WiFi  
        "WIFI": ("modulo_wifi", 1, "numeroSerie"),
        
        # Comunicaciones (hay 2)
        "COMMS 1": ("comunicacion", 1, "numeroSerie"),
        "COMMS 2": ("comunicacion", 2, "numeroSerie"),
        
        # Cámaras (hay 4)
        "CAMARA 1": ("camara", 1, "mac"),
        "CAMARA 2": ("camara", 2, "mac"),
        "CAMARA 3": ("camara", 3, "mac"),
        "CAMARA 4": ("camara", 4, "mac"),
        
        # Pupitre
        "PUPITE": ("pupitre", 1, "numeroSerie"),
        
        # Validadoras (hay 3)
        "VALIDADORA 1": ("validadora", 1, "numeroSerie"),
        "VALIDADORA 2": ("validadora", 2, "numeroSerie"),
        "VALIDADORA 3": ("validadora", 3, "numeroSerie"),
        
        # IP Fija (del SIM)
        "IP SIM": ("ip_fija", 1, "ip"),
        
        # SIM Cards con teléfonos (hay 2: m2m y WiFi 3G)
        "SIM m2m": ("sim_card", 1, "icc"),
        "TELEFONO SIM m2m": ("sim_card", 1, "telefono"),
        "SIM WIFI 3G": ("sim_card", 2, "icc"),
        "TELEFONO SIM WIFI 3G": ("sim_card", 2, "telefono"),
    }


# =============================================================================
# FUNCIONES AUXILIARES
# =============================================================================

def limpiar_valor(valor: Any) -> Optional[str]:
    """Limpia un valor del Excel, retorna None si está vacío."""
    if pd.isna(valor):
        return None
    valor_str = str(valor).strip()
    if valor_str == "" or valor_str.lower() in ["nan", "none", "-", "n/a"]:
        return None
    return valor_str


def generar_codigo_interno(tipo: str, bus_numero: str, indice: int) -> str:
    """Genera el código interno del equipo."""
    tipo_config = TIPOS_EQUIPO.get(tipo, {})
    prefijo = tipo_config.get("codigo", "EQP")
    return f"{prefijo}-{bus_numero}-{indice:03d}"


def crear_equipo_base(
    codigo_interno: str,
    tipo_key: str,
    bus_id: str,
    bus_codigo: str,
    operador_id: str,
    posicion: Optional[str] = None
) -> Dict[str, Any]:
    """Crea la estructura base de un equipo."""
    
    tipo_config = TIPOS_EQUIPO.get(tipo_key, {})
    ahora = datetime.utcnow()
    
    return {
        "codigoInterno": codigo_interno,
        "tipoEquipoId": tipo_key,
        "tipoEquipoNombre": tipo_config.get("nombre", tipo_key),
        "propiedad": {
            "propietario": "DFG",
            "operadorAsignadoId": operador_id,
        },
        "ubicacionActual": {
            "tipo": "autobus",
            "id": bus_id,
            "nombre": bus_codigo,
            "posicionEnBus": posicion or tipo_config.get("posicion"),
        },
        "estado": "en_servicio",
        "fechas": {
            "alta": ahora,
            "instalacionActual": ahora,
        },
        "estadisticas": {
            "totalAverias": 0,
            "totalMovimientos": 1,
            "diasEnServicio": 0,
        },
        "auditoria": {
            "creadoPor": "importacion_excel",
            "creadoEn": ahora,
            "modificadoPor": "importacion_excel",
            "modificadoEn": ahora,
        },
        "searchTerms": [],
    }


def agregar_datos_especificos(
    equipo: Dict[str, Any],
    tipo_key: str,
    valores: Dict[str, Any]
) -> Dict[str, Any]:
    """Agrega datos específicos según el tipo de equipo."""
    
    tipo_config = TIPOS_EQUIPO.get(tipo_key, {})
    campos = tipo_config.get("campos", {})
    
    # Número de serie
    if valores.get("numeroSerie"):
        equipo["numeroSerieFabricante"] = valores["numeroSerie"]
    
    # Datos de red (IP, MAC)
    if campos.get("ip") or campos.get("mac"):
        red = {}
        if valores.get("ip"):
            red["ip"] = valores["ip"]
        if valores.get("mac"):
            red["mac"] = valores["mac"]
        if red:
            equipo["red"] = red
    
    # Datos SIM
    if campos.get("sim") or campos.get("telefono"):
        sim = {}
        if valores.get("icc"):
            sim["icc"] = valores["icc"]
        if valores.get("telefono"):
            sim["msisdn"] = valores["telefono"]
        if sim:
            equipo["sim"] = sim
    
    # Licencias
    if campos.get("licencia") and valores.get("licencia"):
        equipo["licencias"] = [{
            "codigo": valores["licencia"],
            "tipo": "perpetua",
            "activa": True,
        }]
    
    # Actualizar términos de búsqueda
    search_terms = [
        equipo["codigoInterno"].lower(),
        equipo["tipoEquipoNombre"].lower(),
    ]
    if equipo.get("numeroSerieFabricante"):
        search_terms.append(equipo["numeroSerieFabricante"].lower())
    if equipo.get("red", {}).get("ip"):
        search_terms.append(equipo["red"]["ip"])
    if equipo.get("red", {}).get("mac"):
        search_terms.append(equipo["red"]["mac"].lower())
    if equipo.get("sim", {}).get("msisdn"):
        search_terms.append(equipo["sim"]["msisdn"])
    
    equipo["searchTerms"] = search_terms
    
    return equipo


# =============================================================================
# FUNCIÓN PRINCIPAL DE IMPORTACIÓN
# =============================================================================

def importar_equipos():
    """Función principal que ejecuta la importación."""
    global OPERADOR_ID, OPERADOR_NOMBRE, CODIGO_OPERADOR, HOJA_EXCEL
    
    print("=" * 70)
    print("IMPORTADOR DE EQUIPOS A FIRESTORE - ZaintzaBus")
    print("=" * 70)
    
    # Auto-detectar operador si no está configurado
    if OPERADOR_ID is None or OPERADOR_NOMBRE is None:
        print("\n🔍 Detectando operador desde el archivo Excel...")
        detected_id, detected_nombre, detected_codigo = leer_operador_desde_excel(ARCHIVO_EXCEL)
        
        if OPERADOR_ID is None:
            OPERADOR_ID = detected_id
        if OPERADOR_NOMBRE is None:
            OPERADOR_NOMBRE = detected_nombre
        if CODIGO_OPERADOR is None:
            CODIGO_OPERADOR = detected_codigo
        
        print(f"   📋 Operador detectado: {OPERADOR_NOMBRE}")
        print(f"   📋 Código de operador: {CODIGO_OPERADOR}")
        print(f"   📋 Tenant ID generado: {OPERADOR_ID}")
    
    # Auto-detectar hoja si no está configurada
    if HOJA_EXCEL is None:
        HOJA_EXCEL = obtener_hoja_excel(ARCHIVO_EXCEL, OPERADOR_NOMBRE)
        print(f"   📋 Hoja detectada: {HOJA_EXCEL}")
    
    print(f"\nOperador: {OPERADOR_NOMBRE} ({OPERADOR_ID})")
    print(f"Archivo: {ARCHIVO_EXCEL}")
    print(f"Hoja: {HOJA_EXCEL}")
    print()
    
    # Inicializar Firebase
    print("[1/5] Inicializando Firebase...")
    if not firebase_admin._apps:
        cred = credentials.Certificate("scripts/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("      Firebase inicializado correctamente")
    
    # Leer Excel
    print(f"\n[2/5] Leyendo archivo Excel...")
    try:
        df = pd.read_excel(ARCHIVO_EXCEL, sheet_name=HOJA_EXCEL, header=HEADER_ROW)
        df.columns = df.columns.str.strip()  # Limpiar espacios en nombres de columnas
        print(f"      Filas encontradas: {len(df)}")
        print(f"      Columnas: {list(df.columns)[:10]}...")  # Mostrar primeras 10
    except Exception as e:
        print(f"      ERROR: No se pudo leer el archivo Excel: {e}")
        sys.exit(1)
    
    # Obtener mapeo de columnas
    mapeo = get_mapeo_columnas_ekialdebus()
    
    # Procesar datos
    print(f"\n[3/5] Procesando equipos...")
    equipos_a_subir = []
    equipos_por_bus = {}
    
    for idx, row in df.iterrows():
        # Obtener número de bus
        bus_numero = limpiar_valor(row.get(COLUMNA_BUS))
        if not bus_numero:
            continue
        
        bus_id = f"{PREFIJO_BUS}-{bus_numero}"
        bus_codigo = bus_id
        
        # Inicializar contador de equipos por tipo para este bus
        if bus_id not in equipos_por_bus:
            equipos_por_bus[bus_id] = {}
        
        # Agrupar valores por tipo de equipo e índice
        valores_por_equipo = {}  # {(tipo, indice): {campo: valor}}
        
        for columna, (tipo, indice, campo) in mapeo.items():
            valor = limpiar_valor(row.get(columna))
            if valor:
                key = (tipo, indice)
                if key not in valores_por_equipo:
                    valores_por_equipo[key] = {}
                valores_por_equipo[key][campo] = valor
        
        # Crear equipos
        for (tipo, indice), valores in valores_por_equipo.items():
            if not valores:
                continue
            
            # Generar código interno
            codigo_interno = generar_codigo_interno(tipo, bus_numero, indice)
            
            # Crear equipo base
            equipo = crear_equipo_base(
                codigo_interno=codigo_interno,
                tipo_key=tipo,
                bus_id=bus_id,
                bus_codigo=bus_codigo,
                operador_id=OPERADOR_ID,
            )
            
            # Agregar datos específicos
            equipo = agregar_datos_especificos(equipo, tipo, valores)
            
            equipos_a_subir.append(equipo)
        
        if (idx + 1) % 10 == 0:
            print(f"      Procesados {idx + 1} buses...")
    
    print(f"      Total equipos a subir: {len(equipos_a_subir)}")
    
    # Mostrar resumen por tipo
    tipos_conteo = {}
    for eq in equipos_a_subir:
        tipo = eq["tipoEquipoId"]
        tipos_conteo[tipo] = tipos_conteo.get(tipo, 0) + 1
    
    print("\n      Resumen por tipo de equipo:")
    for tipo, count in sorted(tipos_conteo.items()):
        tipo_nombre = TIPOS_EQUIPO.get(tipo, {}).get("nombre", tipo)
        print(f"        - {tipo_nombre}: {count}")
    
    # Subir a Firestore
    print(f"\n[4/5] Subiendo equipos a Firestore (coleccion 'equipos')...")
    
    # Primero, verificar si ya existen equipos y preguntar
    existing_check = db.collection("equipos").limit(5).get()
    if len(existing_check) > 0:
        print(f"      AVISO: Ya existen {len(existing_check)}+ equipos en la coleccion.")
        respuesta = input("      Desea continuar y agregar los nuevos? (s/n): ")
        if respuesta.lower() != 's':
            print("      Importacion cancelada.")
            sys.exit(0)
    
    # Usar batches para mejor rendimiento
    BATCH_SIZE = 500
    batch = db.batch()
    batch_count = 0
    total_subidos = 0
    
    for equipo in equipos_a_subir:
        # Usar codigoInterno como ID del documento para facilitar búsquedas
        doc_id = equipo["codigoInterno"].replace("/", "-")
        doc_ref = db.collection("equipos").document(doc_id)
        batch.set(doc_ref, equipo)
        batch_count += 1
        
        if batch_count >= BATCH_SIZE:
            print(f"      Guardando batch ({batch_count} operaciones)...")
            batch.commit()
            total_subidos += batch_count
            batch = db.batch()
            batch_count = 0
    
    # Guardar batch final
    if batch_count > 0:
        print(f"      Guardando batch final ({batch_count} operaciones)...")
        batch.commit()
        total_subidos += batch_count
    
    # Crear/actualizar tipos de equipo en el catálogo
    print(f"\n[5/5] Actualizando catalogo de tipos de equipo...")
    tipos_batch = db.batch()
    
    for tipo_key, tipo_config in TIPOS_EQUIPO.items():
        if tipo_key in tipos_conteo:  # Solo tipos que se usaron
            doc_ref = db.collection("tipos_equipo").document(tipo_key)
            tipo_doc = {
                "codigo": tipo_config["codigo"],
                "nombre": tipo_config["nombre"],
                "categoria": tipo_config["categoria"],
                "campos": tipo_config["campos"],
                "activo": True,
                "auditoria": {
                    "creadoPor": "importacion_excel",
                    "creadoEn": datetime.utcnow(),
                    "modificadoPor": "importacion_excel",
                    "modificadoEn": datetime.utcnow(),
                },
            }
            tipos_batch.set(doc_ref, tipo_doc, merge=True)
    
    tipos_batch.commit()
    print(f"      Tipos de equipo actualizados: {len(tipos_conteo)}")
    
    # Resumen final
    print("\n" + "=" * 70)
    print("IMPORTACION COMPLETADA")
    print("=" * 70)
    print(f"  Equipos subidos: {total_subidos}")
    print(f"  Tipos de equipo: {len(tipos_conteo)}")
    print(f"  Coleccion: equipos (global)")
    print()
    print("Los equipos ahora deberan aparecer en:")
    print("  - Seccion 'Equipos' de la aplicacion")
    print("  - Vista de equipos de cada autobus en 'Flota'")
    print("=" * 70)


# =============================================================================
# SCRIPT DE LIMPIEZA (opcional)
# =============================================================================

def limpiar_equipos_existentes():
    """Elimina todos los equipos de la colección (usar con cuidado)."""
    
    print("AVISO: Esta accion eliminara TODOS los equipos de Firestore.")
    confirmacion = input("Escribe 'ELIMINAR' para confirmar: ")
    
    if confirmacion != "ELIMINAR":
        print("Operacion cancelada.")
        return
    
    if not firebase_admin._apps:
        cred = credentials.Certificate("scripts/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Obtener todos los documentos
    docs = db.collection("equipos").stream()
    
    batch = db.batch()
    count = 0
    
    for doc in docs:
        batch.delete(doc.reference)
        count += 1
        
        if count % 500 == 0:
            batch.commit()
            print(f"Eliminados {count} documentos...")
            batch = db.batch()
    
    if count % 500 != 0:
        batch.commit()
    
    print(f"Total eliminados: {count} equipos")


# =============================================================================
# PUNTO DE ENTRADA
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--limpiar":
        limpiar_equipos_existentes()
    else:
        importar_equipos()
