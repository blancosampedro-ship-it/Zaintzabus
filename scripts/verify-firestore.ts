import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const serviceAccount = require('./serviceAccountKey.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();
const TENANT = 'lurraldebus-gipuzkoa';

async function verify() {
  console.log('🔍 VERIFICACIÓN REAL DE DATOS EN FIRESTORE\n');
  
  // Verificar buses
  const activos = await db.collection(`tenants/${TENANT}/activos`).limit(3).get();
  console.log(`=== BUSES EN FIRESTORE (${activos.size} mostrados de ${(await db.collection(`tenants/${TENANT}/activos`).count().get()).data().count} total) ===`);
  activos.docs.forEach(d => {
    const data = d.data();
    console.log(`\n📍 Doc ID: ${d.id}`);
    console.log(`   Código: ${data.codigo}`);
    console.log(`   Matrícula: ${data.matricula}`);
    console.log(`   Modelo: ${data.modelo}`);
    console.log(`   Bastidor: ${data.bastidor || data.numeroSerie}`);
    console.log(`   Equipos instalados: ${data.equipos?.length || 0}`);
    if (data.equipos?.length > 0) {
      console.log(`   Tipos: ${data.equipos.slice(0,4).map((e: any) => e.tipo).join(', ')}...`);
    }
  });

  // Verificar equipos
  const inv = await db.collection(`tenants/${TENANT}/inventario`).limit(5).get();
  console.log(`\n\n=== EQUIPOS EN INVENTARIO (${inv.size} mostrados de ${(await db.collection(`tenants/${TENANT}/inventario`).count().get()).data().count} total) ===`);
  inv.docs.forEach(d => {
    const data = d.data();
    console.log(`\n📦 ${data.sku}`);
    console.log(`   Modelo: ${data.modelo}`);
    console.log(`   Nº Serie: ${data.numeroSerie}`);
    console.log(`   Categoría: ${data.categoria}`);
    console.log(`   Estado: ${data.estado}`);
    console.log(`   Ubicación: ${data.ubicacion?.descripcion || 'N/A'}`);
  });
  
  // Verificar operador
  const ops = await db.collection(`tenants/${TENANT}/operadores`).get();
  console.log(`\n\n=== OPERADORES (${ops.size}) ===`);
  ops.docs.forEach(d => {
    const data = d.data();
    console.log(`🏢 ${data.nombre} (código: ${data.codigo})`);
  });

  console.log('\n\n✅ Los datos SÍ están en Firestore');
  process.exit(0);
}

verify();
