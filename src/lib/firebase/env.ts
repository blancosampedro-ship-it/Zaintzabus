/**
 * Helpers de entorno para Firebase.
 *
 * Objetivos:
 * - Evitar fallos durante SSR/build si faltan variables.
 * - Ofrecer mensajes de error claros cuando se intenta usar Firebase sin configuración.
 */

export type EnvKey =
  | 'NEXT_PUBLIC_FIREBASE_API_KEY'
  | 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  | 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  | 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  | 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  | 'NEXT_PUBLIC_FIREBASE_APP_ID'
  | 'FIREBASE_ADMIN_PROJECT_ID'
  | 'FIREBASE_ADMIN_CLIENT_EMAIL'
  | 'FIREBASE_ADMIN_PRIVATE_KEY'
  | 'FIREBASE_PROJECT_ID'
  | 'FIREBASE_CLIENT_EMAIL'
  | 'FIREBASE_PRIVATE_KEY';

function getEnvValue(key: EnvKey): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

export function hasFirebaseClientEnv(): boolean {
  return Boolean(
    getEnvValue('NEXT_PUBLIC_FIREBASE_API_KEY') &&
      getEnvValue('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') &&
      getEnvValue('NEXT_PUBLIC_FIREBASE_PROJECT_ID') &&
      getEnvValue('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') &&
      getEnvValue('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') &&
      getEnvValue('NEXT_PUBLIC_FIREBASE_APP_ID')
  );
}

export interface FirebaseAdminEnv {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Devuelve env de Admin SDK soportando dos esquemas:
 * - FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY
 * - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 */
export function getFirebaseAdminEnv(): FirebaseAdminEnv | null {
  const projectId =
    getEnvValue('FIREBASE_ADMIN_PROJECT_ID') ?? getEnvValue('FIREBASE_PROJECT_ID');
  const clientEmail =
    getEnvValue('FIREBASE_ADMIN_CLIENT_EMAIL') ?? getEnvValue('FIREBASE_CLIENT_EMAIL');
  const rawPrivateKey =
    getEnvValue('FIREBASE_ADMIN_PRIVATE_KEY') ?? getEnvValue('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail || !rawPrivateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, '\n'),
  };
}

export function assertFirebaseClientEnv(): void {
  if (!hasFirebaseClientEnv()) {
    throw new Error(
      'Firebase client no está configurado. Define las variables NEXT_PUBLIC_FIREBASE_* (ver .env.example).'
    );
  }
}

export function assertFirebaseAdminEnv(): FirebaseAdminEnv {
  const env = getFirebaseAdminEnv();
  if (!env) {
    throw new Error(
      'Firebase Admin no está configurado. Define FIREBASE_ADMIN_* (o FIREBASE_* legacy) (ver .env.example).'
    );
  }
  return env;
}
