/**
 * Script para comparar datos entre tenants
 * Verifica si los datos de lurraldebus-gipuzkoa y ekialdebus ya existen en ekialdebus-26
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (getApps().length === 0) {
  initializeApp({ credential: cert(path.join(__dirname, 'serviceAccountKey.json')) });
}
const db = getFirestore();

async function analizarDatos() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     ANÁLISIS COMPARATIVO DE DATOS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Obtener todos los códigos de autobuses de ekialdebus-26 (el tenant bueno)
  const ek26Snap = await db.collection('tenants/ekialdebus-26/autobuses').get();
  const codigosEk26 = new Set(ek26Snap.docs.map(d => d.data().codigo || d.id));
  
  console.log(`✅ ekialdebus-26: ${ek26Snap.size} autobuses`);
  console.log(`   Códigos: ${Array.from(codigosEk26).sort().join(', ')}\n`);

  // 2. Analizar lurraldebus-gipuzkoa
  console.log('─'.repeat(60));
  console.log('📁 ANÁLISIS: lurraldebus-gipuzkoa');
  console.log('─'.repeat(60));
  
  const lurrSnap = await db.collection('tenants/lurraldebus-gipuzkoa/autobuses').get();
  const codigosLurr = lurrSnap.docs.map(d => d.data().codigo || d.id);
  
  const lurrEnEk26 = codigosLurr.filter(c => codigosEk26.has(c));
  const lurrNoEnEk26 = codigosLurr.filter(c => !codigosEk26.has(c));
  
  console.log(`   Total autobuses: ${lurrSnap.size}`);
  console.log(`   ✅ Ya existen en ekialdebus-26: ${lurrEnEk26.length}`);
  console.log(`   ❌ NO existen en ekialdebus-26: ${lurrNoEnEk26.length}`);
  if (lurrNoEnEk26.length > 0) {
    console.log(`      Códigos únicos: ${lurrNoEnEk26.join(', ')}`);
  }

  // Incidencias
  const incLurrSnap = await db.collection('tenants/lurraldebus-gipuzkoa/incidencias').get();
  console.log(`\n   📋 Incidencias: ${incLurrSnap.size}`);
  for (const doc of incLurrSnap.docs) {
    const data = doc.data();
    console.log(`      - ${doc.id}: ${data.titulo || data.descripcion?.substring(0, 50) || 'Sin título'} (${data.estado})`);
  }

  // 3. Analizar ekialdebus
  console.log('\n' + '─'.repeat(60));
  console.log('📁 ANÁLISIS: ekialdebus');
  console.log('─'.repeat(60));
  
  const ekSnap = await db.collection('tenants/ekialdebus/autobuses').get();
  const codigosEk = ekSnap.docs.map(d => d.data().codigo || d.id);
  
  const ekEnEk26 = codigosEk.filter(c => codigosEk26.has(c));
  const ekNoEnEk26 = codigosEk.filter(c => !codigosEk26.has(c));
  
  console.log(`   Total autobuses: ${ekSnap.size}`);
  console.log(`   ✅ Ya existen en ekialdebus-26: ${ekEnEk26.length}`);
  console.log(`   ❌ NO existen en ekialdebus-26: ${ekNoEnEk26.length}`);
  if (ekNoEnEk26.length > 0) {
    console.log(`      Códigos únicos: ${ekNoEnEk26.join(', ')}`);
  }

  // 4. Verificar usuarios en lurraldebus-gipuzkoa
  console.log('\n' + '─'.repeat(60));
  console.log('👤 USUARIOS en lurraldebus-gipuzkoa');
  console.log('─'.repeat(60));
  
  const usersLurrSnap = await db.collection('tenants/lurraldebus-gipuzkoa/usuarios').get();
  console.log(`   Total: ${usersLurrSnap.size}`);
  for (const doc of usersLurrSnap.docs) {
    const data = doc.data();
    console.log(`   - ${data.email || doc.id}: ${data.nombre} ${data.apellidos || ''} (${data.rol})`);
  }

  // 5. Verificar si ya hay usuarios en ekialdebus-26
  console.log('\n' + '─'.repeat(60));
  console.log('👤 USUARIOS en ekialdebus-26');
  console.log('─'.repeat(60));
  
  const usersEk26Snap = await db.collection('tenants/ekialdebus-26/usuarios').get();
  console.log(`   Total: ${usersEk26Snap.size}`);
  for (const doc of usersEk26Snap.docs) {
    const data = doc.data();
    console.log(`   - ${data.email || doc.id}: ${data.nombre} ${data.apellidos || ''} (${data.rol})`);
  }

  // 6. Resumen final
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN');
  console.log('═'.repeat(60));
  
  const todoEnEk26 = lurrNoEnEk26.length === 0 && ekNoEnEk26.length === 0;
  
  if (todoEnEk26) {
    console.log('✅ TODOS los autobuses de los otros tenants YA EXISTEN en ekialdebus-26');
    console.log('   → Se pueden eliminar lurraldebus-gipuzkoa y ekialdebus sin perder datos de autobuses');
  } else {
    console.log('⚠️  HAY DATOS ÚNICOS que no existen en ekialdebus-26:');
    if (lurrNoEnEk26.length > 0) console.log(`   - lurraldebus-gipuzkoa: ${lurrNoEnEk26.length} autobuses únicos`);
    if (ekNoEnEk26.length > 0) console.log(`   - ekialdebus: ${ekNoEnEk26.length} autobuses únicos`);
  }
  
  if (incLurrSnap.size > 0) {
    console.log(`\n⚠️  HAY ${incLurrSnap.size} INCIDENCIAS en lurraldebus-gipuzkoa que se perderán`);
  }

  console.log('\n✅ Análisis completado');
}

analizarDatos().catch(console.error);
