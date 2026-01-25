import * as admin from 'firebase-admin';
import * as path from 'path';

const sa = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const tenants = await db.collection('tenants').listDocuments();
  console.log('TENANTS:', tenants.map(t => t.id).join(', '));
  
  const b = await db.collection('tenants/ekialdebus-26/autobuses').count().get();
  const e = await db.collection('tenants/ekialdebus-26/equipos').count().get();
  console.log('ekialdebus-26 -> Buses:', b.data().count, '| Equipos:', e.data().count);
  
  process.exit(0);
}
main();
