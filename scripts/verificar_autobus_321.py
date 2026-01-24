"""Verificar datos del autobus 321 en Firestore"""
import firebase_admin
from firebase_admin import credentials, firestore

# Inicializar
if not firebase_admin._apps:
    cred = credentials.Certificate("scripts/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()

print("=" * 60)
print("VERIFICANDO AUTOBUS 321 EN FIRESTORE")
print("=" * 60)

# Listar colecciones raíz
print("\n1. Colecciones raíz:")
for col in db.collections():
    print(f"   - {col.id}")

# Listar tenants
print("\n2. Tenants disponibles:")
for t in db.collection("tenants").stream():
    print(f"   - {t.id}")

# Buscar subcolecciones dentro de un tenant
print("\n3. Subcolecciones en tenants/ekialdebus:")
tenant_ref = db.collection("tenants").document("ekialdebus")
for col in tenant_ref.collections():
    print(f"   - {col.id}")

# Buscar el bus 321 en tenants/ekialdebus/activos
print("\n4. Buscando bus 321 en 'tenants/ekialdebus/activos':")
docs = list(db.collection("tenants/ekialdebus/activos").where("codigo", "==", "321").stream())
if docs:
    for d in docs:
        print(f"   ID: {d.id}")
        data = d.to_dict()
        for k, v in sorted(data.items()):
            print(f"   {k}: {v}")
else:
    print("   No encontrado en activos")

# Buscar en equipos donde ubicacion sea BUS-321
print("\n5. Equipos del bus 321 (colección global 'equipos'):")
equipo_sample = None
for d in db.collection("equipos").where("ubicacionActual.nombre", "==", "BUS-321").limit(3).stream():
    data = d.to_dict()
    equipo_sample = data
    print(f"   - {data.get('codigoInterno')}: {data.get('tipoEquipoNombre')}")

# Verificar estructura del bus en equipos
if equipo_sample:
    print(f"\n6. Ubicación del equipo (referencia al bus):")
    ub = equipo_sample.get("ubicacionActual", {})
    for k, v in ub.items():
        print(f"   {k}: {v}")
