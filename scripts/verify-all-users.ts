/**
 * Script para verificar el estado completo de todos los usuarios
 * Muestra: Auth claims, documento en Firestore, y discrepancias
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  console.log('🔍 Verificando estado completo de usuarios...\n');
  console.log('═'.repeat(80));

  // Obtener todos los usuarios de Auth
  const listResult = await auth.listUsers(1000);
  
  for (const authUser of listResult.users) {
    console.log(`\n📧 ${authUser.email}`);
    console.log('─'.repeat(80));
    
    // Info de Auth
    console.log('\n🔐 FIREBASE AUTH:');
    console.log(`   UID: ${authUser.uid}`);
    console.log(`   Display Name: ${authUser.displayName || '(no establecido)'}`);
    console.log(`   Disabled: ${authUser.disabled ? 'Sí ⚠️' : 'No'}`);
    console.log(`   Created: ${authUser.metadata.creationTime}`);
    console.log(`   Last Sign In: ${authUser.metadata.lastSignInTime || 'Nunca'}`);
    
    // Custom Claims
    const claims = authUser.customClaims || {};
    console.log('\n🏷️  CUSTOM CLAIMS:');
    if (Object.keys(claims).length === 0) {
      console.log('   ⚠️  SIN CLAIMS - El usuario no tiene rol asignado!');
    } else {
      console.log(`   Rol: ${claims.rol || '⚠️ NO DEFINIDO'}`);
      console.log(`   Tenant ID: ${claims.tenantId || '⚠️ NO DEFINIDO'}`);
      if (claims.dfg !== undefined) console.log(`   DFG: ${claims.dfg}`);
    }
    
    // Buscar documento en Firestore
    console.log('\n📄 FIRESTORE:');
    const tenantId = claims.tenantId;
    
    if (!tenantId) {
      console.log('   ⚠️  No se puede buscar documento sin tenantId en claims');
    } else {
      const docRef = db.doc(`tenants/${tenantId}/usuarios/${authUser.uid}`);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        console.log(`   ⚠️  NO EXISTE documento en tenants/${tenantId}/usuarios/${authUser.uid}`);
      } else {
        const data = docSnap.data()!;
        console.log(`   ✅ Documento encontrado en: tenants/${tenantId}/usuarios`);
        console.log(`   Nombre: ${data.nombre || '(vacío)'}`);
        console.log(`   Apellidos: ${data.apellidos || '(vacío)'}`);
        console.log(`   Rol (Firestore): ${data.rol || '⚠️ NO DEFINIDO'}`);
        console.log(`   Activo: ${data.activo !== false ? 'Sí' : 'No'}`);
        
        // Verificar consistencia
        if (data.rol !== claims.rol) {
          console.log(`\n   ⚠️  INCONSISTENCIA: Rol en Firestore (${data.rol}) ≠ Rol en Claims (${claims.rol})`);
        }
        if (data.email !== authUser.email) {
          console.log(`   ⚠️  INCONSISTENCIA: Email en Firestore (${data.email}) ≠ Email en Auth (${authUser.email})`);
        }
      }
    }
    
    console.log('\n' + '═'.repeat(80));
  }

  // Resumen
  console.log('\n📊 RESUMEN:');
  console.log(`   Total usuarios en Auth: ${listResult.users.length}`);
  
  const sinClaims = listResult.users.filter(u => !u.customClaims || !u.customClaims.rol);
  if (sinClaims.length > 0) {
    console.log(`\n   ⚠️  Usuarios SIN ROL asignado (${sinClaims.length}):`);
    sinClaims.forEach(u => console.log(`      - ${u.email}`));
  }

  console.log('\n✨ Verificación completada');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
