/**
 * Script para crear un usuario de prueba en Firebase Auth + Firestore
 * 
 * Uso:
 *   npx tsx scripts/create-test-user.ts
 *
 * Requisito: tener ./scripts/serviceAccountKey.json con las credenciales de servicio.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// ——— Configuración del usuario de prueba ———
const TEST_USER = {
  email: 'test@zaintzabus.com',
  password: 'Test1234!',
  displayName: 'Usuario de Prueba',
  rol: 'jefe_mantenimiento' as const,
  tenantId: 'lurraldebus-gipuzkoa',
};

// ——— Inicializar Admin SDK ———
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  console.log('🔧 Creando usuario de prueba...\n');

  let userRecord: admin.auth.UserRecord;

  try {
    // Intentar obtener usuario existente
    userRecord = await auth.getUserByEmail(TEST_USER.email);
    console.log(`ℹ️  Usuario ya existe: ${userRecord.uid}`);
  } catch (err: unknown) {
    // Si no existe, crearlo
    if ((err as { code?: string }).code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        displayName: TEST_USER.displayName,
        emailVerified: true,
      });
      console.log(`✅ Usuario creado en Auth: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  // Establecer custom claims (rol + tenantId)
  await auth.setCustomUserClaims(userRecord.uid, {
    rol: TEST_USER.rol,
    tenantId: TEST_USER.tenantId,
  });
  console.log(`✅ Claims asignados: rol=${TEST_USER.rol}, tenantId=${TEST_USER.tenantId}`);

  // Crear/actualizar documento en Firestore
  const userDocRef = db.doc(`tenants/${TEST_USER.tenantId}/usuarios/${userRecord.uid}`);
  await userDocRef.set(
    {
      id: userRecord.uid,
      email: TEST_USER.email,
      nombre: 'Usuario',
      apellidos: 'de Prueba',
      rol: TEST_USER.rol,
      tenantId: TEST_USER.tenantId,
      activo: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✅ Documento creado/actualizado en Firestore: tenants/${TEST_USER.tenantId}/usuarios/${userRecord.uid}`);

  console.log('\n——————————————————————————————————');
  console.log('🎉 Usuario de prueba listo:');
  console.log(`   Email:    ${TEST_USER.email}`);
  console.log(`   Password: ${TEST_USER.password}`);
  console.log('——————————————————————————————————\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
