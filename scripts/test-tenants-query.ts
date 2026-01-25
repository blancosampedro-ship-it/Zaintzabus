/**
 * Script para verificar que las reglas están funcionando correctamente
 * Simula la query que hace el OperadoresService
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

async function main() {
  console.log('🔍 Verificando colección tenants...\n');

  try {
    // Esta query es la misma que hace el OperadoresService
    const snap = await db.collection('tenants').orderBy('nombre', 'asc').get();
    
    console.log(`✅ Query exitosa! Encontrados ${snap.docs.length} tenants:\n`);
    
    snap.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   📁 ${doc.id}`);
      console.log(`      nombre: ${data.nombre || '(sin nombre)'}`);
      console.log(`      activo: ${data.activo !== false ? 'Sí' : 'No'}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Error en query:', err);
  }

  process.exit(0);
}

main();
