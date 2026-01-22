/**
 * Script para verificar el estado de datos en Firestore
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();
const TENANT_ID = 'lurraldebus-gipuzkoa';

async function checkData() {
  console.log('🔍 Verificando datos en Firestore...');
  console.log(`📍 Tenant: ${TENANT_ID}\n`);

  const collections = [
    'usuarios',
    'activos',
    'incidencias',
    'inventario',
    'preventivo',
    'contratos',
    'ordenesTrabajo',
    'operadores',
    'tecnicos',
    'categorias',
  ];

  for (const col of collections) {
    try {
      const snapshot = await db.collection(`tenants/${TENANT_ID}/${col}`).get();
      console.log(`📁 ${col}: ${snapshot.size} documentos`);
      
      if (snapshot.size > 0 && snapshot.size <= 3) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`   └─ ${doc.id}: ${data.nombre || data.codigo || data.matricula || data.sku || data.descripcion || '...'}`);
        });
      } else if (snapshot.size > 3) {
        console.log(`   └─ Ejemplos: ${snapshot.docs.slice(0, 3).map(d => d.data().codigo || d.data().matricula || d.data().sku || d.id).join(', ')}...`);
      }
    } catch (error) {
      console.log(`❌ ${col}: Error al consultar`);
    }
  }

  console.log('\n✅ Verificación completada');
  process.exit(0);
}

checkData();
