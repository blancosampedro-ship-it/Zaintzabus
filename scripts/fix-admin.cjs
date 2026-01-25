const admin = require('firebase-admin');
const path = require('path');

const sa = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

async function main() {
  const auth = admin.auth();
  const user = await auth.getUserByEmail('admin@zaintzabus.com');
  
  console.log('Usuario encontrado:', user.uid);
  console.log('Claims actuales:', user.customClaims);
  
  await auth.setCustomUserClaims(user.uid, { 
    rol: 'admin', 
    tenantId: 'ekialdebus',  // CORREGIDO: era ekialdebus-26
    dfg: false
  });
  
  // Verificar
  const updated = await auth.getUserByEmail('admin@zaintzabus.com');
  console.log('✅ Claims actualizados:', updated.customClaims);
  console.log('👉 Cierra sesión y vuelve a entrar para ver los 56 buses');
  process.exit(0);
}
main();
