"""
Script para verificar los datos subidos a Firestore
"""
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("scripts/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
TENANT_ID = "ekialdebus"

print("=" * 60)
print("VERIFICACION DE DATOS EN FIRESTORE")
print("=" * 60)

# Contar vehiculos (activos)
activos_ref = db.collection("tenants").document(TENANT_ID).collection("activos")
activos = list(activos_ref.stream())
print(f"\nVehiculos en Firestore: {len(activos)}")

# Contar equipos (inventario)
inventario_ref = db.collection("tenants").document(TENANT_ID).collection("inventario")
inventario = list(inventario_ref.stream())
print(f"Equipos en Firestore: {len(inventario)}")

# Mostrar algunos ejemplos de vehiculos
print("\nPrimeros 5 vehiculos:")
for activo in activos[:5]:
    data = activo.to_dict()
    print(f"   - {data.get('codigo')}: {data.get('matricula')} ({data.get('modelo', 'N/A')})")

# Mostrar distribucion de equipos por tipo
tipos_equipo = {}
for equipo in inventario:
    data = equipo.to_dict()
    tipo = data.get("tipo", "desconocido")
    tipos_equipo[tipo] = tipos_equipo.get(tipo, 0) + 1

print("\nEquipos por tipo:")
for tipo, count in sorted(tipos_equipo.items()):
    print(f"   - {tipo}: {count}")

# Verificar un bus especifico con sus equipos
bus_ejemplo = "BUS-321"
print(f"\nDetalle del bus {bus_ejemplo}:")
bus_doc = activos_ref.document(bus_ejemplo).get()
if bus_doc.exists:
    bus_data = bus_doc.to_dict()
    print(f"   Matricula: {bus_data.get('matricula')}")
    print(f"   Modelo: {bus_data.get('modelo')}")
    print(f"   Estado: {bus_data.get('estado')}")
    
    # Contar equipos de este bus
    equipos_bus = [e for e in inventario if e.to_dict().get("activoId") == bus_ejemplo]
    print(f"   Equipos instalados: {len(equipos_bus)}")

print("\n" + "=" * 60)
print("RESUMEN")
print("=" * 60)
print(f"Esperados: 51 vehiculos, 954 equipos")
print(f"Encontrados: {len(activos)} vehiculos, {len(inventario)} equipos")
if len(activos) == 51 and len(inventario) == 954:
    print("\n[OK] TODOS LOS DATOS ESTAN CORRECTAMENTE SUBIDOS")
else:
    print("\n[ALERTA] HAY DIFERENCIAS EN LOS CONTEOS")
