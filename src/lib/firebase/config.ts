import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { hasFirebaseClientEnv } from '@/lib/firebase/env';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isBrowser = typeof window !== 'undefined';

export function isFirebaseClientConfigured(): boolean {
  return hasFirebaseClientEnv();
}

// En Next.js, este módulo puede evaluarse durante SSR/prerender.
// El SDK web de Firebase intenta validar la config al inicializar Auth; si faltan env vars,
// el build falla. Inicializamos SOLO en navegador.
const app = isBrowser
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : undefined;

export const auth: Auth = (isBrowser && app ? getAuth(app) : (null as unknown as Auth));
export const db: Firestore = (isBrowser && app ? getFirestore(app) : (null as unknown as Firestore));
export const storage: FirebaseStorage = (isBrowser && app ? getStorage(app) : (null as unknown as FirebaseStorage));

/**
 * Acceso lazy a los SDKs cliente (solo navegador).
 * Útil para módulos que quieren fallar con error claro en SSR.
 */
export function getFirebaseClient(): {
  app: NonNullable<typeof app>;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
} {
  if (!isBrowser) {
    throw new Error('Firebase client solo está disponible en navegador (no SSR).');
  }
  if (!hasFirebaseClientEnv()) {
    throw new Error('Firebase client no está configurado. Revisa NEXT_PUBLIC_FIREBASE_* (ver .env.example).');
  }
  const currentApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return {
    app: currentApp,
    auth: getAuth(currentApp),
    db: getFirestore(currentApp),
    storage: getStorage(currentApp),
  };
}

export default app;
