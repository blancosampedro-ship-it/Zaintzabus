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
  const email = process.argv[2] || 'admin@zaintzabus.com';
  
  const auth = admin.auth();
  
  try {
    const user = await auth.getUserByEmail(email);
    console.log('\n📧 Usuario:', email);
    console.log('🆔 UID:', user.uid);
    console.log('📋 Custom Claims:', JSON.stringify(user.customClaims, null, 2));
    
    if (!user.customClaims?.rol) {
      console.log('\n⚠️  PROBLEMA: El usuario NO tiene claim "rol"');
    } else {
      console.log('\n✅ Rol:', user.customClaims.rol);
    }
    
    if (!user.customClaims?.tenantId) {
      console.log('⚠️  PROBLEMA: El usuario NO tiene claim "tenantId"');
    } else {
      console.log('✅ TenantId:', user.customClaims.tenantId);
    }
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
  
  process.exit(0);
}

main();
