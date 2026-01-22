# Documentación de API y Servicios - ZaintzaBus

Esta documentación describe los servicios y funciones principales del sistema.

---

## 📁 Estructura de Servicios

```
src/lib/firebase/
├── config.ts         # Configuración Firebase
├── activos.ts        # CRUD de activos
├── incidencias.ts    # Gestión de incidencias
├── inventario.ts     # Control de inventario
├── preventivo.ts     # Mantenimiento preventivo
├── auditoria.ts      # Logs de auditoría
├── admin.ts          # Funciones administrativas
├── queryUtils.ts     # Utilidades de queries
└── ...
```

---

## 🔥 Firebase Services

### Incidencias

#### `getIncidencias(tenantId, filtros?)`

Obtiene lista de incidencias con filtros opcionales.

```typescript
const incidencias = await getIncidencias('tenant-1', {
  estado: ['nueva', 'en_analisis'],
  criticidad: 'critica',
  activoId: 'activo-123',
  desde: new Date('2024-01-01'),
  hasta: new Date('2024-12-31'),
});
```

**Parámetros:**
- `tenantId`: ID del tenant
- `filtros.estado`: Array de estados a incluir
- `filtros.criticidad`: Nivel de criticidad
- `filtros.activoId`: Filtrar por activo
- `filtros.asignadoA`: Filtrar por técnico
- `filtros.desde/hasta`: Rango de fechas

**Retorna:** `Promise<Incidencia[]>`

---

#### `createIncidencia(tenantId, data, userId)`

Crea una nueva incidencia.

```typescript
const id = await createIncidencia('tenant-1', {
  descripcion: 'Validadora no lee tarjetas',
  activoId: 'activo-123',
  categoriaFallo: 'hardware',
  naturalezaFallo: 'averia',
}, 'user-456');
```

**Campos requeridos:**
- `descripcion`: Mínimo 10 caracteres
- `activoId`: ID del activo afectado
- `categoriaFallo`: Categoría del fallo
- `naturalezaFallo`: Tipo de fallo

**Retorna:** `Promise<string>` - ID de la incidencia creada

---

#### `updateIncidenciaEstado(tenantId, incidenciaId, nuevoEstado, userId, datos?)`

Actualiza el estado de una incidencia.

```typescript
await updateIncidenciaEstado(
  'tenant-1',
  'inc-123',
  'en_intervencion',
  'user-456',
  { observaciones: 'Iniciando reparación' }
);
```

**Transiciones válidas:**
| Desde | Hacia |
|-------|-------|
| nueva | en_analisis, cerrada |
| en_analisis | en_intervencion, nueva |
| en_intervencion | resuelta, en_analisis |
| resuelta | cerrada, reabierta |
| cerrada | reabierta |
| reabierta | en_analisis |

---

### Activos

#### `getActivos(tenantId, filtros?)`

```typescript
const activos = await getActivos('tenant-1', {
  tipo: 'autobus',
  estado: 'operativo',
  operadorId: 'op-1',
});
```

#### `getActivoById(tenantId, activoId)`

```typescript
const activo = await getActivoById('tenant-1', 'activo-123');
```

#### `createActivo(tenantId, data, userId)`

```typescript
const id = await createActivo('tenant-1', {
  tipo: 'autobus',
  matricula: '1234-ABC',
  marca: 'Mercedes',
  modelo: 'Citaro',
  operadorId: 'op-1',
}, 'user-456');
```

#### `updateActivo(tenantId, activoId, data, userId)`

```typescript
await updateActivo('tenant-1', 'activo-123', {
  estado: 'en_mantenimiento',
  kilometraje: 125000,
}, 'user-456');
```

---

### Inventario

#### `getInventario(tenantId, filtros?)`

```typescript
const items = await getInventario('tenant-1', {
  categoriaId: 'cat-1',
  stockBajo: true,
});
```

#### `registrarMovimiento(tenantId, movimiento, userId)`

```typescript
await registrarMovimiento('tenant-1', {
  itemId: 'item-123',
  tipo: 'salida',
  cantidad: 2,
  motivo: 'Reparación incidencia INC-001',
  incidenciaId: 'inc-001',
}, 'user-456');
```

**Tipos de movimiento:**
- `entrada`: Añade stock
- `salida`: Reduce stock
- `ajuste`: Corrección manual
- `devolucion`: Material devuelto

---

### Preventivo

#### `getPreventivos(tenantId, filtros?)`

```typescript
const preventivos = await getPreventivos('tenant-1', {
  activoId: 'activo-123',
  vencidos: true,
});
```

#### `createPreventivo(tenantId, data, userId)`

