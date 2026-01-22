import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { assertFirebaseAdminEnv } from '@/lib/firebase/env';

/**
 * Firebase Admin para SSR/Server Actions/Route Handlers.
 *
 * Nota: este módulo debe importarse SOLO desde código que se ejecute en Node.
 */
export interface FirebaseAdmin {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

let cached: FirebaseAdmin | null = null;

export function getFirebaseAdmin(): FirebaseAdmin {
  if (cached) return cached;

  const existing = getApps();
  const app =
    existing.length > 0
      ? existing[0]
      : initializeApp({
          credential: cert(assertFirebaseAdminEnv()),
        });

  cached = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };

  return cached;
}
