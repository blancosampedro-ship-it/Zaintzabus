/**
 * Script para eliminar documentos huérfanos de Firestore
 * (documentos de usuarios que no existen en Firebase Auth)
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

// Documentos huérfanos identificados
const orphanedDocs = [
  { tenantId: 'lurraldebus-gipuzkoa', docId: 'user-jefe-001' },
  { tenantId: 'lurraldebus-gipuzkoa', docId: 'user-operador-001' },
  { tenantId: 'lurraldebus-gipuzkoa', docId: 'user-tecnico-002' },
];

async function main() {
  console.log('🗑️  Eliminando documentos huérfanos de Firestore...\n');

  for (const { tenantId, docId } of orphanedDocs) {
    const docPath = `tenants/${tenantId}/usuarios/${docId}`;
    try {
      await db.doc(docPath).delete();
      console.log(`   ✅ Eliminado: ${docPath}`);
    } catch (error) {
      console.log(`   ❌ Error eliminando ${docPath}:`, error);
    }
  }

  console.log('\n✨ Limpieza completada');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
