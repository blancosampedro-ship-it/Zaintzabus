"""
=============================================================================
MIGRADOR DE ACTIVOS A AUTOBUSES - ZaintzaBus
=============================================================================
Este script migra los datos de 'tenants/{tenant}/activos' a 
'tenants/{tenant}/autobuses' con el formato correcto de campos.

Mapeo de campos:
  - modelo (contiene marca) → marca
  - carroceria → modelo (es el modelo real: CITARO, etc.)
  - chasis → numeroChasis
  - (nuevo) → anio (se intenta extraer o se deja vacío)
=============================================================================
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Configuración
TENANTS_A_MIGRAR = ['ekialdebus', 'lurraldebus-gipuzkoa']

def inicializar_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate("scripts/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    return firestore.client()


def migrar_activos_a_autobuses(db, tenant_id: str):
    """Migra activos de un tenant a la colección autobuses."""
    
    print(f"\n{'='*60}")
    print(f"MIGRANDO TENANT: {tenant_id}")
    print(f"{'='*60}")
    
    # Obtener activos
    activos_ref = db.collection(f"tenants/{tenant_id}/activos")
    autobuses_ref = db.collection(f"tenants/{tenant_id}/autobuses")
    
    activos = list(activos_ref.stream())
    print(f"Activos encontrados: {len(activos)}")
    
    if not activos:
        print("  No hay activos para migrar")
        return 0
    
    batch = db.batch()
    count = 0
    
    for doc in activos:
        data = doc.to_dict()
        doc_id = doc.id
        
        # Mapear campos
        # El campo 'modelo' del Excel contiene la MARCA (MERCEDES, MAN, etc.)
        # El campo 'carroceria' contiene el MODELO real (CITARO, LION'S, etc.)
        marca = data.get('modelo', '')  # modelo actual es realmente la marca
        modelo = data.get('carroceria', '')  # carroceria es el modelo real
        
        autobus_data = {
            # Campos identificadores
            'codigo': data.get('codigo'),
            'matricula': data.get('matricula'),
            
            # Campos del vehículo (mapeados correctamente)
            'marca': marca,
            'modelo': modelo,
            'carroceria': data.get('carroceria'),  # Mantener también carroceria
            'numeroChasis': data.get('chasis'),
            'anio': data.get('anio'),  # Puede no existir
            
            # Operador
            'operadorId': tenant_id,
            'operadorNombre': data.get('operadorNombre'),
            
            # Estado
            'estado': data.get('estado', 'operativo'),
            
            # Instalación
            'instalacion': {
                'fase': 'completada' if data.get('migrado') else 'pendiente',
                'fechaPreInstalacion': data.get('fechaPreInstalacion'),
                'fechaInstalacion': data.get('fechaInstalacion'),
                'instalador': data.get('instalador'),
                'migrado': data.get('migrado', False),
            },
            
            # Contadores (iniciales)
            'contadores': {
                'totalEquipos': 0,  # Se actualizará después
                'totalIncidencias': 0,
                'incidenciasAbiertas': 0,
            },
            
            # Auditoría
            'auditoria': {
                'creadoPor': 'migracion_activos',
                'creadoEn': data.get('createdAt', datetime.utcnow()),
                'modificadoPor': 'migracion_activos',
                'modificadoEn': datetime.utcnow(),
            },
            
            # Comentarios originales
            'comentarios': data.get('comentarios'),
        }
        
        # Limpiar campos None
        autobus_data = {k: v for k, v in autobus_data.items() if v is not None}
        autobus_data['instalacion'] = {k: v for k, v in autobus_data.get('instalacion', {}).items() if v is not None}
        
        # Guardar en autobuses con el mismo ID
        autobus_ref = autobuses_ref.document(doc_id)
        batch.set(autobus_ref, autobus_data)
        count += 1
        
        if count % 100 == 0:
            print(f"  Procesados {count}...")
            batch.commit()
            batch = db.batch()
    
    # Commit final
    if count % 100 != 0:
        batch.commit()
    
    print(f"  ✅ Migrados {count} autobuses")
    return count


def actualizar_contadores_equipos(db, tenant_id: str):
    """Actualiza los contadores de equipos para cada autobús."""
    
    print(f"\nActualizando contadores de equipos para {tenant_id}...")
    
    autobuses_ref = db.collection(f"tenants/{tenant_id}/autobuses")
    equipos_ref = db.collection("equipos")
    
    # Contar equipos por bus
    equipos_por_bus = {}
    for eq in equipos_ref.stream():
        data = eq.to_dict()
        ubicacion = data.get('ubicacionActual', {})
        if ubicacion.get('tipo') == 'autobus':
            bus_nombre = ubicacion.get('nombre', '')
            # Extraer código del bus (ej: "BUS-321" -> "321")
            bus_codigo = bus_nombre.replace('BUS-', '') if bus_nombre.startswith('BUS-') else bus_nombre
            equipos_por_bus[bus_codigo] = equipos_por_bus.get(bus_codigo, 0) + 1
    
    # Actualizar autobuses
    batch = db.batch()
    count = 0
    
    for doc in autobuses_ref.stream():
        codigo = doc.to_dict().get('codigo')
        total_equipos = equipos_por_bus.get(codigo, 0)
        
        if total_equipos > 0:
            batch.update(doc.reference, {'contadores.totalEquipos': total_equipos})
            count += 1
            
            if count % 100 == 0:
                batch.commit()
                batch = db.batch()
    
    if count > 0:
        batch.commit()
    
    print(f"  ✅ Actualizados contadores de {count} autobuses")


def main():
    print("=" * 60)
    print("MIGRADOR DE ACTIVOS A AUTOBUSES")
    print("=" * 60)
    
    db = inicializar_firebase()
    print("Firebase inicializado")
    
    total = 0
    for tenant_id in TENANTS_A_MIGRAR:
        # Verificar si el tenant tiene activos
        activos = list(db.collection(f"tenants/{tenant_id}/activos").limit(1).stream())
        if activos:
            count = migrar_activos_a_autobuses(db, tenant_id)
            total += count
            actualizar_contadores_equipos(db, tenant_id)
        else:
            print(f"\n⚠️  Tenant '{tenant_id}' no tiene activos")
    
    print(f"\n{'='*60}")
    print(f"MIGRACIÓN COMPLETADA: {total} autobuses migrados")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
