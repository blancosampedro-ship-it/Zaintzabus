/**
 * Script para sincronizar usuarios entre Firebase Auth y Firestore
 * 
 * Detecta:
 * - Usuarios en Auth que NO tienen documento en Firestore
 * - Documentos en Firestore que NO tienen usuario en Auth
 * 
 * Uso: npx tsx scripts/sync-users.ts [--fix]
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

interface AuthUser {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  disabled: boolean;
  customClaims?: {
    rol?: string;
    tenantId?: string;
  };
}

interface FirestoreUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  tenantId: string;
  activo: boolean;
}

async function getAllAuthUsers(): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  let nextPageToken: string | undefined;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      users.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        disabled: user.disabled,
        customClaims: user.customClaims as AuthUser['customClaims'],
      });
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  return users;
}

async function getAllFirestoreUsers(): Promise<Map<string, FirestoreUser>> {
  const usersMap = new Map<string, FirestoreUser>();

  // Obtener todos los tenants
  const tenantsSnap = await db.collection('tenants').get();
  
  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const usuariosSnap = await db.collection(`tenants/${tenantId}/usuarios`).get();
    
    for (const userDoc of usuariosSnap.docs) {
      const data = userDoc.data();
      usersMap.set(userDoc.id, {
        id: userDoc.id,
        email: data.email || '',
        nombre: data.nombre || '',
        rol: data.rol || '',
        tenantId: tenantId,
        activo: data.activo !== false,
      });
    }
  }

  return usersMap;
}

async function main() {
  const shouldFix = process.argv.includes('--fix');
  
  console.log('🔍 Analizando usuarios...\n');

  // Obtener usuarios de ambas fuentes
  const authUsers = await getAllAuthUsers();
  const firestoreUsers = await getAllFirestoreUsers();

  console.log(`📊 Estadísticas:`);
  console.log(`   - Usuarios en Firebase Auth: ${authUsers.length}`);
  console.log(`   - Usuarios en Firestore: ${firestoreUsers.size}\n`);

  // Usuarios en Auth sin documento en Firestore
  const orphanedInAuth: AuthUser[] = [];
  for (const authUser of authUsers) {
    if (!firestoreUsers.has(authUser.uid)) {
      orphanedInAuth.push(authUser);
    }
  }

  // Documentos en Firestore sin usuario en Auth
  const authUids = new Set(authUsers.map(u => u.uid));
  const orphanedInFirestore: FirestoreUser[] = [];
  for (const [uid, fsUser] of firestoreUsers) {
    if (!authUids.has(uid)) {
      orphanedInFirestore.push(fsUser);
    }
  }

  // Mostrar resultados
  if (orphanedInAuth.length > 0) {
    console.log(`⚠️  Usuarios en Auth SIN documento en Firestore (${orphanedInAuth.length}):`);
    console.log('─'.repeat(80));
    for (const user of orphanedInAuth) {
      const tenantId = user.customClaims?.tenantId || 'SIN TENANT';
      const rol = user.customClaims?.rol || 'SIN ROL';
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Nombre: ${user.displayName || 'N/A'}`);
      console.log(`   Tenant: ${tenantId}`);
      console.log(`   Rol: ${rol}`);
      console.log(`   Deshabilitado: ${user.disabled ? 'Sí' : 'No'}`);
      console.log('');
    }
  } else {
    console.log('✅ Todos los usuarios de Auth tienen documento en Firestore');
  }

  if (orphanedInFirestore.length > 0) {
    console.log(`\n⚠️  Documentos en Firestore SIN usuario en Auth (${orphanedInFirestore.length}):`);
    console.log('─'.repeat(80));
    for (const user of orphanedInFirestore) {
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.nombre}`);
      console.log(`   Tenant: ${user.tenantId}`);
      console.log(`   Rol: ${user.rol}`);
      console.log('');
    }
  } else {
    console.log('✅ Todos los documentos de Firestore tienen usuario en Auth');
  }

  // Opción de arreglar
  if (shouldFix && orphanedInAuth.length > 0) {
    console.log('\n🔧 Creando documentos en Firestore para usuarios huérfanos de Auth...\n');
    
    for (const user of orphanedInAuth) {
      const tenantId = user.customClaims?.tenantId;
      if (!tenantId) {
        console.log(`   ⏭️  Saltando ${user.email} - No tiene tenantId en claims`);
        continue;
      }

      try {
        await db.collection(`tenants/${tenantId}/usuarios`).doc(user.uid).set({
          email: user.email || '',
          nombre: user.displayName || user.email?.split('@')[0] || 'Usuario',
          apellidos: '',
          rol: user.customClaims?.rol || 'tecnico',
          tenantId: tenantId,
          activo: !user.disabled,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`   ✅ Creado documento para ${user.email} en tenant ${tenantId}`);
      } catch (error) {
        console.log(`   ❌ Error creando documento para ${user.email}:`, error);
      }
    }
  } else if (orphanedInAuth.length > 0) {
    console.log('\n💡 Para crear los documentos faltantes, ejecuta:');
    console.log('   npx tsx scripts/sync-users.ts --fix');
  }

  // Resumen de acciones recomendadas para documentos huérfanos
  if (orphanedInFirestore.length > 0) {
    console.log('\n💡 Para los documentos huérfanos en Firestore, puedes:');
    console.log('   1. Eliminarlos manualmente desde Firebase Console');
    console.log('   2. O crear los usuarios en Auth si son válidos');
  }

  console.log('\n✨ Análisis completado');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
