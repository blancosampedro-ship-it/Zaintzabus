import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminEnv } from '@/lib/firebase/env';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const env = getFirebaseAdminEnv();
  if (!env) {
    throw new Error(
      'Firebase Admin no está configurado. Define FIREBASE_ADMIN_* (o FIREBASE_* legacy).'
    );
  }

  return initializeApp({
    credential: cert({
      projectId: env.projectId,
      clientEmail: env.clientEmail,
      privateKey: env.privateKey,
    }),
  });
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);

export default adminApp;
