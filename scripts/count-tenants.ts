/**
 * Script para contar documentos en cada tenant
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

async function contarAutobuses() {
  const tenants = ['lurraldebus-gipuzkoa', 'ekialdebus', 'ekialdebus-26'];
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     CONTEO DE DOCUMENTOS POR TENANT                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  for (const tenant of tenants) {
    const autobusesSnap = await db.collection(`tenants/${tenant}/autobuses`).get();
    const equiposSnap = await db.collection(`tenants/${tenant}/equipos`).get();
    const incidenciasSnap = await db.collection(`tenants/${tenant}/incidencias`).get();
    
    console.log(`📁 tenants/${tenant}/`);
    console.log(`   🚌 autobuses: ${autobusesSnap.size}`);
    console.log(`   🔧 equipos: ${equiposSnap.size}`);
    console.log(`   ⚠️  incidencias: ${incidenciasSnap.size}`);
    
    if (autobusesSnap.size > 0) {
      const primeros = autobusesSnap.docs.slice(0, 3).map(d => d.data().codigo || d.id);
      console.log(`   📋 Ejemplos códigos: ${primeros.join(', ')}...`);
    }
    console.log();
  }
  
  console.log('✅ Conteo completado');
}

contarAutobuses().catch(console.error);
