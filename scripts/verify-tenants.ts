import * as admin from 'firebase-admin';
import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const sa = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();

async function main() {
  console.log('\n🔍 Verificando colección tenants...\n');
  
  // Listar todos los tenants
  const tenantsSnap = await db.collection('tenants').get();
  
  if (tenantsSnap.empty) {
    console.log('❌ No hay documentos en la colección "tenants"');
  } else {
    console.log(`✅ Encontrados ${tenantsSnap.size} tenants:\n`);
    tenantsSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  📁 ${doc.id}`);
      console.log(`     nombre: ${data.nombre || '(sin nombre)'}`);
      console.log(`     activo: ${data.activo !== false ? 'sí' : 'no'}`);
      console.log('');
    });
  }
  
  // Verificar autobuses en tenant y en raíz
  console.log('\n🔍 Verificando ubicación de autobuses...');
  
  const autobusesRaiz = await db.collection('autobuses').limit(5).get();
  console.log(`📦 Autobuses en /autobuses (raíz): ${autobusesRaiz.size}`);
  
  const autobusesTenant = await db.collection('tenants/lurraldebus-gipuzkoa/autobuses').get();
  console.log(`📦 Autobuses en /tenants/lurraldebus-gipuzkoa/autobuses: ${autobusesTenant.size}`);
  
  const equiposRaiz = await db.collection('equipos').limit(5).get();
  console.log(`📦 Equipos en /equipos (raíz): ${equiposRaiz.size}`);
  
  const equiposTenant = await db.collection('tenants/lurraldebus-gipuzkoa/equipos').get();
  console.log(`📦 Equipos en /tenants/lurraldebus-gipuzkoa/equipos: ${equiposTenant.size}`);
  
  process.exit(0);
}

main();
