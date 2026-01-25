/**
 * Script para crear el documento del operador ekialdebus-26
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (getApps().length === 0) {
  initializeApp({ credential: cert(path.join(__dirname, 'serviceAccountKey.json')) });
}
const db = getFirestore();

async function crearOperador() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     CREAR OPERADOR ekialdebus-26                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Verificar si ya existe
  const existente = await db.doc('tenants/ekialdebus-26').get();
  if (existente.exists) {
    console.log('⚠️ El operador ekialdebus-26 ya existe:');
    console.log(existente.data());
    return;
  }

  // Crear el documento del operador
  const operadorData = {
    nombre: 'Ekialdebus',
    codigo: 26,
    activo: true,
    descripcion: 'Operador de transporte Ekialdebus',
    contacto: {
      email: 'contacto@ekialdebus.com',
      telefono: '',
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.doc('tenants/ekialdebus-26').set(operadorData);
  console.log('✅ Operador ekialdebus-26 creado correctamente');
  console.log(operadorData);

  // Verificar
  console.log('\n📋 Verificando operadores en colección tenants:');
  const snap = await db.collection('tenants').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`   - ${doc.id}: ${data.nombre} (activo: ${data.activo})`);
  }
}

crearOperador().catch(console.error);
