/**
 * =============================================================================
 * SCRIPT DE CONSOLIDACIÓN DE TENANTS
 * =============================================================================
 * 
 * Este script:
 * 1. Copia usuarios de lurraldebus-gipuzkoa → ekialdebus-26
 * 2. Actualiza custom claims de usuarios en Firebase Auth
 * 3. Elimina tenants obsoletos (lurraldebus-gipuzkoa, ekialdebus)
 * 
 * EJECUCIÓN:
 *   npx tsx scripts/consolidate-tenants.ts
 *   npx tsx scripts/consolidate-tenants.ts --dry-run
 * 
 * =============================================================================
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

if (getApps().length === 0) {
  initializeApp({ credential: cert(path.join(__dirname, 'serviceAccountKey.json')) });
}

const db = getFirestore();
const auth = getAuth();

const TARGET_TENANT = 'ekialdebus-26';
const TENANTS_TO_DELETE = ['lurraldebus-gipuzkoa', 'ekialdebus'];

async function migrarUsuarios() {
  console.log('\n' + '═'.repeat(60));
  console.log('PASO 1: MIGRAR USUARIOS A ekialdebus-26');
  console.log('═'.repeat(60));

  const sourceSnap = await db.collection('tenants/lurraldebus-gipuzkoa/usuarios').get();
  console.log(`📋 Encontrados ${sourceSnap.size} usuarios para migrar\n`);

  for (const doc of sourceSnap.docs) {
    const data = doc.data();
    const uid = doc.id;
    
    console.log(`👤 ${data.email || uid}`);
    
    if (DRY_RUN) {
      console.log(`   [DRY-RUN] Se copiaría a ekialdebus-26/usuarios/${uid}`);
    } else {
      // Copiar documento de usuario
      await db.collection(`tenants/${TARGET_TENANT}/usuarios`).doc(uid).set({
        ...data,
        tenantId: TARGET_TENANT, // Actualizar tenantId interno si existe
      });
      console.log(`   ✅ Copiado a ekialdebus-26/usuarios`);
    }
  }
}

async function actualizarClaimsUsuarios() {
  console.log('\n' + '═'.repeat(60));
  console.log('PASO 2: ACTUALIZAR CUSTOM CLAIMS EN FIREBASE AUTH');
  console.log('═'.repeat(60));

  // Obtener todos los usuarios de Auth
  const listResult = await auth.listUsers();
  
  for (const user of listResult.users) {
    const claims = user.customClaims || {};
    
    // Solo actualizar si tienen tenantId de los obsoletos
    if (claims.tenantId === 'lurraldebus-gipuzkoa' || claims.tenantId === 'ekialdebus') {
      console.log(`\n👤 ${user.email}`);
      console.log(`   Tenant actual: ${claims.tenantId}`);
      
      if (DRY_RUN) {
        console.log(`   [DRY-RUN] Se cambiaría a: ${TARGET_TENANT}`);
      } else {
        await auth.setCustomUserClaims(user.uid, {
          ...claims,
          tenantId: TARGET_TENANT,
        });
        console.log(`   ✅ Actualizado a: ${TARGET_TENANT}`);
      }
    }
  }
}

async function eliminarColeccion(collectionPath: string) {
  const snap = await db.collection(collectionPath).get();
  
  if (snap.size === 0) return 0;
  
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  
  if (!DRY_RUN) {
    await batch.commit();
  }
  
  return snap.size;
}

async function eliminarTenantObsoleto(tenantId: string) {
  console.log(`\n📁 Eliminando tenant: ${tenantId}`);
  
  // Subcolecciones conocidas
  const subcolecciones = [
    'autobuses',
    'equipos', 
    'incidencias',
    'ordenes-trabajo',
    'usuarios',
    'activos',
    'inventario',
    'auditoria',
    'configuracion',
  ];
  
  let totalEliminados = 0;
  
  for (const sub of subcolecciones) {
    const collPath = `tenants/${tenantId}/${sub}`;
    const count = await eliminarColeccion(collPath);
    
    if (count > 0) {
      if (DRY_RUN) {
        console.log(`   [DRY-RUN] Se eliminarían ${count} docs de ${sub}`);
      } else {
        console.log(`   🗑️  Eliminados ${count} documentos de ${sub}`);
      }
      totalEliminados += count;
    }
  }
  
  // Eliminar documento del tenant si existe
  const tenantDoc = db.doc(`tenants/${tenantId}`);
  const tenantSnap = await tenantDoc.get();
  if (tenantSnap.exists) {
    if (!DRY_RUN) {
      await tenantDoc.delete();
    }
    console.log(`   🗑️  Eliminado documento tenant`);
    totalEliminados++;
  }
  
  return totalEliminados;
}

async function limpiarTenantsObsoletos() {
  console.log('\n' + '═'.repeat(60));
  console.log('PASO 3: ELIMINAR TENANTS OBSOLETOS');
  console.log('═'.repeat(60));

  let totalEliminados = 0;
  
  for (const tenant of TENANTS_TO_DELETE) {
    const count = await eliminarTenantObsoleto(tenant);
    totalEliminados += count;
  }
  
  console.log(`\n📊 Total documentos eliminados: ${totalEliminados}`);
}

async function verificarResultado() {
  console.log('\n' + '═'.repeat(60));
  console.log('PASO 4: VERIFICACIÓN FINAL');
  console.log('═'.repeat(60));

  // Verificar usuarios en ekialdebus-26
  const usersSnap = await db.collection(`tenants/${TARGET_TENANT}/usuarios`).get();
  console.log(`\n👤 Usuarios en ${TARGET_TENANT}: ${usersSnap.size}`);
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    console.log(`   - ${data.email}: ${data.nombre} (${data.rol})`);
  }

  // Verificar claims
  console.log(`\n🔐 Claims de usuarios en Firebase Auth:`);
  const listResult = await auth.listUsers();
  for (const user of listResult.users) {
    const claims = user.customClaims || {};
    console.log(`   - ${user.email}: tenantId=${claims.tenantId || 'NO DEFINIDO'}`);
  }

  // Verificar que tenants obsoletos están vacíos
  for (const tenant of TENANTS_TO_DELETE) {
    const autobusesSnap = await db.collection(`tenants/${tenant}/autobuses`).get();
    const usuariosSnap = await db.collection(`tenants/${tenant}/usuarios`).get();
    console.log(`\n📁 ${tenant}: ${autobusesSnap.size} autobuses, ${usuariosSnap.size} usuarios`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     CONSOLIDACIÓN DE TENANTS - ZaintzaBus                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (DRY_RUN) {
    console.log('\n⚠️  MODO DRY-RUN: No se aplicarán cambios reales\n');
  }

  console.log(`🎯 Tenant destino: ${TARGET_TENANT}`);
  console.log(`🗑️  Tenants a eliminar: ${TENANTS_TO_DELETE.join(', ')}`);

  await migrarUsuarios();
  await actualizarClaimsUsuarios();
  await limpiarTenantsObsoletos();
  await verificarResultado();

  console.log('\n' + '═'.repeat(60));
  if (DRY_RUN) {
    console.log('✅ DRY-RUN completado. Ejecuta sin --dry-run para aplicar cambios.');
  } else {
    console.log('✅ CONSOLIDACIÓN COMPLETADA');
    console.log('\n⚠️  IMPORTANTE: Los usuarios deben cerrar sesión y volver a entrar');
    console.log('   para que los nuevos claims tengan efecto.');
  }
  console.log('═'.repeat(60));
}

main().catch(console.error);
