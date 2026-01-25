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
  
  // Verificar específicamente ekialdebus
  console.log('\n🔍 Verificando tenant "ekialdebus"...');
  const ekialdeDoc = await db.collection('tenants').doc('ekialdebus').get();
  
  if (ekialdeDoc.exists) {
    console.log('✅ Existe el tenant ekialdebus');
    
    // Verificar autobuses
    const autobusesSnap = await db.collection('tenants/ekialdebus/autobuses').get();
    console.log(`   📦 Autobuses: ${autobusesSnap.size}`);
    
    // Verificar equipos
    const equiposSnap = await db.collection('tenants/ekialdebus/equipos').get();
    console.log(`   📦 Equipos: ${equiposSnap.size}`);
    
  } else {
    console.log('❌ NO existe el tenant "ekialdebus"');
    console.log('\n   Tenants disponibles:', tenantsSnap.docs.map(d => d.id).join(', '));
  }
  
  process.exit(0);
}

main();
