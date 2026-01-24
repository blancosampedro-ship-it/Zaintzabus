"""
=============================================================================
VERIFICADOR DE EQUIPOS EN FIRESTORE - ZaintzaBus
=============================================================================
Este script verifica cómo están almacenados los equipos en Firestore
para diagnosticar si los tipos de equipo están correctamente identificados.
=============================================================================
"""

import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict

def verificar_equipos():
    """Verifica el estado de los equipos en Firestore."""
    
    print("=" * 70)
    print("VERIFICADOR DE EQUIPOS EN FIRESTORE")
    print("=" * 70)
    
    # Inicializar Firebase
    print("\n[1] Inicializando Firebase...")
    if not firebase_admin._apps:
        cred = credentials.Certificate("scripts/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("    Firebase inicializado correctamente")
    
    # Obtener equipos
    print("\n[2] Obteniendo equipos de Firestore...")
    equipos = list(db.collection("equipos").stream())
    print(f"    Total equipos encontrados: {len(equipos)}")
    
    if len(equipos) == 0:
        print("\n⚠️  No hay equipos en la colección. Ejecuta el importador primero.")
        return
    
    # Analizar estructura
    print("\n[3] Analizando estructura de datos...")
    
    # Contadores
    por_tipo = defaultdict(int)
    por_bus = defaultdict(list)
    sin_tipo_nombre = []
    sin_tipo_id = []
    sin_numero_serie = []
    
    # Muestra de equipos
    muestras = []
    
    for doc in equipos:
        data = doc.to_dict()
        doc_id = doc.id
        
        # Verificar campos clave
        tipo_id = data.get("tipoEquipoId", "SIN_TIPO_ID")
        tipo_nombre = data.get("tipoEquipoNombre", "")
        numero_serie = data.get("numeroSerieFabricante", "")
        codigo_interno = data.get("codigoInterno", "")
        ubicacion = data.get("ubicacionActual", {})
        bus_nombre = ubicacion.get("nombre", "SIN_BUS")
        
        # Contadores
        por_tipo[tipo_nombre or tipo_id] += 1
        por_bus[bus_nombre].append({
            "codigo": codigo_interno,
            "tipo": tipo_nombre or tipo_id,
            "serie": numero_serie
        })
        
        # Verificar datos faltantes
        if not tipo_nombre:
            sin_tipo_nombre.append(doc_id)
        if not tipo_id or tipo_id == "SIN_TIPO_ID":
            sin_tipo_id.append(doc_id)
        if not numero_serie:
            sin_numero_serie.append(doc_id)
        
        # Guardar muestras
        if len(muestras) < 5:
            muestras.append({
                "id": doc_id,
                "codigoInterno": codigo_interno,
                "tipoEquipoId": tipo_id,
                "tipoEquipoNombre": tipo_nombre,
                "numeroSerie": numero_serie,
                "bus": bus_nombre,
            })
    
    # Mostrar resumen por tipo
    print("\n" + "-" * 50)
    print("EQUIPOS POR TIPO:")
    print("-" * 50)
    for tipo, count in sorted(por_tipo.items(), key=lambda x: -x[1]):
        print(f"  {tipo}: {count}")
    
    # Mostrar ejemplo de un bus
    print("\n" + "-" * 50)
    print("EJEMPLO: EQUIPOS EN UN BUS")
    print("-" * 50)
    primer_bus = list(por_bus.keys())[0] if por_bus else None
    if primer_bus:
        print(f"\nBus: {primer_bus}")
        for eq in por_bus[primer_bus][:10]:  # Máximo 10
            print(f"  - {eq['tipo']}: {eq['serie'] or '(sin serie)'} [{eq['codigo']}]")
    
    # Mostrar muestras
    print("\n" + "-" * 50)
    print("MUESTRA DE DOCUMENTOS (primeros 5):")
    print("-" * 50)
    for m in muestras:
        print(f"\n  ID: {m['id']}")
        print(f"    codigoInterno: {m['codigoInterno']}")
        print(f"    tipoEquipoId: {m['tipoEquipoId']}")
        print(f"    tipoEquipoNombre: {m['tipoEquipoNombre']}")
        print(f"    numeroSerie: {m['numeroSerie']}")
        print(f"    bus: {m['bus']}")
    
    # Alertas
    print("\n" + "-" * 50)
    print("ALERTAS:")
    print("-" * 50)
    if sin_tipo_nombre:
        print(f"  ⚠️  Equipos sin tipoEquipoNombre: {len(sin_tipo_nombre)}")
    if sin_tipo_id:
        print(f"  ⚠️  Equipos sin tipoEquipoId: {len(sin_tipo_id)}")
    if sin_numero_serie:
        print(f"  ℹ️  Equipos sin número de serie: {len(sin_numero_serie)} (puede ser normal para licencias/IPs)")
    
    if not sin_tipo_nombre and not sin_tipo_id:
        print("  ✅ Todos los equipos tienen tipo correctamente identificado")
    
    # Verificar catálogo de tipos
    print("\n" + "-" * 50)
    print("CATÁLOGO DE TIPOS DE EQUIPO:")
    print("-" * 50)
    tipos = list(db.collection("tipos_equipo").stream())
    if tipos:
        for t in tipos:
            data = t.to_dict()
            print(f"  - {t.id}: {data.get('nombre', '?')} ({data.get('categoria', '?')})")
    else:
        print("  ⚠️  No hay tipos de equipo en el catálogo")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    verificar_equipos()
