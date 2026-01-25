import * as admin from 'firebase-admin';
import * as path from 'path';
const sa = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

async function main() {
  const user = await admin.auth().getUserByEmail('admin@zaintzabus.com');
  console.log('UID:', user.uid);
  console.log('Claims:', JSON.stringify(user.customClaims, null, 2));
  process.exit(0);
}
main();
