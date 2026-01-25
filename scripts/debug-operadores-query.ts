/**
 * Script para debug detallado de la query de operadores
 * Simula exactamente lo que hace OperadoresService.listActivos()
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Query } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'zaintzabus',
});

const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  console.log('🔍 DIAGNÓSTICO DETALLADO DE OPERADORES');
  console.log('=====================================\n');

  // 1. Ver claims del usuario admin
  console.log('1️⃣ Claims del usuario admin@zaintzabus.com:');
  try {
    const user = await auth.getUserByEmail('admin@zaintzabus.com');
    console.log('   UID:', user.uid);
    console.log('   Custom Claims:', JSON.stringify(user.customClaims, null, 2));
  } catch (err) {
    console.error('   Error:', err);
  }

  // 2. Query exacta que hace OperadoresService.listActivos()
  console.log('\n2️⃣ Query exacta de OperadoresService:');
  console.log('   Query: collection("tenants").orderBy("nombre", "asc")');
  
  try {
    const snap = await db.collection('tenants').orderBy('nombre', 'asc').get();
    console.log(`   ✅ Resultado: ${snap.docs.length} documentos`);
    
    snap.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`   [${i + 1}] ID: ${doc.id}`);
      console.log(`       nombre: ${data.nombre}`);
      console.log(`       activo: ${data.activo}`);
    });
  } catch (err: any) {
    console.error('   ❌ Error:', err.message);
  }

  // 3. Verificar reglas aplicables
  console.log('\n3️⃣ Análisis de reglas Firestore:');
  console.log('   Regla aplicable para list tenants:');
  console.log('   allow list: if isAuthenticated() && (hasRole("dfg") || hasRole("admin"));');
  console.log('');
  console.log('   Para que funcione se necesita:');
  console.log('   - request.auth != null');
  console.log('   - request.auth.token.rol == "dfg" OR request.auth.token.rol == "admin"');

  // 4. Verificar estado actual de las reglas en Firebase
  console.log('\n4️⃣ Importante - Verificar:');
  console.log('   a) Las reglas desplegadas son las correctas');
  console.log('   b) El token del usuario tiene el claim "rol" = "admin"');
  console.log('   c) El navegador no tiene token cacheado viejo');
  console.log('');
  console.log('   Pasos para el usuario:');
  console.log('   1. Abrir DevTools (F12)');
  console.log('   2. Tab Application → Storage → Clear site data');
  console.log('   3. Hacer logout y login de nuevo');
  console.log('   4. Ver Console para errores específicos');

  // 5. Mostrar documento de tenant para comparar
  console.log('\n5️⃣ Contenido completo del tenant existente:');
  const tenantDoc = await db.collection('tenants').doc('lurraldebus-gipuzkoa').get();
  if (tenantDoc.exists) {
    console.log(JSON.stringify(tenantDoc.data(), null, 2));
  }

  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}

main().catch(console.error);
