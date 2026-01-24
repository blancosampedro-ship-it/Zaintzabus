# Sistema de Roles y Permisos - ZaintzaBus GMAO

## Índice

1. [Visión General](#visión-general)
2. [Definición de Roles](#definición-de-roles)
3. [Matriz de Permisos](#matriz-de-permisos)
4. [Recursos y Acciones](#recursos-y-acciones)
5. [Vistas por Rol](#vistas-por-rol)
6. [Integración Técnica](#integración-técnica)
7. [Seguridad en Firestore](#seguridad-en-firestore)
8. [Guía de Desarrollo](#guía-de-desarrollo)

---

## Visión General

El sistema de roles de ZaintzaBus implementa un modelo de **permisos granulares** basado en el patrón `Recurso:Acción`. Esto permite un control fino sobre qué puede hacer cada usuario, más allá de simples verificaciones de rol.

### Arquitectura Multi-Tenant

```
┌─────────────────────────────────────────────────────────────┐
│                         DFG/CONSORCIO                        │
│                    (Supervisión Global)                      │
│                    Solo lectura multi-tenant                 │
├─────────────────────────────────────────────────────────────┤
│     OPERADOR A          │           OPERADOR B               │
│   ┌─────────────────┐   │   ┌─────────────────┐             │
│   │ Admin           │   │   │ Admin           │             │
│   │ Jefe Mant.      │   │   │ Jefe Mant.      │             │
│   │ Técnicos        │   │   │ Técnicos        │             │
│   └─────────────────┘   │   └─────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Mínimo privilegio**: Cada rol tiene solo los permisos necesarios
2. **Aislamiento de tenant**: Los datos están separados por operador
3. **DFG como supervisor**: Acceso de solo lectura a todos los operadores
4. **Auditoría completa**: Todas las acciones críticas quedan registradas

---

## Definición de Roles

### 🔧 Técnico (`tecnico`)

**Objetivo Principal**: Ejecutar trabajos de mantenimiento con máxima eficiencia en movilidad.

| Atributo | Valor |
|----------|-------|
| Nivel de Acceso | 1 (Básico) |
| Dispositivo Principal | Móvil/Tablet |
| Nivel de Detalle | Básico - Solo información esencial |
| Multi-tenant | ❌ No |
| Histórico | 30 días |

**Preguntas Clave que Responde**:
- ¿Qué trabajo tengo asignado hoy?
- ¿Dónde está el autobús y qué herramientas necesito?
- ¿Cómo registro lo que he hecho?

**Permisos Principales**:
- ✅ Ver órdenes de trabajo asignadas
- ✅ Actualizar estado de OTs propias
- ✅ Ver piezas de inventario
- ✅ Solicitar piezas
- ✅ Crear incidencias
- ❌ Ver costes económicos
- ❌ Gestionar otros técnicos
- ❌ Acceder a configuración

---

### 👷 Jefe de Mantenimiento (`jefe_mantenimiento`)

**Objetivo Principal**: Supervisar operaciones diarias y gestionar el equipo técnico.

| Atributo | Valor |
|----------|-------|
| Nivel de Acceso | 2 (Supervisor) |
| Dispositivo Principal | Desktop/Tablet |
| Nivel de Detalle | Completo - Toda la información operativa |
| Multi-tenant | ❌ No |
| Histórico | 365 días |

**Preguntas Clave que Responde**:
- ¿Cuál es el estado general del taller?
- ¿Qué incidencias críticas hay pendientes?
- ¿Cómo está rindiendo cada técnico?
- ¿Cumplimos los SLAs de respuesta?

**Permisos Principales**:
- ✅ Gestión completa de órdenes de trabajo
- ✅ Gestión de incidencias
- ✅ Asignación de técnicos
- ✅ Ver y solicitar inventario
- ✅ Programar mantenimiento preventivo
- ✅ Ver costes operativos
- ✅ Acceso a informes operativos
- ❌ Configuración del sistema
- ❌ Gestión de usuarios
- ❌ Ver penalizaciones SLA detalladas

---

### 🏢 Operador (`operador`)

**Objetivo Principal**: Visión ejecutiva del rendimiento de la flota y control de costes.

| Atributo | Valor |
|----------|-------|
| Nivel de Acceso | 3 (Gestión) |
| Dispositivo Principal | Desktop |
| Nivel de Detalle | Completo con costes |
| Multi-tenant | ❌ No (solo su operador) |
| Histórico | Sin límite |

**Preguntas Clave que Responde**:
- ¿Cuál es la disponibilidad de mi flota?
- ¿Estamos dentro del presupuesto de mantenimiento?
- ¿Cuál es el coste por km de cada autobús?
- ¿Qué penalizaciones SLA enfrentamos?

**Permisos Principales**:
- ✅ Ver todos los datos de su operador
- ✅ Gestión de incidencias
- ✅ Informes y estadísticas completos
- ✅ Ver costes y penalizaciones SLA
- ✅ Gestión de activos
- ❌ Ejecución directa de OTs
- ❌ Configuración del sistema
- ❌ Acceso a otros operadores

---

### 🏛️ DFG/Consorcio (`dfg`)

**Objetivo Principal**: Supervisión del cumplimiento contractual y comparativa entre operadores.

| Atributo | Valor |
|----------|-------|
| Nivel de Acceso | 4 (Supervisor Global) |
| Dispositivo Principal | Desktop |
| Nivel de Detalle | Agregado/Comparativo |
| Multi-tenant | ✅ Sí (todos los operadores) |
| Histórico | Sin límite |
| Modo | 🔒 **SOLO LECTURA** |

**Preguntas Clave que Responde**:
- ¿Cómo comparan los operadores en disponibilidad?
- ¿Se cumplen los SLAs contractuales?
- ¿Cuál es el estado global del transporte público?
- ¿Qué tendencias hay en incidencias?

**Permisos Principales**:
- ✅ Ver datos de todos los operadores
- ✅ Informes comparativos
- ✅ Métricas SLA globales
- ✅ Ver contratos y cumplimiento
- ❌ **Modificar cualquier dato**
- ❌ Crear/editar incidencias u OTs
- ❌ Gestión de usuarios

> ⚠️ **Importante**: El rol DFG es estrictamente de solo lectura. Cualquier intento de escritura será rechazado tanto en frontend como en Firestore.

---

### ⚙️ Administrador (`admin`)

**Objetivo Principal**: Configuración del sistema y gestión de usuarios del operador.

| Atributo | Valor |
|----------|-------|
| Nivel de Acceso | 5 (Administrador) |
| Dispositivo Principal | Desktop |
| Nivel de Detalle | Completo |
| Multi-tenant | ❌ No (solo su operador) |
| Histórico | Sin límite |

**Preguntas Clave que Responde**:
- ¿Qué usuarios hay y qué permisos tienen?
- ¿Está el sistema configurado correctamente?
- ¿Qué acciones se han realizado (auditoría)?

**Permisos Principales**:
- ✅ Todos los permisos del Operador
- ✅ Gestión de usuarios del tenant
- ✅ Configuración del sistema
- ✅ Acceso a logs de auditoría
- ❌ Acceso a otros operadores
- ❌ Configuración global del sistema

---

## Matriz de Permisos

### Leyenda
- ✅ Permiso completo
- 👁️ Solo lectura
- 🔸 Parcial/Limitado
- ❌ Sin acceso

### Tabla de Permisos por Recurso

| Recurso | Técnico | Jefe Mant. | Operador | DFG | Admin |
|---------|---------|------------|----------|-----|-------|
| **Dashboard** | 🔸 Básico | ✅ | ✅ | 👁️ | ✅ |
| **Autobuses** | 👁️ | ✅ | ✅ | 👁️ | ✅ |
| **Incidencias** | 🔸 Crear | ✅ | ✅ | 👁️ | ✅ |
| **OTs - Ver** | 🔸 Propias | ✅ | 👁️ | 👁️ | ✅ |
| **OTs - Crear** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **OTs - Ejecutar** | 🔸 Asignadas | ✅ | ❌ | ❌ | ✅ |
| **Inventario** | 👁️ | ✅ | ✅ | 👁️ | ✅ |
| **Preventivo** | ❌ | ✅ | 👁️ | 👁️ | ✅ |
| **Técnicos** | ❌ | 👁️ | 👁️ | 👁️ | ✅ |
| **Informes** | ❌ | 🔸 Operativos | ✅ | ✅ | ✅ |
| **SLA** | ❌ | 🔸 Sin penaliz. | ✅ | 👁️ | ✅ |
| **Costes** | ❌ | 🔸 Básico | ✅ | 👁️ | ✅ |
| **Usuarios** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Configuración** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Auditoría** | ❌ | ❌ | ❌ | 👁️ | ✅ |
| **Multi-tenant** | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Recursos y Acciones

### Recursos Disponibles

```typescript
type Resource = 
  | 'dashboard'      // Panel principal
  | 'autobuses'      // Flota de vehículos
  | 'incidencias'    // Reportes de averías
  | 'ordenesTrabajo' // Órdenes de trabajo
  | 'inventario'     // Stock de piezas
  | 'preventivo'     // Mantenimiento programado
  | 'tecnicos'       // Personal técnico
  | 'informes'       // Reportes y estadísticas
  | 'sla'            // Métricas de servicio
  | 'costes'         // Información económica
  | 'usuarios'       // Gestión de usuarios
  | 'configuracion'  // Ajustes del sistema
  | 'auditoria'      // Logs de actividad
  | 'contratos'      // Contratos de servicio
  | 'activos';       // Gestión de activos
```

### Acciones Disponibles

```typescript
type Action = 
  | 'ver'              // Visualizar listados
  | 'ver_detalle'      // Ver información detallada
  | 'crear'            // Crear nuevos registros
  | 'editar'           // Modificar existentes
  | 'eliminar'         // Borrar registros
  | 'asignar'          // Asignar a usuarios
  | 'cambiar_estado'   // Cambiar estados
  | 'exportar'         // Exportar datos
  | 'ejecutar'         // Ejecutar trabajos
  | 'aprobar'          // Aprobar solicitudes
  | 'solicitar'        // Crear solicitudes
  | 'mover'            // Mover entre ubicaciones
  | 'programar'        // Programar tareas
  | 'configurar'       // Configurar ajustes
  | 'ver_costes'       // Ver info económica
  | 'ver_penalizaciones' // Ver penalizaciones SLA
  | 'comparar'         // Comparar entre operadores
  | 'ver_auditoria';   // Ver logs de auditoría
```

### Formato de Permiso

Los permisos se expresan como `recurso:accion`:

```typescript
type Permission = `${Resource}:${Action}`;

// Ejemplos:
'incidencias:crear'        // Crear incidencias
'ordenesTrabajo:ejecutar'  // Ejecutar OTs
'sla:ver_penalizaciones'   // Ver penalizaciones SLA
```

---

## Vistas por Rol

### Dashboard por Rol

#### Técnico
```
┌─────────────────────────────────────────┐
│ 🔧 Mis Tareas de Hoy                    │
├─────────────┬───────────────────────────┤
│ OT #1234    │ Cambio aceite - Bus 45    │
│ OT #1235    │ Revisión frenos - Bus 12  │
├─────────────┴───────────────────────────┤
│ 📋 Completar OT    ➕ Nueva Incidencia  │
└─────────────────────────────────────────┘
```

#### Jefe de Mantenimiento
```
┌─────────────────────────────────────────────────────┐
│ 📊 Panel de Operaciones                             │
├──────────────┬──────────────┬──────────────────────┤
│ 🚌 Flota     │ 🔧 OTs Hoy   │ ⚠️ Incidencias       │
│ 45 activos   │ 12 pend.     │ 3 críticas           │
├──────────────┴──────────────┴──────────────────────┤
│ 📈 SLA: 94.2%  │  👷 Técnicos: 8/10 disponibles    │
├────────────────────────────────────────────────────┤
│ ❓ Preguntas Clave del Día                         │
│ • ¿Cuál es el estado del taller?                   │
│ • ¿Hay incidencias sin asignar?                    │
└────────────────────────────────────────────────────┘
```

#### Operador
```
┌─────────────────────────────────────────────────────┐
│ 💼 Resumen Ejecutivo                                │
├──────────────┬──────────────┬──────────────────────┤
│ 📊 Disponib. │ 💰 Costes    │ 📉 SLA               │
│ 96.5%        │ €12,450/mes  │ 2 en riesgo          │
├──────────────┴──────────────┴──────────────────────┤
│ 💰 Resumen de Costes del Mes                       │
│ • Piezas: €8,200    • Mano obra: €4,250           │
├────────────────────────────────────────────────────┤
│ ⚠️ SLAs en Riesgo                                  │
│ • Tiempo respuesta críticas: 85% (objetivo 90%)    │
└────────────────────────────────────────────────────┘
```

#### DFG (Solo Lectura)
```
┌─────────────────────────────────────────────────────┐
│ 🔒 MODO SOLO LECTURA - Supervisión DFG              │
├─────────────────────────────────────────────────────┤
│ 📊 Comparativa de Operadores                        │
├──────────────┬──────────────┬──────────────────────┤
│ Operador A   │ Operador B   │ Operador C           │
│ SLA: 94.2%   │ SLA: 91.8%   │ SLA: 96.1%           │
│ Disp: 96%    │ Disp: 93%    │ Disp: 97%            │
├──────────────┴──────────────┴──────────────────────┤
│ 📈 Tendencias Globales                             │
│ [Gráfico de disponibilidad por operador]           │
└────────────────────────────────────────────────────┘
```

### Navegación por Rol

| Sección | Técnico | Jefe Mant. | Operador | DFG | Admin |
|---------|---------|------------|----------|-----|-------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Autobuses | ✅ | ✅ | ✅ | ✅ | ✅ |
| Incidencias | ✅ | ✅ | ✅ | ✅ | ✅ |
| Órdenes Trabajo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventario | ✅ | ✅ | ✅ | ✅ | ✅ |
| Preventivo | ❌ | ✅ | ✅ | ✅ | ✅ |
| Técnicos | ❌ | ✅ | ✅ | ✅ | ✅ |
| Informes | ❌ | ✅ | ✅ | ✅ | ✅ |
| Facturación | ❌ | ❌ | ✅ | ✅ | ✅ |
| Contratos | ❌ | ❌ | ✅ | ✅ | ✅ |
| Administración | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Integración Técnica

### Uso del Hook usePermissions

```typescript
import { usePermissions } from '@/lib/permissions';

function MiComponente() {
  const { 
    hasPermission, 
    hasAnyPermission,
    hasAllPermissions,
    isReadOnly,
    canViewCosts,
    roleInfo 
  } = usePermissions();

  // Verificar un permiso específico
  if (hasPermission('incidencias:crear')) {
    // Mostrar botón de crear
  }

  // Verificar múltiples permisos (cualquiera)
  if (hasAnyPermission(['ordenesTrabajo:crear', 'ordenesTrabajo:editar'])) {
    // Mostrar opciones de gestión
  }

  // Verificar múltiples permisos (todos)
  if (hasAllPermissions(['sla:ver', 'sla:ver_penalizaciones'])) {
    // Mostrar panel completo de SLA
  }

  // Verificar si es solo lectura (DFG)
  if (isReadOnly) {
    // Deshabilitar botones de edición
  }
}
```

### Componentes de Protección

#### RequirePermission

Renderiza contenido solo si el usuario tiene el permiso:

```tsx
import { RequirePermission } from '@/lib/permissions';

function PaginaIncidencias() {
  return (
    <div>
      <h1>Incidencias</h1>
      
      <RequirePermission 
        permission="incidencias:crear"
        fallback={<p>No tienes permiso para crear</p>}
      >
        <BotonCrearIncidencia />
      </RequirePermission>
    </div>
  );
}
```

#### RequireRole

Renderiza contenido solo para roles específicos:

```tsx
import { RequireRole } from '@/lib/permissions';

function PanelAdmin() {
  return (
    <RequireRole 
      roles={['admin']}
      fallback={<AccesoDenegado />}
    >
      <ConfiguracionSistema />
    </RequireRole>
  );
}
```

#### RequireAnyPermission / RequireAllPermissions

```tsx
// Cualquiera de los permisos
<RequireAnyPermission permissions={['ots:crear', 'ots:editar']}>
  <FormularioOT />
</RequireAnyPermission>

// Todos los permisos
<RequireAllPermissions permissions={['sla:ver', 'costes:ver_costes']}>
  <InformeFinanciero />
</RequireAllPermissions>
```

### Higher-Order Components (HOCs)

Para componentes de clase o cuando prefieras HOCs:

```tsx
import { withPermission, withRole } from '@/lib/permissions';

// Proteger por permiso
const CrearIncidenciaProtegido = withPermission(
  CrearIncidencia,
  'incidencias:crear',
  AccesoDenegado
);

// Proteger por rol
const PanelAdminProtegido = withRole(
  PanelAdmin,
  ['admin'],
  AccesoDenegado
);
```

### Protección de Rutas

El componente `RouteGuard` protege rutas automáticamente:

```tsx
// En layout.tsx
import { RouteGuard } from '@/components/layout/RouteGuard';

export default function AppLayout({ children }) {
  return (
    <RouteGuard>
      {children}
    </RouteGuard>
  );
}
```

Configuración en `ROUTE_PERMISSIONS`:

```typescript
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': ['dashboard:ver'],
  '/incidencias': ['incidencias:ver'],
  '/admin': ['usuarios:ver', 'configuracion:ver'],
  // ...
};
```

---

## Seguridad en Firestore

### Funciones Helper en Rules

```javascript
// Verificar rol del usuario
function hasRole(role) {
  return request.auth.token.rol == role;
}

// Verificar tenant del usuario
function belongsToTenant(tenantId) {
  return request.auth.token.tenantId == tenantId;
}

// Verificar si puede escribir (excluye DFG)
function canWriteToTenant(tenantId) {
  return belongsToTenant(tenantId) && !hasRole('dfg');
}

// Verificar si puede gestionar (admin, operador, jefe)
function canManage(tenantId) {
  return belongsToTenant(tenantId) && 
         hasRole('admin') || hasRole('operador') || hasRole('jefe_mantenimiento');
}

// Verificar si puede ejecutar trabajo (técnico o superior)
function canExecuteWork(tenantId) {
  return belongsToTenant(tenantId) && 
         (hasRole('tecnico') || hasRole('jefe_mantenimiento') || hasRole('admin'));
}
```

### Ejemplo de Regla para Incidencias

```javascript
match /tenants/{tenantId}/incidencias/{incidenciaId} {
  // Lectura: usuarios del tenant o DFG
  allow read: if belongsToTenant(tenantId) || hasRole('dfg');
  
  // Crear: técnicos pueden reportar, gestores pueden crear
  allow create: if canWriteToTenant(tenantId) && 
                   (canExecuteWork(tenantId) || canManage(tenantId));
  
  // Actualizar: solo gestores
  allow update: if canManage(tenantId);
  
  // Eliminar: solo admin
  allow delete: if belongsToTenant(tenantId) && hasRole('admin');
}
```

### Auditoría

Todas las colecciones de auditoría son append-only:

```javascript
match /tenants/{tenantId}/auditoria/{logId} {
  // Solo admin y DFG pueden leer
  allow read: if (belongsToTenant(tenantId) && hasRole('admin')) || hasRole('dfg');
  
  // Solo el sistema puede escribir (a través de Cloud Functions)
  allow write: if false;
}
```

---

## Guía de Desarrollo

### Añadir un Nuevo Permiso

1. **Agregar el recurso/acción** en `src/lib/permissions/types.ts`:

```typescript
// Si es un nuevo recurso
const RESOURCES = [..., 'nuevoRecurso'] as const;

// Si es una nueva acción
const ACTIONS = [..., 'nuevaAccion'] as const;
```

2. **Asignar a roles** en `src/lib/permissions/permissions.ts`:

```typescript
export const ROLE_PERMISSIONS: Record<RolUsuario, Permission[]> = {
  admin: [..., 'nuevoRecurso:nuevaAccion'],
  // ... otros roles
};
```

3. **Usar en componentes**:

```tsx
<RequirePermission permission="nuevoRecurso:nuevaAccion">
  <NuevoComponente />
</RequirePermission>
```

4. **Actualizar Firestore Rules** si es necesario.

### Añadir un Nuevo Rol

1. **Definir en types.ts**:

```typescript
export const ROLE_DEFINITIONS: Record<RolUsuario, RoleDefinition> = {
  // ...
  nuevoRol: {
    key: 'nuevoRol',
    label: 'Nuevo Rol',
    shortLabel: 'NR',
    level: 2,
    description: 'Descripción del rol',
    icon: '🆕',
    color: 'blue',
    primaryDevice: 'desktop',
    detailLevel: 'completo',
    multiTenant: false,
    canWrite: true,
  },
};
```

2. **Asignar permisos** en `permissions.ts`.

3. **Actualizar `types/index.ts`**:

```typescript
export type RolUsuario = '...' | 'nuevoRol';
export const ROL_LABELS: Record<RolUsuario, string> = {
  // ...
  nuevoRol: 'Nuevo Rol',
};
```

4. **Actualizar Firestore Rules**.

### Testing de Permisos

```typescript
import { roleHasPermission } from '@/lib/permissions';

describe('Permisos', () => {
  it('técnico puede crear incidencias', () => {
    expect(roleHasPermission('tecnico', 'incidencias:crear')).toBe(true);
  });

  it('técnico no puede ver costes', () => {
    expect(roleHasPermission('tecnico', 'costes:ver_costes')).toBe(false);
  });

  it('dfg no puede crear nada', () => {
    expect(roleHasPermission('dfg', 'incidencias:crear')).toBe(false);
    expect(roleHasPermission('dfg', 'ordenesTrabajo:crear')).toBe(false);
  });
});
```

---

## Checklist de Seguridad

- [ ] Todo endpoint/página verifica permisos antes de renderizar
- [ ] Las reglas de Firestore reflejan los permisos del frontend
- [ ] El rol DFG no puede escribir en ninguna colección
- [ ] Los técnicos solo ven sus OTs asignadas
- [ ] Los datos de un tenant no son accesibles por otro
- [ ] Las acciones críticas quedan en auditoría
- [ ] Los Custom Claims se sincronizan con Firestore

---

## Recursos Adicionales

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura general del sistema
- [SECURITY_RULES.md](./SECURITY_RULES.md) - Detalle de reglas de Firestore
- [API_REFERENCE.md](./API_REFERENCE.md) - Referencia de la API

---

*Última actualización: Enero 2025*
*Versión: 1.0*
