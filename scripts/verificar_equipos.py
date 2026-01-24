"""Verificar equipos importados"""
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("scripts/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Contar equipos
all_equipos = list(db.collection("equipos").stream())
print(f"Total equipos en coleccion 'equipos': {len(all_equipos)}")
print()

# Mostrar ejemplo de equipos
print("Ejemplo de 3 equipos:")
for eq in all_equipos[:3]:
    data = eq.to_dict()
    print(f"  - {eq.id}:")
    print(f"      tipo: {data.get('tipoEquipoNombre')}")
    print(f"      ubicacion: {data.get('ubicacionActual', {})}")
    print()

# Verificar equipos del bus 321
print("=" * 50)
print("Equipos del BUS-321:")
bus_equipos = db.collection("equipos").where("ubicacionActual.tipo", "==", "autobus").where("ubicacionActual.id", "==", "BUS-321").stream()
count = 0
for eq in bus_equipos:
    data = eq.to_dict()
    print(f"  - {data.get('codigoInterno')}: {data.get('tipoEquipoNombre')}")
    count += 1
print(f"\nTotal equipos en BUS-321: {count}")

# Verificar tipos de equipo
print()
print("=" * 50)
print("Tipos de equipo en catalogo:")
tipos = list(db.collection("tipos_equipo").stream())
for t in tipos:
    data = t.to_dict()
    print(f"  - {t.id}: {data.get('nombre')}")
