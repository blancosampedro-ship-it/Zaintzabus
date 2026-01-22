# Guía de Despliegue - ZaintzaBus

Esta guía detalla el proceso de despliegue de ZaintzaBus en producción.

## 📋 Pre-requisitos

1. **Cuenta Firebase** (Plan Blaze recomendado)
2. **Cuenta Vercel** (o proveedor de hosting Next.js)
3. **Node.js 18+** instalado localmente
4. **Firebase CLI** instalado: `npm install -g firebase-tools`

## 🔧 Configuración de Firebase

### 1. Crear Proyecto Firebase

```bash
# Login en Firebase
firebase login

# Crear proyecto (o usar existente)
firebase projects:create zaintzabus-prod
```

### 2. Habilitar Servicios

En Firebase Console:
- **Authentication**: Email/Password
- **Firestore Database**: Modo producción
- **Storage**: Para adjuntos de incidencias
- **Functions** (opcional): Para tareas programadas

### 3. Configurar Reglas de Firestore

```bash
# Desplegar reglas de seguridad
firebase deploy --only firestore:rules
```

### 4. Configurar Índices

```bash
# Desplegar índices
firebase deploy --only firestore:indexes
```

### 5. Crear Service Account

1. Firebase Console → Project Settings → Service Accounts
2. "Generate new private key"
3. Guardar JSON de forma segura

## 🚀 Despliegue en Vercel

### 1. Conectar Repositorio

```bash
# Instalar Vercel CLI
npm install -g vercel

# Vincular proyecto
vercel link
```

### 2. Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```env
# Firebase Client (públicas)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Firebase Admin (privadas)
FIREBASE_ADMIN_PROJECT_ID=xxx
FIREBASE_ADMIN_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Desplegar

```bash
# Producción
vercel --prod

# Preview (staging)
vercel
```

## 🔐 Seguridad Post-Despliegue

### 1. Verificar Custom Claims

Asegurarse de que los usuarios tienen claims correctos:

```typescript
// Script para verificar claims
import { getAuth } from 'firebase-admin/auth';

const user = await getAuth().getUser('USER_UID');
console.log(user.customClaims);
// Esperado: { tenantId: 'xxx', rol: 'admin' }
```

### 2. Configurar CORS (si aplica)

Para Storage:
```json
[
  {
    "origin": ["https://zaintzabus.vercel.app"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

### 3. Habilitar App Check (recomendado)

Firebase Console → App Check → Enable para Firestore y Storage.

## 📊 Monitorización

### Logs

- **Vercel**: Dashboard → Logs
- **Firebase**: Console → Functions → Logs

### Métricas Recomendadas

1. **Performance**: Core Web Vitals en Vercel Analytics
2. **Errores**: Sentry o similar para error tracking
3. **Firebase**: Usage y billing alerts

## 🔄 CI/CD con GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          # ... otras variables
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🛠️ Comandos Útiles

```bash
# Build local
npm run build

# Verificar tipos
npm run type-check

# Ejecutar tests
npm test

# Desplegar reglas Firebase
firebase deploy --only firestore:rules,firestore:indexes

# Ver logs de producción
vercel logs --prod
```

## 📝 Checklist Pre-Producción

- [ ] Variables de entorno configuradas
- [ ] Reglas de Firestore desplegadas
- [ ] Índices de Firestore creados
- [ ] Al menos 1 usuario admin creado
- [ ] Custom claims configurados
- [ ] Tests pasando
- [ ] Build sin errores
- [ ] Dominio personalizado (opcional)
- [ ] SSL habilitado (automático en Vercel)
- [ ] Backups de Firestore programados

## 🆘 Troubleshooting

### Error: "Missing or insufficient permissions"
- Verificar custom claims del usuario
- Revisar reglas de Firestore
- Confirmar tenantId correcto

### Error: "Firebase Admin initialization failed"
- Verificar variables de entorno en Vercel
- Asegurar que FIREBASE_ADMIN_PRIVATE_KEY incluye `\n`

### Build lento
- Verificar que no hay imports circulares
- Revisar tamaño de bundles con `next build --analyze`

---

Para soporte, contactar al equipo de desarrollo.
