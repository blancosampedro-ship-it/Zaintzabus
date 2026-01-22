# ZaintzaBus - Modelo de Datos Firestore

## B) Colecciones y Estructura

### 1. usuarios
```typescript
// Colección: usuarios/{userId}
interface Usuario {
  id: string;                    // Firebase Auth UID
  email: string;
  nombre: string;
  apellidos: string;
  telefono?: string;
  rol: 'dfg' | 'operador' | 'jefe_mant' | 'tecnico' | 'soporte_sw';
  tenantId: string;              // Operador al que pertenece
  activo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
}

// Custom Claims (en token JWT)
interface CustomClaims {
  rol: string;
  tenantId: string;
  dfg?: boolean;                 // true solo para usuarios DFG
}
```

### 2. tenants (Operadores)
```typescript
// Colección: tenants/{tenantId}
interface Tenant {
  id: string;
  nombre: string;                // "Lurraldebus", "Operador X"
  codigo: string;                // "LURR", "OPX"
  contacto: {
    nombre: string;
    email: string;
    telefono: string;
  };
  contratoInicio: Timestamp;
  contratoFin: Timestamp;
  activo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. activos (Vehículos)
```typescript
// Colección: tenants/{tenantId}/activos/{activoId}
interface Activo {
  id: string;
  tipo: 'autobus' | 'equipo_taller' | 'infraestructura';
  codigo: string;                // Matrícula o código interno
  marca: string;
  modelo: string;
  anioFabricacion: number;
  fechaAlta: Timestamp;
  fechaBaja?: Timestamp;
  estado: 'operativo' | 'en_taller' | 'baja';
  ubicacionActual?: string;
  tenantId: string;
  
  // Equipos embarcados (subdocumento para consultas rápidas)
  equipos: EquipoInstalado[];
  
  // Contadores para SLA
  horasOperacion: number;
  kmTotales: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface EquipoInstalado {
  inventarioId: string;          // Ref a inventario
  tipo: string;                  // "SAE", "Validadora", "Cámara", etc.
  fechaInstalacion: Timestamp;
  posicion?: string;             // "Frontal", "Central", etc.
}
```

### 4. inventario (Componentes/Repuestos)
```typescript
// Colección: tenants/{tenantId}/inventario/{inventarioId}
interface Inventario {
  id: string;
  sku: string;                   // Código único
  descripcion: string;
  tipo: 'componente' | 'repuesto' | 'consumible';
  categoria: string;             // "SAE", "Validadoras", "Cámaras", etc.
  fabricante: string;
  modelo: string;
  numeroSerie?: string;          // Cuando aplica
  
  estado: 'instalado' | 'almacen' | 'reparacion' | 'baja';
  
  // Ubicación actual
  ubicacion: {
    tipo: 'activo' | 'almacen' | 'proveedor';
    referenciaId?: string;       // activoId si instalado
    descripcion: string;         // "Almacén central", "Bus 1234-ABC"
  };
  
  // Compatibilidades
  compatibleCon: string[];       // Lista de modelos de activo
  
  // Trazabilidad
  ultimoMovimiento: Timestamp;
  historialMovimientos: string[]; // IDs de movimientos (últimos 10)
  
  // Stock (para repuestos/consumibles)
  cantidadDisponible?: number;
  cantidadMinima?: number;
  
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Subcolección: tenants/{tenantId}/inventario/{inventarioId}/movimientos/{movId}
interface MovimientoInventario {
  id: string;
  tipo: 'entrada' | 'salida' | 'traspaso' | 'instalacion' | 'desinstalacion' | 'reparacion_envio' | 'reparacion_retorno';
  fecha: Timestamp;
  
  origenTipo: 'almacen' | 'activo' | 'proveedor';
  origenId?: string;
  origenDescripcion: string;
  
  destinoTipo: 'almacen' | 'activo' | 'proveedor';
  destinoId?: string;
  destinoDescripcion: string;
  
  cantidad: number;
  
  incidenciaId?: string;         // Si es por incidencia
  preventivoId?: string;         // Si es por preventivo
  
  observaciones?: string;
  usuarioId: string;
  tenantId: string;
  createdAt: Timestamp;
}
```

### 5. incidencias (Órdenes de Trabajo Correctivas)
```typescript
// Colección: tenants/{tenantId}/incidencias/{incidenciaId}
interface Incidencia {
  id: string;
  codigo: string;                // "INC-2024-00001"
  tipo: 'correctiva' | 'preventiva';
  
