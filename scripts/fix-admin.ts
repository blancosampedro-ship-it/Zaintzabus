import * as admin from 'firebase-admin';
import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const sa = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

async function main() {
  const auth = admin.auth();
  const user = await auth.getUserByEmail('admin@zaintzabus.com');
  
  await auth.setCustomUserClaims(user.uid, { 
    rol: 'admin', 
    tenantId: 'lurraldebus-gipuzkoa',
    dfg: false
  });
  
  console.log('✅ HECHO! admin@zaintzabus.com ahora tiene tenantId: lurraldebus-gipuzkoa');
  console.log('👉 Cierra sesión y vuelve a entrar para ver los 56 buses');
  process.exit(0);
}
main();
