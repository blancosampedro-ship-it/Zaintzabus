import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

// Inicialización lazy para evitar errores durante el build
let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase Admin no está configurado. Verifica las variables de entorno.');
      }

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }
  return adminApp;
}

function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, rol, tenantId, activo } = body;

    if (!email || !password || !nombre || !rol || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Crear usuario en Firebase Auth
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: nombre,
      disabled: !activo,
    });

    // Establecer custom claims para el rol
    await getAdminAuth().setCustomUserClaims(userRecord.uid, {
      rol,
      tenantId,
    });

    // Crear documento en Firestore
    const userDoc = {
      email,
      nombre,
      apellidos: '',
      rol,
      tenantId,
      activo: activo ?? true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await getAdminDb()
      .collection(`tenants/${tenantId}/usuarios`)
      .doc(userRecord.uid)
      .set(userDoc);

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: 'Usuario creado correctamente',
    });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    
    const firebaseError = error as { code?: string; message?: string };
    
    if (firebaseError.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: firebaseError.message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, password, nombre, rol, tenantId, activo } = body;

    if (!uid || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    let userExistsInAuth = true;
    
    // Verificar si el usuario existe en Firebase Auth
    try {
      await getAdminAuth().getUser(uid);
    } catch (error: unknown) {
      const authError = error as { code?: string };
      if (authError.code === 'auth/user-not-found') {
        userExistsInAuth = false;
      } else {
        throw error;
      }
    }

    if (!userExistsInAuth) {
      // El usuario existe en Firestore pero no en Auth
      // Necesitamos crear la cuenta en Auth
      if (!email) {
        return NextResponse.json(
          { error: 'Se requiere email para crear cuenta de autenticación' },
          { status: 400 }
        );
      }

      // Si no hay password, generar uno temporal
      const tempPassword = password || Math.random().toString(36).slice(-12) + 'A1!';
      
      try {
        // Crear usuario en Auth con el UID existente de Firestore
        await getAdminAuth().createUser({
          uid, // Usar el mismo UID de Firestore
          email,
          password: tempPassword,
          displayName: nombre,
          disabled: activo === false,
        });

        // Establecer custom claims
        await getAdminAuth().setCustomUserClaims(uid, {
          rol,
          tenantId,
        });

        // Actualizar documento en Firestore
        const updateDoc: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
        };
        if (nombre) updateDoc.nombre = nombre;
        if (email) updateDoc.email = email;
        if (rol) updateDoc.rol = rol;
        if (typeof activo === 'boolean') updateDoc.activo = activo;

        await getAdminDb()
          .collection(`tenants/${tenantId}/usuarios`)
          .doc(uid)
          .update(updateDoc);

        return NextResponse.json({
          success: true,
          message: password 
            ? 'Cuenta de autenticación creada y usuario actualizado' 
            : 'Cuenta de autenticación creada con contraseña temporal. El usuario debe cambiarla.',
          authCreated: true,
        });
      } catch (createError: unknown) {
        const firebaseError = createError as { code?: string; message?: string };
        if (firebaseError.code === 'auth/email-already-exists') {
          return NextResponse.json(
            { error: 'El email ya está registrado en otra cuenta' },
            { status: 400 }
          );
        }
        throw createError;
      }
    }

    // Usuario existe en Auth - actualizar normalmente
    const updateData: {
      displayName?: string;
      disabled?: boolean;
      password?: string;
    } = {};

    if (nombre) updateData.displayName = nombre;
    if (typeof activo === 'boolean') updateData.disabled = !activo;
    if (password && password.length >= 6) updateData.password = password;

    if (Object.keys(updateData).length > 0) {
      await getAdminAuth().updateUser(uid, updateData);
    }

    // Actualizar custom claims si cambió el rol
    if (rol) {
      await getAdminAuth().setCustomUserClaims(uid, {
        rol,
        tenantId,
      });
    }

    // Actualizar documento en Firestore
    const updateDoc: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (nombre) updateDoc.nombre = nombre;
    if (email) updateDoc.email = email;
    if (rol) updateDoc.rol = rol;
    if (typeof activo === 'boolean') updateDoc.activo = activo;

    await getAdminDb()
      .collection(`tenants/${tenantId}/usuarios`)
      .doc(uid)
      .update(updateDoc);

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado correctamente',
    });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    const firebaseError = error as { message?: string };
    return NextResponse.json(
      { error: firebaseError.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const tenantId = searchParams.get('tenantId');

    if (!uid || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Eliminar usuario de Firebase Auth
    await getAdminAuth().deleteUser(uid);

    // Eliminar documento de Firestore
    await getAdminDb()
      .collection(`tenants/${tenantId}/usuarios`)
      .doc(uid)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    const firebaseError = error as { message?: string };
    return NextResponse.json(
      { error: firebaseError.message || 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