  // Clasificación
  criticidad: 'critica' | 'normal';
  criticidadDefinidaPor: {
    operador: boolean;
    mantenimiento: boolean;
  };
  categoriaFallo: string;        // "Hardware", "Software", "Conectividad"
  naturalezaFallo: string;       // Descripción detallada
  
  // Activos afectados
  activoPrincipalId: string;
  activoPrincipalCodigo: string; // Denormalizado para consultas
  equiposAfectados: {
    inventarioId: string;
    descripcion: string;
  }[];
  
  // Afecciones
  afectaTercerosEquipos: boolean;
  equiposTercerosAfectados?: string[];
  afectaProcesos: boolean;
  procesosAfectados?: string[];
  
  // Estados y timestamps (CRÍTICOS PARA SLA)
  estado: 'nueva' | 'en_analisis' | 'en_intervencion' | 'resuelta' | 'cerrada' | 'reabierta';
  
  timestamps: {
    recepcion: Timestamp;        // Cuando se registra el fallo
    inicioAnalisis?: Timestamp;  // Cuando técnico comienza diagnóstico
    finAnalisis?: Timestamp;
    inicioReparacion?: Timestamp;
    finReparacion?: Timestamp;
    cierre?: Timestamp;
    reapertura?: Timestamp;
  };
  
  // Métricas SLA (calculadas automáticamente)
  sla: {
    tiempoAtencion?: number;     // Minutos hasta inicioAnalisis
    tiempoResolucion?: number;   // Minutos hasta finReparacion
    fueraDeServicio?: number;    // Minutos totales sin servicio
    cumpleSLA?: boolean;
    dentroTiempoAtencion?: boolean;
    dentroTiempoResolucion?: boolean;
  };
  
  // Diagnóstico y resolución
  diagnostico?: string;
  causaRaiz?: string;
  solucionAplicada?: string;
  
  // Pruebas post-reparación
  pruebasRealizadas?: {
    descripcion: string;
    resultado: 'ok' | 'fallo' | 'parcial';
    observaciones?: string;
    fecha: Timestamp;
  }[];
  
  // Materiales
  materialesUtilizados?: {
    inventarioId: string;
    descripcion: string;
    cantidad: number;
    tipo: 'sustituido' | 'consumido' | 'reparado';
  }[];
  
  // Mejoras
  accionesMejora?: {
    descripcion: string;
    implementada: boolean;
    fechaImplementacion?: Timestamp;
  }[];
  
  // Asignación
  reportadoPor: string;          // userId
  asignadoA?: string;            // userId técnico
  supervisadoPor?: string;       // userId jefe_mant
  
  // Adjuntos
  adjuntos?: {
    nombre: string;
    url: string;
    tipo: string;
    subidoPor: string;
    fecha: Timestamp;
  }[];
  
  observaciones?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6. preventivos (Mantenimiento Preventivo)
```typescript
// Colección: tenants/{tenantId}/preventivos/{preventivoId}
interface Preventivo {
  id: string;
  codigo: string;                // "PREV-2024-00001"
  
  // Planificación
  nombre: string;
  descripcion: string;
  periodicidad: '3M' | '6M' | '1A' | '2A';
  tipoActivo: string;            // Aplica a qué tipos de activo
  
  // Checklist base
  tareas: TareaPreventivo[];
  
  // Programación
  proximaEjecucion: Timestamp;
  ultimaEjecucion?: Timestamp;
  
  activo: boolean;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TareaPreventivo {
  id: string;
  orden: number;
  descripcion: string;
  categoria: string;             // "Inspección", "Limpieza", "Calibración"
  tiempoEstimado: number;        // Minutos
  materialesRequeridos?: string[];
  obligatoria: boolean;
}

// Subcolección: tenants/{tenantId}/preventivos/{preventivoId}/ejecuciones/{ejId}
interface EjecucionPreventivo {
  id: string;
  preventivoId: string;
  activoId: string;
  activoCodigo: string;
  
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada';
  fechaProgramada: Timestamp;
  fechaInicio?: Timestamp;
  fechaFin?: Timestamp;
  
  // Checklist ejecutado
  tareasEjecutadas: {
    tareaId: string;
    completada: boolean;
    resultado?: 'ok' | 'anomalia' | 'no_aplica';
    observaciones?: string;
    fechaEjecucion?: Timestamp;
  }[];
  
  materialesUtilizados?: {
    inventarioId: string;
    descripcion: string;
    cantidad: number;
  }[];
  
  // Si genera incidencia
  incidenciaGeneradaId?: string;
  
  ejecutadoPor: string;
  observaciones?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 7. auditoria (Log de Cambios)
```typescript
// Colección: auditoria/{logId}
interface AuditLog {
  id: string;
  
