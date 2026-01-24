"""Verificar relación entre activos y equipos"""
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("scripts/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Ver activos de ekialdebus
print("ACTIVOS en tenants/ekialdebus/activos:")
print("=" * 60)
activos = list(db.collection("tenants/ekialdebus/activos").limit(5).stream())
for a in activos:
    data = a.to_dict()
    print(f"  Doc ID: {a.id}")
    print(f"    codigo: {data.get('codigo')}")
    print(f"    matricula: {data.get('matricula')}")
    print()

# Ver equipos y su ubicacionActual.id
print("\nEQUIPOS en coleccion global 'equipos':")
print("=" * 60)
equipos = list(db.collection("equipos").limit(5).stream())
for e in equipos:
    data = e.to_dict()
    ubicacion = data.get("ubicacionActual", {})
    print(f"  Doc ID: {e.id}")
    print(f"    codigoInterno: {data.get('codigoInterno')}")
    print(f"    ubicacionActual.id: {ubicacion.get('id')}")
    print(f"    ubicacionActual.nombre: {ubicacion.get('nombre')}")
    print()

print("\nCONCLUSION:")
print("=" * 60)
print("Los equipos usan 'BUS-XXX' como ubicacionActual.id")
print("Los activos tienen IDs autogenerados por Firestore")
print("Necesitamos hacer match por codigo del activo")
