# ZaintzaBus - Sistema de Gestión de Mantenimiento de Flota

Sistema de gestión de mantenimiento de flota para **Lurraldebus – UTE DFG (Diputación Foral de Gipuzkoa)**.

## 🚀 Características

- **Gestión de Incidencias**: Seguimiento completo del ciclo de vida de incidencias correctivas y preventivas
- **Control de SLA**: Monitorización automática de tiempos de atención y resolución
- **Inventario en Tiempo Real**: Gestión de repuestos y materiales con alertas de stock
- **Gestión de Activos**: Control completo de la flota (autobuses, validadoras, pantallas, routers)
- **Mantenimiento Preventivo**: Planificación y seguimiento de mantenimientos programados
- **Auditoría Completa**: Trazabilidad de todas las operaciones críticas
- **Multi-tenant**: Soporte para múltiples operadores con supervisión DFG

## 📋 Requisitos Previos

- Node.js 18.x o superior
- npm 9.x o superior
- Cuenta de Firebase (Blaze plan recomendado para funciones)

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/your-org/zaintzabus.git
cd zaintzabus
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar Firebase**

Crear un proyecto en [Firebase Console](https://console.firebase.google.com/) y copiar las credenciales.

Crear archivo `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (solo para servidor/SSR) - preferido
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# (Opcional) Variables legacy soportadas por compatibilidad
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notas SSR:
- Cliente (React): usa [src/lib/firebase/config.ts](src/lib/firebase/config.ts) y solo inicializa en navegador.
- Servidor (SSR/Route Handlers/Server Actions): usa [src/lib/firebase/server.ts](src/lib/firebase/server.ts) basado en Admin SDK.

4. **Desplegar reglas de Firestore**
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

5. **Cargar datos de prueba** (opcional)
```bash
npx ts-node scripts/seed.ts
```

## 🖥️ Desarrollo

**Iniciar servidor de desarrollo:**
```bash
npm run dev
```

**Iniciar emuladores de Firebase:**
```bash
firebase emulators:start
```

**Ejecutar linting:**
```bash
npm run lint
```

**Build de producción:**
```bash
npm run build
```

## 📁 Estructura del Proyecto

```
zaintzabus/
├── docs/                    # Documentación de arquitectura
│   ├── ARCHITECTURE.md      # Arquitectura del sistema
│   ├── DATA_MODEL.md        # Modelo de datos
│   ├── SECURITY_RULES.md    # Reglas de seguridad
│   ├── SLA_STRATEGY.md      # Estrategia de SLA
│   └── IMPLEMENTATION_PLAN.md
├── scripts/                 # Scripts de utilidad
│   └── seed.ts              # Datos de prueba
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (app)/           # Rutas protegidas
│   │   │   ├── dashboard/   # Panel principal
│   │   │   ├── incidencias/ # Gestión de incidencias
│   │   │   ├── inventario/  # Gestión de inventario
│   │   │   ├── activos/     # Gestión de flota
│   │   │   ├── preventivo/  # Mantenimiento preventivo
│   │   │   ├── informes/    # Generación de informes
│   │   │   └── admin/       # Administración
│   │   └── (auth)/          # Rutas de autenticación
│   ├── components/          # Componentes React
│   │   └── layout/          # Layouts y navegación
│   ├── contexts/            # Contextos React (Auth)
│   ├── lib/                 # Utilidades y servicios
│   │   ├── firebase/        # Configuración y servicios Firebase
│   │   └── utils/           # Funciones auxiliares
│   └── types/               # TypeScript types
├── firebase.json            # Configuración Firebase
├── firestore.rules          # Reglas de seguridad Firestore
├── firestore.indexes.json   # Índices de Firestore
└── storage.rules            # Reglas de Storage
```

## 👥 Roles de Usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `dfg` | Supervisor DFG | Acceso total, cross-tenant |
| `jefe_mantenimiento` | Jefe de Mantenimiento | Gestión completa del tenant |
| `tecnico` | Técnico | Operaciones de mantenimiento |
| `operador` | Operador | Reporte de incidencias |
| `soporte_sw` | Soporte Software | Soporte técnico sistemas |

## 📊 Objetivos SLA

| Criticidad | Tiempo Atención | Tiempo Resolución |
|------------|-----------------|-------------------|
| Crítica | 30 min | 4 horas |
| Alta | 1 hora | 8 horas |
| Media | 2 horas | 24 horas |
| Baja | 4 horas | 72 horas |

## 🔐 Seguridad

- Autenticación mediante Firebase Auth
- Autorización basada en roles (RBAC)
- Custom claims para control de acceso
- Reglas de Firestore para validación server-side
- Auditoría completa de operaciones

## 📝 Licencia

Copyright © 2024 Diputación Foral de Gipuzkoa. Todos los derechos reservados.

## 🤝 Soporte

Para soporte técnico, contactar con el equipo de desarrollo:
- Email: soporte@lurraldebus.eus
- Tel: 943 XXX XXX