  // Qué cambió
  entidad: 'incidencia' | 'inventario' | 'activo' | 'preventivo' | 'usuario';
  entidadId: string;
  accion: 'crear' | 'actualizar' | 'eliminar' | 'cambio_estado';
  
  // Quién
  usuarioId: string;
  usuarioEmail: string;
  usuarioRol: string;
  
  // Cuándo
  timestamp: Timestamp;
  
  // Contexto
  tenantId: string;
  ip?: string;
  userAgent?: string;
  
  // Cambios (solo campos modificados)
  cambios: {
    campo: string;
    valorAnterior: any;
    valorNuevo: any;
  }[];
  
  // Metadata adicional
  motivoCambio?: string;
}
```

### 8. sla_metrics (Métricas Agregadas)
```typescript
// Colección: tenants/{tenantId}/sla_metrics/{periodo}
// periodo = "2024-01" (mensual) o "2024-W01" (semanal)
interface SLAMetrics {
  id: string;
  periodo: string;
  tipo: 'mensual' | 'semanal' | 'diario';
  
  // Totales
  totalIncidencias: number;
  incidenciasCriticas: number;
  incidenciasNormales: number;
  
  // Tiempos promedio
  tiempoAtencionPromedio: number;      // Minutos
  tiempoResolucionPromedio: number;
  tiempoFueraServicioPromedio: number;
  
  // Cumplimiento SLA
  incidenciasDentroSLA: number;
  porcentajeCumplimientoSLA: number;
  
  // Por criticidad
  slaDetalle: {
    criticas: {
      total: number;
      dentroSLA: number;
      tiempoAtencionPromedio: number;
      tiempoResolucionPromedio: number;
    };
    normales: {
      total: number;
      dentroSLA: number;
      tiempoAtencionPromedio: number;
      tiempoResolucionPromedio: number;
    };
  };
  
  // Disponibilidad
  disponibilidadGlobal: number;        // Porcentaje
  disponibilidadPorActivo: {
    activoId: string;
    codigo: string;
    disponibilidad: number;
    horasFueraServicio: number;
  }[];
  
  tenantId: string;
  calculadoAt: Timestamp;
}
```

### 9. sla_config (Configuración SLA)
```typescript
// Colección: sla_config/{tenantId}
interface SLAConfig {
  id: string;
  tenantId: string;
  
  // Tiempos máximos en minutos
  tiempos: {
    critica: {
      atencion: number;          // 30 min
      resolucion: number;        // 240 min (4h)
    };
    normal: {
      atencion: number;          // 120 min (2h)
      resolucion: number;        // 1440 min (24h)
    };
  };
  
  // Horario de servicio (para cálculos)
  horarioServicio: {
    inicio: string;              // "06:00"
    fin: string;                 // "23:00"
    diasLaborables: number[];    // [1,2,3,4,5,6,7]
  };
  
  // Disponibilidad objetivo
  disponibilidadObjetivo: number; // 99.5
  
  updatedAt: Timestamp;
  updatedBy: string;
}
```

## Índices Compuestos Requeridos

```javascript
// firestore.indexes.json
{
  "indexes": [
    // Incidencias por tenant y estado
    {
      "collectionGroup": "incidencias",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "estado", "order": "ASCENDING" },
        { "fieldPath": "timestamps.recepcion", "order": "DESCENDING" }
      ]
    },
    // Incidencias por activo
    {
      "collectionGroup": "incidencias",
      "fields": [
        { "fieldPath": "activoPrincipalId", "order": "ASCENDING" },
        { "fieldPath": "timestamps.recepcion", "order": "DESCENDING" }
      ]
    },
    // Inventario por estado
    {
      "collectionGroup": "inventario",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "estado", "order": "ASCENDING" },
        { "fieldPath": "categoria", "order": "ASCENDING" }
      ]
    },
    // Auditoría por entidad
    {
      "collectionGroup": "auditoria",
      "fields": [
        { "fieldPath": "entidad", "order": "ASCENDING" },
        { "fieldPath": "entidadId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // Preventivos por fecha
    {
      "collectionGroup": "ejecuciones",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "estado", "order": "ASCENDING" },
        { "fieldPath": "fechaProgramada", "order": "ASCENDING" }
      ]
    }
  ]
}
```