```typescript
const id = await createPreventivo('tenant-1', {
  nombre: 'Revisión mensual FMS',
  activoId: 'activo-123',
  periodicidad: { tipo: 'meses', valor: 1 },
  tareas: [
    { descripcion: 'Verificar conexiones', completada: false },
    { descripcion: 'Actualizar firmware', completada: false },
  ],
  proximaEjecucion: new Date('2024-02-01'),
}, 'user-456');
```

#### `completarPreventivo(tenantId, preventivoId, datos, userId)`

```typescript
await completarPreventivo('tenant-1', 'prev-123', {
  observaciones: 'Completado sin incidencias',
  tareasCompletadas: ['tarea-1', 'tarea-2'],
}, 'user-456');
```

---

## 🪝 Hooks Personalizados

### Data Fetching

```typescript
// Obtener incidencias con estado reactivo
const { data, loading, error, refetch } = useIncidencias(tenantId, filtros);

// Obtener activo individual
const { data, loading, error } = useActivo(tenantId, activoId);

// Estadísticas con cache
const { data, isStale, refresh } = useCache(
  `stats-${tenantId}`,
  () => getEstadisticas(tenantId),
  { ttl: 5 * 60 * 1000 }
);
```

### Paginación

```typescript
const {
  data,
  isLoading,
  isLoadingMore,
  hasMore,
  loadMore,
  refresh,
} = usePagination(
  (cursor, limit) => getIncidenciasPaginadas(tenantId, cursor, limit),
  { pageSize: 20 }
);
```

### Infinite Scroll

```typescript
const sentinelRef = useInfiniteScroll(loadMore, {
  threshold: 0.1,
  enabled: hasMore && !isLoadingMore,
});

// En el render:
<div ref={sentinelRef} />
```

---

## 🔒 Seguridad

### Custom Claims

Los usuarios tienen claims de Firebase:
```typescript
{
  tenantId: string;  // ID del operador
  rol: 'operador' | 'tecnico' | 'jefe_mantenimiento' | 'admin' | 'dfg';
}
```

### Permisos por Rol

| Acción | Operador | Técnico | Jefe | Admin |
|--------|----------|---------|------|-------|
| Ver incidencias | ✅ | ✅ | ✅ | ✅ |
| Crear incidencias | ✅ | ✅ | ✅ | ✅ |
| Cambiar estado | ❌ | ✅ | ✅ | ✅ |
| Ver inventario | ✅ | ✅ | ✅ | ✅ |
| Gestionar inventario | ❌ | ✅ | ✅ | ✅ |
| Crear activos | ❌ | ❌ | ✅ | ✅ |
| Eliminar activos | ❌ | ❌ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ✅ |

---

## 📊 Tipos TypeScript

### Incidencia

```typescript
interface Incidencia {
  id: string;
  codigo: string;
  descripcion: string;
  estado: EstadoIncidencia;
  criticidad: Criticidad;
  criticidadDefinidaPor: 'sistema' | 'usuario';
  categoriaFallo: string;
  naturalezaFallo: string;
  activoId: string;
  equipoId?: string;
  asignadoA?: string;
  fechaCreacion: Timestamp;
  fechaResolucion?: Timestamp;
  fechaCierre?: Timestamp;
  sla: {
    objetivo: number; // minutos
    tiempoTranscurrido: number;
    cumplido: boolean;
  };
  tenantId: string;
}
```

### Activo

```typescript
interface Activo {
  id: string;
  codigo: string;
  tipo: 'autobus' | 'validadora' | 'pantalla' | 'router' | 'camara';
  estado: EstadoActivo;
  matricula?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  operadorId: string;
  ubicacionBase?: string;
  kilometraje?: number;
  fechaAlta: Timestamp;
  tenantId: string;
}
```

### ItemInventario

```typescript
interface ItemInventario {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  cantidad: number;
  stockMinimo: number;
  stockMaximo?: number;
  unidad: string;
  ubicacion?: string;
  proveedor?: string;
  precioUnitario?: number;
  tenantId: string;
}
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Estructura de Tests

```
src/__tests__/
├── setup.ts           # Configuración global
├── services.test.ts   # Tests de servicios
└── importacion.test.ts # Tests de importación
```

---

## 📈 Optimización

### Query Performance

```typescript
// Usar paginación para listas grandes
const result = await paginatedQuery<Incidencia>(
  `tenants/${tenantId}/incidencias`,
  [where('estado', '==', 'nueva'), orderBy('fechaCreacion', 'desc')],
  { pageSize: 20, cursor: lastCursor }
);

// Batch fetch para relaciones
const activos = await batchFetchByIds<Activo>(
  `tenants/${tenantId}/activos`,
  incidencias.map(i => i.activoId)
);
```

### Índices Recomendados

Ver `firestore.indexes.json` para la lista completa de índices compuestos necesarios.

---

*Documentación generada para ZaintzaBus v1.0*
