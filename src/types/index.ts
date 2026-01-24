import type { Timestamp } from 'firebase/firestore';

// ============================================
// TIPOS FIRESTORE
// ============================================

/** Timestamp de Firestore (SDK cliente). */
export type FirestoreTimestamp = Timestamp;

/**
 * Timestamp de Firestore en cualquier entorno.
 * Útil porque en scripts/admin se usa `firebase-admin` y en cliente `firebase`.
 */
export type FirestoreAnyTimestamp = Timestamp | import('firebase-admin/firestore').Timestamp;

/** Identificador de documento Firestore. */
export type DocumentId = string;

// ============================================
// ENUMS Y CONSTANTES
// ============================================

export const ROLES = {
  ADMIN: 'admin',
  DFG: 'dfg',
  OPERADOR: 'operador',
  JEFE_MANTENIMIENTO: 'jefe_mantenimiento',
  TECNICO: 'tecnico',
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

// Alias de compatibilidad: algunas pantallas usan `RolUsuario`
export type RolUsuario = Rol;

/**
 * Etiquetas legibles para cada rol.
 * Usadas en UI para mostrar el nombre del rol.
 */
export const ROL_LABELS: Record<Rol, string> = {
  admin: 'Administrador',
  dfg: 'Consorcio / DFG',
  operador: 'Operador',
  jefe_mantenimiento: 'Jefe de Mantenimiento',
  tecnico: 'Técnico',
};

/**
 * Etiquetas cortas para cada rol (para badges, etc.)
 */
export const ROL_SHORT_LABELS: Record<Rol, string> = {
  admin: 'Admin',
  dfg: 'DFG',
  operador: 'Operador',
  jefe_mantenimiento: 'Jefe Mant.',
  tecnico: 'Técnico',
};

/**
 * Colores asociados a cada rol (para badges, avatares, etc.)
 */
export const ROL_COLORS: Record<Rol, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  dfg: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  operador: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  jefe_mantenimiento: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  tecnico: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

export const ESTADOS_INCIDENCIA = {
  NUEVA: 'nueva',
  EN_ANALISIS: 'en_analisis',
  EN_INTERVENCION: 'en_intervencion',
  RESUELTA: 'resuelta',
  CERRADA: 'cerrada',
  REABIERTA: 'reabierta',
} as const;

export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[keyof typeof ESTADOS_INCIDENCIA];

export const CRITICIDAD = {
  CRITICA: 'critica',
  NORMAL: 'normal',
} as const;

export type Criticidad = (typeof CRITICIDAD)[keyof typeof CRITICIDAD];

export const ESTADOS_INVENTARIO = {
  INSTALADO: 'instalado',
  ALMACEN: 'almacen',
  REPARACION: 'reparacion',
  BAJA: 'baja',
} as const;

export type EstadoInventario = (typeof ESTADOS_INVENTARIO)[keyof typeof ESTADOS_INVENTARIO];

export const PERIODICIDADES = {
  TRIMESTRAL: '3M',
  SEMESTRAL: '6M',
  ANUAL: '1A',
  BIANUAL: '2A',
} as const;

export type Periodicidad = (typeof PERIODICIDADES)[keyof typeof PERIODICIDADES];

// ============================================
// INTERFACES
// ============================================

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  telefono?: string;
  rol: Rol;
  tenantId: string;
  activo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
}

export interface CustomClaims {
  rol: Rol;
  tenantId: string;
  dfg?: boolean;
}

export interface Tenant {
  id: string;
  nombre: string;
  codigo: string;
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

export interface EquipoInstalado {
  inventarioId: string;
  tipo: string;
  fechaInstalacion: Timestamp;
  posicion?: string;
}

export interface Activo {
  id: string;
  tipo: 'autobus' | 'equipo_taller' | 'infraestructura';
  subtipo?: string;
  codigo: string;
  marca?: string;
  modelo?: string;
  matricula?: string;
  numeroSerie?: string;
  numeroChasis?: string;
  carroceria?: string;
  anio?: number;
  anioFabricacion?: number;
  anyoFabricacion?: number;
  fechaAdquisicion?: Timestamp;
  fechaAlta: Timestamp;
  fechaBaja?: Timestamp;
  estado: 'operativo' | 'en_taller' | 'averiado' | 'baja';
  ubicacionActual?: string;
  ubicacionNombre?: string;
  ubicacionDireccion?: string;
  ubicacionBase?: {
    nombre: string;
    direccion?: string;
  };
  tenantId: string;
  operadorId?: string;
  operadorNombre?: string;
  codigoOperador?: string;
  equipos: EquipoInstalado[];
  horasOperacion?: number;
  kilometraje?: number;
  kmTotales?: number;
  telemetria?: {
    tieneFms?: boolean;
    fmsConectado?: boolean;
  };
  carteleria?: {
    tiene?: boolean;
    tipo?: string;
  };
  instalacion?: {
    fase?: string;
    fechaInstalacionCompleta?: Timestamp;
  };
  contadores?: {
    totalAverias?: number;
    totalEquipos?: number;
  };
  auditoria?: {
    creadoPor?: string;
    modificadoPor?: string;
    creadoEn?: Timestamp;
    modificadoEn?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TipoActivo = Activo['tipo'];
export type EstadoActivo = Activo['estado'];

export interface UbicacionInventario {
  tipo: 'activo' | 'almacen' | 'proveedor';
  referenciaId?: string;
  descripcion: string;
}

export interface Inventario {
  id: string;
  sku: string;
  descripcion: string;
  tipo: 'componente' | 'repuesto' | 'consumible';
  categoria: string;
  fabricante: string;
  modelo: string;
  numeroSerie?: string;
  estado: EstadoInventario;
  ubicacion: UbicacionInventario;
  compatibleCon: string[];
  ultimoMovimiento: Timestamp;
  historialMovimientos: string[];
  cantidadDisponible?: number;
  cantidadMinima?: number;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MovimientoInventario {
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
  incidenciaId?: string;
  preventivoId?: string;
  observaciones?: string;
  usuarioId: string;
  tenantId: string;
  createdAt: Timestamp;
}

export interface TimestampsIncidencia {
  recepcion: Timestamp;
  inicioAnalisis?: Timestamp;
  finAnalisis?: Timestamp;
  inicioReparacion?: Timestamp;
  finReparacion?: Timestamp;
  cierre?: Timestamp;
  reapertura?: Timestamp;
}

export interface SLAIncidencia {
  tiempoAtencion?: number;
  tiempoResolucion?: number;
  fueraDeServicio?: number;
  cumpleSLA?: boolean;
  dentroTiempoAtencion?: boolean;
  dentroTiempoResolucion?: boolean;
}

export interface PruebaPostReparacion {
  descripcion: string;
  resultado: 'ok' | 'fallo' | 'parcial';
  observaciones?: string;
  fecha: Timestamp;
}

export interface MaterialUtilizado {
  inventarioId: string;
  descripcion: string;
  cantidad: number;
  tipo: 'sustituido' | 'consumido' | 'reparado';
}

export interface AccionMejora {
  descripcion: string;
  implementada: boolean;
  fechaImplementacion?: Timestamp;
}

export interface Adjunto {
  nombre: string;
  url: string;
  tipo: string;
  subidoPor: string;
  fecha: Timestamp;
}

export interface Incidencia {
  id: string;
  codigo: string;
  tipo: 'correctiva' | 'preventiva';
  criticidad: Criticidad;
  criticidadDefinidaPor: {
    operador: boolean;
    mantenimiento: boolean;
  };
  categoriaFallo: string;
  naturalezaFallo: string;
  activoPrincipalId: string;
  activoPrincipalCodigo: string;
  equiposAfectados: {
    inventarioId: string;
    descripcion: string;
  }[];
  afectaTercerosEquipos: boolean;
  equiposTercerosAfectados?: string[];
  afectaProcesos: boolean;
  procesosAfectados?: string[];
  estado: EstadoIncidencia;
  timestamps: TimestampsIncidencia;
  sla: SLAIncidencia;
  diagnostico?: string;
  causaRaiz?: string;
  solucionAplicada?: string;
  pruebasRealizadas?: PruebaPostReparacion[];
  materialesUtilizados?: MaterialUtilizado[];
  accionesMejora?: AccionMejora[];
  reportadoPor: string;
  asignadoA?: string;
  supervisadoPor?: string;
  adjuntos?: Adjunto[];
  observaciones?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TareaPreventivo {
  id: string;
  orden: number;
  descripcion: string;
  categoria: string;
  tiempoEstimado: number;
  materialesRequeridos?: string[];
  obligatoria: boolean;
}

export interface Preventivo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  periodicidad: Periodicidad;
  tipoActivo: string;
  tareas: TareaPreventivo[];
  proximaEjecucion: Timestamp;
  ultimaEjecucion?: Timestamp;
  activo: boolean;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TareaEjecutada {
  tareaId: string;
  completada: boolean;
  resultado?: 'ok' | 'anomalia' | 'no_aplica';
  observaciones?: string;
  fechaEjecucion?: Timestamp;
}

export interface EjecucionPreventivo {
  id: string;
  preventivoId: string;
  activoId: string;
  activoCodigo: string;
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada';
  fechaProgramada: Timestamp;
  fechaInicio?: Timestamp;
  fechaFin?: Timestamp;
  tareasEjecutadas: TareaEjecutada[];
  materialesUtilizados?: MaterialUtilizado[];
  incidenciaGeneradaId?: string;
  ejecutadoPor: string;
  observaciones?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CambioAuditoria {
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
}

export interface AuditLog {
  id: string;
  entidad: 'incidencia' | 'inventario' | 'activo' | 'preventivo' | 'usuario';
  entidadId: string;
  accion: 'crear' | 'actualizar' | 'eliminar' | 'cambio_estado';
  usuarioId: string;
  usuarioEmail: string;
  usuarioRol: string;
  timestamp: Timestamp;
  tenantId: string;
  ip?: string;
  userAgent?: string;
  cambios: CambioAuditoria[];
  motivoCambio?: string;
}

export interface TiemposSLA {
  atencion: number;
  resolucion: number;
}

export interface SLAConfig {
  id: string;
  tenantId: string;
  tiempos: {
    critica: TiemposSLA;
    normal: TiemposSLA;
  };
  horarioServicio: {
    inicio: string;
    fin: string;
    diasLaborables: number[];
  };
  disponibilidadObjetivo: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface SLADetalle {
  total: number;
  dentroSLA: number;
  tiempoAtencionPromedio: number;
  tiempoResolucionPromedio: number;
}

export interface DisponibilidadActivo {
  activoId: string;
  codigo: string;
  disponibilidad: number;
  horasFueraServicio: number;
}

export interface SLAMetrics {
  id: string;
  periodo: string;
  tipo: 'mensual' | 'semanal' | 'diario';
  totalIncidencias: number;
  incidenciasCriticas: number;
  incidenciasNormales: number;
  tiempoAtencionPromedio: number;
  tiempoResolucionPromedio: number;
  tiempoFueraServicioPromedio: number;
  incidenciasDentroSLA: number;
  porcentajeCumplimientoSLA: number;
  slaDetalle: {
    criticas: SLADetalle;
    normales: SLADetalle;
  };
  disponibilidadGlobal: number;
  disponibilidadPorActivo: DisponibilidadActivo[];
  tenantId: string;
  calculadoAt: Timestamp;
}

// ============================================
// TIPOS PARA FORMULARIOS
// ============================================

export type IncidenciaFormData = Omit<
  Incidencia,
  'id' | 'codigo' | 'timestamps' | 'sla' | 'createdAt' | 'updatedAt'
> & {
  timestamps?: Partial<TimestampsIncidencia>;
};

export type InventarioFormData = Omit<Inventario, 'id' | 'createdAt' | 'updatedAt' | 'historialMovimientos'>;

export type ActivoFormData = Omit<Activo, 'id' | 'createdAt' | 'updatedAt'>;

export type PreventivoFormData = Omit<Preventivo, 'id' | 'codigo' | 'createdAt' | 'updatedAt'>;

// ============================================
// TRANSICIONES DE ESTADO
// ============================================

export const TRANSICIONES_ESTADO: Record<EstadoIncidencia, EstadoIncidencia[]> = {
  nueva: ['en_analisis', 'cerrada'],
  en_analisis: ['en_intervencion', 'nueva'],
  en_intervencion: ['resuelta', 'en_analisis'],
  resuelta: ['cerrada', 'reabierta'],
  cerrada: ['reabierta'],
  reabierta: ['en_analisis'],
};

// ============================================
// LABELS PARA UI
// ============================================

export const ESTADO_LABELS: Record<EstadoIncidencia, string> = {
  nueva: 'Nueva',
  en_analisis: 'En Análisis',
  en_intervencion: 'En Intervención',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
  reabierta: 'Reabierta',
};

export const CRITICIDAD_LABELS: Record<Criticidad, string> = {
  critica: 'Crítica',
  normal: 'Normal',
};

export const TIPO_ACTIVO_LABELS: Record<TipoActivo, string> = {
  autobus: 'Autobús',
  equipo_taller: 'Equipo de taller',
  infraestructura: 'Infraestructura',
};

export const ESTADO_ACTIVO_LABELS: Record<EstadoActivo, string> = {
  operativo: 'Operativo',
  en_taller: 'En taller',
  averiado: 'Averiado',
  baja: 'Baja',
};

export const ESTADO_INVENTARIO_LABELS: Record<EstadoInventario, string> = {
  instalado: 'Instalado',
  almacen: 'En Almacén',
  reparacion: 'En Reparación',
  baja: 'Baja',
};

export const PERIODICIDAD_LABELS: Record<Periodicidad, string> = {
  '3M': 'Trimestral (3 meses)',
  '6M': 'Semestral (6 meses)',
  '1A': 'Anual',
  '2A': 'Bianual',
};

// ============================================
// CATEGORÍAS PREDEFINIDAS
// ============================================

export const CATEGORIAS_FALLO = [
  'Hardware',
  'Software',
  'Conectividad',
  'Alimentación',
  'Mecánico',
  'Vandalismo',
  'Otro',
];

export const CATEGORIAS_INVENTARIO = [
  'SAE',
  'Validadoras',
  'Cámaras',
  'Pantallas',
  'Routers',
  'Antenas',
  'Sensores',
  'Cableado',
  'Otro',
];

// Alias usado en algunas pantallas
export const CATEGORIA_INVENTARIO_LABELS: Record<string, string> = CATEGORIAS_INVENTARIO.reduce(
  (acc, cat) => {
    acc[cat] = cat;
    return acc;
  },
  {} as Record<string, string>
);

// ============================================
// FASE 1 - MODELO DE DATOS (AMPLIACIÓN)
// Nota: Se añaden entidades nuevas sin romper las existentes.
// ============================================

// ----------------------------
// Tipos auxiliares reutilizables
// ----------------------------

/** Coordenadas geográficas (WGS84). */
export interface Coordenadas {
  /** Latitud en grados decimales. */
  lat: number;
  /** Longitud en grados decimales. */
  lng: number;
}

/** Dirección postal con campos opcionales y coordenadas. */
export interface Direccion {
  /** Calle y número (línea principal). */
  linea1: string;
  /** Información adicional: portal/piso/puerta, etc. */
  linea2?: string;
  /** Código postal. */
  codigoPostal?: string;
  /** Municipio o localidad. */
  municipio?: string;
  /** Provincia. */
  provincia?: string;
  /** Comunidad/Región. */
  region?: string;
  /** País. */
  pais?: string;
  /** Coordenadas (si se dispone). */
  coordenadas?: Coordenadas;
}

/** Datos de contacto reutilizables. */
export interface Contacto {
  /** Nombre completo de la persona de contacto. */
  nombre: string;
  /** Teléfono principal. */
  telefono?: string;
  /** Email principal. */
  email?: string;
}

/** Metadatos de auditoría estándar. */
export interface Auditoria {
  /** UID del usuario que creó el documento. */
  creadoPor?: string;
  /** UID del usuario que actualizó el documento por última vez. */
  actualizadoPor?: string;
  /** Timestamp de creación. */
  createdAt: FirestoreTimestamp;
  /** Timestamp de última actualización. */
  updatedAt: FirestoreTimestamp;
}

/** Marca/modelo/firmware común para equipos. */
export interface DatosEquipoTecnicos {
  /** Marca (fabricante comercial). */
  marca?: string;
  /** Modelo (referencia del fabricante). */
  modelo?: string;
  /** Versión de firmware/software instalada. */
  firmware?: string;
}

/** Datos de red (solo cuando aplica). */
export interface DatosRed {
  /** Dirección IP (IPv4/IPv6) si aplica. */
  ip?: string;
  /** Dirección MAC si aplica. */
  mac?: string;
}

/** Datos de SIM/telefónica (solo cuando aplica). */
export interface DatosSIM {
  /** ICCID de la SIM. */
  iccid?: string;
  /** Número de teléfono asociado a la SIM. */
  telefono?: string;
  /** Operador de telefonía (nombre o código). */
  operador?: string;
}

/**
 * Licencia asociada a un equipo.
 * Se modela como lista para permitir múltiples licencias por equipo.
 */
export interface LicenciaEquipo {
  /** Nombre/tipo de licencia (p.ej. "SaaS", "Mapas", "MDM"). */
  nombre: string;
  /** Clave/identificador de licencia (si aplica). */
  clave?: string;
  /** Fecha de expiración si aplica. */
  fechaFin?: FirestoreTimestamp;
}

// ----------------------------
// 1. Operador
// ----------------------------

/** Operador (empresa concesionaria / explotadora). */
export interface Operador {
  /** ID del operador (documentId). */
  id: DocumentId;
  /** Código numérico del operador (para integraciones/reporting). */
  codigoNumerico: number;
  /** Nombre del operador. */
  nombre: string;
  /** Persona de contacto principal. */
  contacto: Contacto;
  /** Dirección de la cochera/base del operador. */
  direccionCochera: Direccion;
  /** Indica si dispone de almacén propio. */
  tieneAlmacenPropio: boolean;
  /** Indica si el operador está activo. */
  activo: boolean;
  /** Fecha de alta del operador. */
  fechaAlta: FirestoreTimestamp;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar un operador (sin auditoría). */
export type OperadorFormData = Omit<Operador, 'id' | 'auditoria'>;

// ----------------------------
// 2. Ubicación
// ----------------------------

export const TIPOS_UBICACION = {
  ALMACEN_WINFIN: 'almacen_winfin',
  ALMACEN_OPERADOR: 'almacen_operador',
  LABORATORIO: 'laboratorio',
} as const;

/** Tipo de ubicación física. */
export type TipoUbicacion = (typeof TIPOS_UBICACION)[keyof typeof TIPOS_UBICACION];

/** Ubicación física (almacenes y laboratorios). */
export interface Ubicacion {
  /** ID de la ubicación (documentId). */
  id: DocumentId;
  /** Tipo de ubicación. */
  tipo: TipoUbicacion;
  /** Código interno/corto de la ubicación. */
  codigo: string;
  /** Nombre descriptivo. */
  nombre: string;
  /** Operador asociado (si aplica). */
  operadorId?: DocumentId;
  /** Laboratorio asociado (si aplica). */
  laboratorioId?: DocumentId;
  /** Dirección completa. */
  direccion: Direccion;
  /** Indica si la ubicación es punto de stock. */
  esPuntoStock: boolean;
  /** Indica si está activa. */
  activo: boolean;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar una ubicación (sin auditoría). */
export type UbicacionFormData = Omit<Ubicacion, 'id' | 'auditoria'>;

// ----------------------------
// 3. Laboratorio
// ----------------------------

export const TIPOS_LABORATORIO = {
  INTERNO: 'interno',
  FABRICANTE: 'fabricante',
} as const;

/** Tipo de laboratorio/SAT. */
export type TipoLaboratorio = (typeof TIPOS_LABORATORIO)[keyof typeof TIPOS_LABORATORIO];

/** Laboratorio (SAT interno o externo). */
export interface Laboratorio {
  /** ID del laboratorio (documentId). */
  id: DocumentId;
  /** Tipo de laboratorio. */
  tipo: TipoLaboratorio;
  /** Nombre del laboratorio/SAT. */
  nombre: string;
  /** Datos de contacto. */
  contacto: Contacto;
  /** Dirección del laboratorio (si aplica). */
  direccion?: Direccion;
  /** Tipos de equipo que repara (referencias a `TipoEquipo.id` o códigos). */
  tiposEquipoReparables: string[];
  /** Tiempo medio de reparación (en horas) para cálculos SLA. */
  slaTiempoMedioReparacionHoras?: number;
  /** Indica si está activo. */
  activo: boolean;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar un laboratorio (sin auditoría). */
export type LaboratorioFormData = Omit<Laboratorio, 'id' | 'auditoria'>;

// ----------------------------
// 4. Tipo de Equipo
// ----------------------------

/** Configuración de campos opcionales por tipo de equipo. */
export interface ConfigCamposTipoEquipo {
  /** Si aplica número de serie de fabricante. */
  numeroSerie: boolean;
  /** Si aplica IP. */
  ip: boolean;
  /** Si aplica SIM. */
  sim: boolean;
  /** Si aplica licencia. */
  licencia: boolean;
  /** Si aplica teléfono (MSISDN). */
  telefono: boolean;
  /** Si aplica MAC. */
  mac: boolean;
}

/** Valores por defecto sugeridos por tipo. */
export interface DefaultsTipoEquipo {
  /** Cantidad típica instalada por autobús. */
  cantidadTipicaPorBus?: number;
  /** Lista de fabricantes habituales para el tipo. */
  fabricantesHabituales?: string[];
}

/** Configuración de mantenimiento del tipo. */
export interface MantenimientoTipoEquipo {
  /** Vida útil estimada en meses. */
  vidaUtilMeses?: number;
  /** Intervalo de revisión preventiva en meses. */
  intervaloRevisionMeses?: number;
}

/** Configuración de SAT por defecto. */
export interface SatTipoEquipo {
  /** Laboratorio por defecto (si existe). */
  laboratorioDefectoId?: DocumentId;
}

/** Tipo de equipo (catálogo). */
export interface TipoEquipo {
  /** ID del tipo de equipo (documentId). */
  id: DocumentId;
  /** Código base para generar código interno (p.ej. "SAE", "CAM"). */
  codigo: string;
  /** Nombre del tipo de equipo. */
  nombre: string;
  /** Categoría funcional (p.ej. "Conectividad", "Cartelería"). */
  categoria: string;
  /** Configuración de campos que aplican. */
  campos: ConfigCamposTipoEquipo;
  /** Valores por defecto y ayudas de UI. */
  defaults?: DefaultsTipoEquipo;
  /** Parámetros de mantenimiento. */
  mantenimiento?: MantenimientoTipoEquipo;
  /** SAT/laboratorio recomendado. */
  sat?: SatTipoEquipo;
  /** Indica si está activo. */
  activo: boolean;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar un tipo de equipo (sin auditoría). */
export type TipoEquipoFormData = Omit<TipoEquipo, 'id' | 'auditoria'>;

// ----------------------------
// 5. Equipo (entidad central)
// ----------------------------

export const TIPOS_UBICACION_EQUIPO = {
  AUTOBUS: 'autobus',
  UBICACION: 'ubicacion',
  LABORATORIO: 'laboratorio',
} as const;

/** Tipo de ubicación actual de un equipo. */
export type TipoUbicacionEquipo = (typeof TIPOS_UBICACION_EQUIPO)[keyof typeof TIPOS_UBICACION_EQUIPO];

/** Ubicación actual de un equipo (normalizada). */
export interface UbicacionActualEquipo {
  /** Tipo de ubicación. */
  tipo: TipoUbicacionEquipo;
  /** ID del destino (autobús/ubicación/laboratorio). */
  id: DocumentId;
  /** Nombre/código denormalizado para UI. */
  nombre: string;
  /** Posición en el autobús (si aplica). */
  posicionEnBus?: string;
}

export const ESTADOS_EQUIPO = {
  EN_SERVICIO: 'en_servicio',
  EN_ALMACEN: 'en_almacen',
  EN_LABORATORIO: 'en_laboratorio',
  AVERIADO: 'averiado',
  BAJA: 'baja',
} as const;

/** Estado actual del equipo. */
export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[keyof typeof ESTADOS_EQUIPO];

/** Propiedad del equipo (actualmente siempre DFG). */
export interface PropiedadEquipo {
  /** Propietario lógico del equipo. */
  propietario: 'DFG';
  /** Operador asignado actualmente (si aplica). */
  operadorAsignadoId?: DocumentId;
}

/** Fechas relevantes del ciclo de vida de un equipo. */
export interface FechasEquipo {
  /** Fecha de alta en sistema. */
  alta: FirestoreTimestamp;
  /** Fecha de instalación actual (si está instalado). */
  instalacionActual?: FirestoreTimestamp;
  /** Fecha de última revisión preventiva. */
  ultimaRevision?: FirestoreTimestamp;
  /** Fecha de baja definitiva. */
  baja?: FirestoreTimestamp;
}

/** Garantía del equipo. */
export interface GarantiaEquipo {
  /** Indica si está en garantía. */
  enGarantia: boolean;
  /** Fecha fin de garantía (si se conoce). */
  fechaFin?: FirestoreTimestamp;
}

/** Estadísticas desnormalizadas del equipo. */
export interface EstadisticasEquipo {
  /** Total de averías/incidencias asociadas (contador). */
  totalAverias: number;
  /** Total de movimientos registrados (contador). */
  totalMovimientos: number;
  /** Días acumulados en servicio (aprox). */
  diasEnServicio?: number;
}

/** Equipo instalado o gestionado por el sistema. */
export interface Equipo {
  /** ID del equipo (documentId). */
  id: DocumentId;
  /** Código interno generado (p.ej. "SAE-000123"). */
  codigoInterno: string;
  /** Número de serie del fabricante (si aplica). */
  numeroSerieFabricante?: string;
  /** ID del tipo de equipo. */
  tipoEquipoId: DocumentId;
  /** Nombre del tipo (denormalizado para UI). */
  tipoEquipoNombre?: string;
  /** Características técnicas. */
  caracteristicas?: DatosEquipoTecnicos;
  /** Datos de red (solo si aplica). */
  red?: DatosRed;
  /** Datos SIM/telefonía (solo si aplica). */
  sim?: DatosSIM;
  /** Licencias asociadas (solo si aplica). */
  licencias?: LicenciaEquipo[];
  /** Propiedad y asignación. */
  propiedad: PropiedadEquipo;
  /** Ubicación actual del equipo. */
  ubicacionActual: UbicacionActualEquipo;
  /** Estado actual del equipo. */
  estado: EstadoEquipo;
  /** Fechas clave del ciclo de vida. */
  fechas: FechasEquipo;
  /** Garantía. */
  garantia?: GarantiaEquipo;
  /** Estadísticas desnormalizadas. */
  estadisticas: EstadisticasEquipo;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
  /** Términos para búsqueda full-text. */
  searchTerms: string[];
}

/** Datos de formulario para crear/editar un equipo (sin auditoría ni contadores). */
export type EquipoFormData = Omit<Equipo, 'id' | 'auditoria' | 'estadisticas' | 'searchTerms'>;

// ----------------------------
// 6. Movimiento de Equipo
// ----------------------------

export const TIPOS_MOVIMIENTO_EQUIPO = {
  ALTA: 'alta',
  PREINSTALACION: 'pre_instalacion',
  INSTALACION: 'instalacion',
  SUSTITUCION: 'sustitucion',
  RETIRADA_AVERIA: 'retirada_por_averia',
  RETORNO_LABORATORIO: 'retorno_de_laboratorio',
  REUBICACION: 'reubicacion',
  BAJA: 'baja',
} as const;

/** Tipo de movimiento de un equipo. */
export type TipoMovimientoEquipo = (typeof TIPOS_MOVIMIENTO_EQUIPO)[keyof typeof TIPOS_MOVIMIENTO_EQUIPO];

/** Snapshot de ubicación para trazabilidad de movimientos. */
export interface UbicacionMovimientoEquipo {
  /** Tipo de ubicación. */
  tipo: TipoUbicacionEquipo;
  /** ID de la entidad origen/destino. */
  id: DocumentId;
  /** Nombre/código denormalizado. */
  nombre: string;
  /** Posición en bus si aplica. */
  posicionEnBus?: string;
}

/** Movimiento/trazabilidad del equipo. */
export interface MovimientoEquipo {
  /** ID del movimiento (documentId). */
  id: DocumentId;
  /** ID del equipo. */
  equipoId: DocumentId;
  /** Código interno del equipo (denormalizado). */
  equipoCodigoInterno: string;
  /** Fecha/hora del movimiento. */
  fecha: FirestoreTimestamp;
  /** Origen del movimiento. */
  origen: UbicacionMovimientoEquipo;
  /** Destino del movimiento. */
  destino: UbicacionMovimientoEquipo;
  /** Tipo de movimiento. */
  tipoMovimiento: TipoMovimientoEquipo;
  /** Motivo descriptivo (texto libre). */
  motivo?: string;
  /** OT relacionada (si aplica). */
  otId?: DocumentId;
  /** Incidencia relacionada (si aplica). */
  incidenciaId?: DocumentId;
  /** Técnicos que realizaron el movimiento (UIDs). */
  tecnicosIds?: DocumentId[];
  /** Comentarios adicionales. */
  comentarios?: string;
  /** Fotos/adjuntos del movimiento. */
  fotos?: Adjunto[];
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para registrar un movimiento (sin auditoría). */
export type MovimientoEquipoFormData = Omit<MovimientoEquipo, 'id' | 'auditoria'>;

// ----------------------------
// 7. Autobús
// ----------------------------

export const ESTADOS_AUTOBUS = {
  OPERATIVO: 'operativo',
  EN_TALLER: 'en_taller',
  BAJA: 'baja',
} as const;

/** Estado del autobús. */
export type EstadoAutobus = (typeof ESTADOS_AUTOBUS)[keyof typeof ESTADOS_AUTOBUS];

export const FASES_INSTALACION = {
  PENDIENTE: 'pendiente',
  PREINSTALACION: 'pre_instalacion',
  COMPLETA: 'completa',
} as const;

/** Fase de instalación de equipos en el autobús. */
export type FaseInstalacion = (typeof FASES_INSTALACION)[keyof typeof FASES_INSTALACION];

/** Información de telemetría/FMS. */
export interface TelemetriaAutobus {
  /** Indica si el bus tiene FMS instalado. */
  tieneFms: boolean;
  /** Indica si FMS está conectado (estado actual). */
  fmsConectado?: boolean;
}

/** Información de cartelería del bus. */
export interface CarteleriaAutobus {
  /** Indica si el bus tiene cartelería. */
  tiene: boolean;
  /** Tipo de cartelería (texto libre o catálogo). */
  tipo?: string;
}

/** Datos de instalación del bus (fechas y técnicos). */
export interface InstalacionAutobus {
  /** Fase de instalación. */
  fase: FaseInstalacion;
  /** Fecha de pre-instalación (si aplica). */
  fechaPreinstalacion?: FirestoreTimestamp;
  /** Fecha de instalación completa (si aplica). */
  fechaInstalacionCompleta?: FirestoreTimestamp;
  /** Técnicos (UIDs) que participaron. */
  tecnicosIds?: DocumentId[];
}

/** Contadores desnormalizados del bus. */
export interface ContadoresAutobus {
  /** Total de equipos instalados/gestionados. */
  totalEquipos: number;
  /** Total de averías/incidencias asociadas. */
  totalAverias: number;
}

/** Autobús (vehículo). */
export interface Autobus {
  /** ID del autobús (documentId). */
  id: DocumentId;
  /** Código interno de flota. */
  codigo: string;
  /** Matrícula. */
  matricula: string;
  /** Número de chasis/VIN. */
  numeroChasis?: string;
  /** Marca del vehículo. */
  marca?: string;
  /** Modelo del vehículo. */
  modelo?: string;
  /** Carrocería. */
  carroceria?: string;
  /** Año del vehículo. */
  anio?: number;
  /** Operador asignado. */
  operadorId: DocumentId;
  /** Estado del bus. */
  estado: EstadoAutobus;
  /** Telemetría (FMS). */
  telemetria?: TelemetriaAutobus;
  /** Cartelería. */
  carteleria?: CarteleriaAutobus;
  /** Datos de instalación. */
  instalacion?: InstalacionAutobus;
  /** Contadores desnormalizados. */
  contadores: ContadoresAutobus;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar un autobús (sin auditoría ni contadores). */
export type AutobusFormData = Omit<Autobus, 'id' | 'auditoria' | 'contadores'>;

// ----------------------------
// 8. Técnico
// ----------------------------

export const ESTADOS_TECNICO = {
  ACTIVO: 'activo',
  VACACIONES: 'vacaciones',
  BAJA_TEMPORAL: 'baja_temporal',
  BAJA_DEFINITIVA: 'baja_definitiva',
} as const;

/** Estado laboral del técnico. */
export type EstadoTecnico = (typeof ESTADOS_TECNICO)[keyof typeof ESTADOS_TECNICO];

/** Estadísticas desnormalizadas del técnico. */
export interface EstadisticasTecnico {
  /** Total de OTs completadas. */
  otsCompletadas: number;
  /** Tiempo medio de resolución (minutos). */
  tiempoMedioResolucionMinutos?: number;
}

/** Técnico (perfil profesional vinculado a Firebase Auth). */
export interface Tecnico {
  /** UID de Firebase Auth (documentId). */
  id: DocumentId;
  /** Nombre. */
  nombre: string;
  /** Apellidos. */
  apellidos: string;
  /** Nombre corto (para UI). */
  nombreCorto?: string;
  /** Contacto del técnico. */
  contacto?: Contacto;
  /** Código de empleado interno. */
  codigoEmpleado?: string;
  /** Fecha de alta. */
  fechaAlta: FirestoreTimestamp;
  /** Especialidades (texto o catálogo). */
  especialidades?: string[];
  /** Certificaciones (texto o catálogo). */
  certificaciones?: string[];
  /** Zona de trabajo principal (id de `Ubicacion` u operador). */
  zonaPrincipalId?: DocumentId;
  /** Zonas secundarias. */
  zonasSecundariasIds?: DocumentId[];
  /** Estado del técnico. */
  estado: EstadoTecnico;
  /** Coste/hora interno (solo para WINFIN; controlar por permisos en UI/API). */
  costeHoraInterno?: number;
  /** Estadísticas desnormalizadas. */
  estadisticas: EstadisticasTecnico;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar un técnico (sin auditoría ni contadores). */
export type TecnicoFormData = Omit<Tecnico, 'id' | 'auditoria' | 'estadisticas'>;

// ----------------------------
// 9. Incidencia (ampliación)
// ----------------------------

export const ORIGEN_INCIDENCIA = {
  TELEFONO: 'telefono',
  EMAIL: 'email',
  APP: 'app',
  OTRO: 'otro',
} as const;

/** Canal/origen de reporte de una incidencia. */
export type OrigenIncidenciaCanal = (typeof ORIGEN_INCIDENCIA)[keyof typeof ORIGEN_INCIDENCIA];

/** Detalle del origen del reporte de incidencia. */
export interface OrigenIncidencia {
  /** UID de quien reporta (usuario o contacto externo). */
  reportadoPorId?: DocumentId;
  /** Nombre de quien reporta (cuando no hay UID). */
  reportadoPorNombre?: string;
  /** Canal de entrada. */
  canal: OrigenIncidenciaCanal;
}

// Declaración merging: añade campos opcionales a la interfaz existente `Incidencia`.
export interface Incidencia {
  /** Origen del reporte (quién reporta y cómo). */
  origen?: OrigenIncidencia;
  /** ID de la OT generada/relacionada (si existe). */
  ordenTrabajoId?: DocumentId;
  /** IDs de equipos afectados (modelo nuevo; opcional por compatibilidad). */
  equiposAfectadosIds?: DocumentId[];
  /** ID de autobús afectado (modelo nuevo; opcional por compatibilidad). */
  autobusId?: DocumentId;
}

// ----------------------------
// 10. Orden de Trabajo (OT)
// ----------------------------

export const TIPOS_OT = {
  CORRECTIVO_URGENTE: 'correctivo_urgente',
  CORRECTIVO_PROGRAMADO: 'correctivo_programado',
  PREVENTIVO: 'preventivo',
} as const;

/** Tipo de orden de trabajo. */
export type TipoOT = (typeof TIPOS_OT)[keyof typeof TIPOS_OT];

export const ESTADOS_OT = {
  PENDIENTE: 'pendiente',
  ASIGNADA: 'asignada',
  EN_CURSO: 'en_curso',
  COMPLETADA: 'completada',
  VALIDADA: 'validada',
  RECHAZADA: 'rechazada',
} as const;

/** Estado del workflow de una OT. */
export type EstadoOT = (typeof ESTADOS_OT)[keyof typeof ESTADOS_OT];

/** Material usado en una OT (con coste). */
export interface MaterialOT {
  /** ID del inventario/material. */
  inventarioId: DocumentId;
  /** Descripción denormalizada. */
  descripcion: string;
  /** Cantidad utilizada. */
  cantidad: number;
  /** Precio unitario (si aplica). */
  precioUnitario?: number;
  /** Tipo de uso (consumido/sustituido/reparado). */
  tipo: 'sustituido' | 'consumido' | 'reparado';
}

/** Tiempos de ejecución de una OT. */
export interface TiemposOT {
  /** Minutos de desplazamiento. */
  desplazamientoMinutos?: number;
  /** Minutos de intervención. */
  intervencionMinutos?: number;
}

/** Planificación de una OT. */
export interface PlanificacionOT {
  /** Fecha prevista. */
  fechaPrevista?: FirestoreTimestamp;
  /** Materiales previstos (ids). */
  materialesPrevistosIds?: DocumentId[];
}

/** Ejecución real de una OT. */
export interface EjecucionOT {
  /** Fecha/hora inicio real. */
  fechaInicioReal?: FirestoreTimestamp;
  /** Fecha/hora fin real. */
  fechaFinReal?: FirestoreTimestamp;
  /** Tiempos medidos. */
  tiempos?: TiemposOT;
}

/** Documentación de la OT. */
export interface DocumentacionOT {
  /** Trabajos realizados (texto libre). */
  trabajosRealizados?: string;
  /** Materiales usados con precios. */
  materialesUsados?: MaterialOT[];
  /** Fotos/adjuntos. */
  fotos?: Adjunto[];
  /** Firma del operador (URL/metadata). */
  firmaOperadorUrl?: string;
}

/** Costes calculados de la OT. */
export interface CostesOT {
  /** Coste total calculado. */
  total?: number;
  /** Coste de mano de obra. */
  manoObra?: number;
  /** Coste de materiales. */
  materiales?: number;
  /** Coste de desplazamiento. */
  desplazamiento?: number;
}

/** Facturación de la OT. */
export interface FacturacionOT {
  /** Indica si es facturable. */
  facturable: boolean;
  /** Identificador de factura asociada (si aplica). */
  facturaId?: DocumentId;
}

/** Orden de trabajo. */
export interface OrdenTrabajo {
  /** ID de la OT (documentId). */
  id: DocumentId;
  /** Código automático: "OT-YYYY-NNNNN". */
  codigo: string;
  /** Origen de la OT (incidencia o preventivo). */
  origen: 'incidencia' | 'preventivo';
  /** ID de incidencia origen (si aplica). */
  incidenciaId?: DocumentId;
  /** ID de preventivo origen (si aplica). */
  preventivoId?: DocumentId;
  /** Tipo de OT. */
  tipo: TipoOT;
  /** Criticidad y SLA aplicable. */
  criticidad?: Criticidad;
  /** Operador asignado. */
  operadorId?: DocumentId;
  /** Autobús asignado/afectado. */
  autobusId?: DocumentId;
  /** Equipos afectados. */
  equiposIds?: DocumentId[];
  /** Técnico asignado principal. */
  tecnicoId?: DocumentId;
  /** Planificación. */
  planificacion?: PlanificacionOT;
  /** Ejecución real. */
  ejecucion?: EjecucionOT;
  /** Documentación. */
  documentacion?: DocumentacionOT;
  /** Costes calculados. */
  costes?: CostesOT;
  /** Facturación. */
  facturacion: FacturacionOT;
  /** Estado actual. */
  estado: EstadoOT;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar una OT (sin auditoría ni cálculos). */
export type OrdenTrabajoFormData = Omit<OrdenTrabajo, 'id' | 'auditoria' | 'costes' | 'codigo'>;

// ----------------------------
// 11. Contrato
// ----------------------------

export const TIPOS_CONTRATO = {
  FIJO: 'fijo',
  VARIABLE: 'variable',
  MIXTO: 'mixto',
} as const;

/** Tipo de contrato. */
export type TipoContrato = (typeof TIPOS_CONTRATO)[keyof typeof TIPOS_CONTRATO];

/** Tarifas para contrato fijo. */
export interface TarifasFijo {
  /** Importe por bus/mes. */
  importePorBusMes: number;
}

/** Tarifas para contrato variable. */
export interface TarifasVariable {
  /** Precio/hora de desplazamiento. */
  horaDesplazamiento: number;
  /** Precio/hora de intervención. */
  horaIntervencion: number;
  /** Margen de materiales (p.ej. 0.2 = 20%). */
  margenMateriales: number;
  /** Mínimo por salida/actuación. */
  minimoPorSalida?: number;
}

/** SLAs máximos por criticidad (en horas). */
export interface SLAContrato {
  /** Horas máximas para criticidad crítica. */
  criticaHoras: number;
  /** Horas máximas para criticidad normal. */
  normalHoras: number;
}

/** Contrato entre WINFIN/DFG y un operador. */
export interface Contrato {
  /** ID del contrato (documentId). */
  id: DocumentId;
  /** Código del contrato. */
  codigo: string;
  /** Operador asociado. */
  operadorId: DocumentId;
  /** Tipo de contrato. */
  tipo: TipoContrato;
  /** Fecha inicio de vigencia. */
  fechaInicio: FirestoreTimestamp;
  /** Fecha fin de vigencia. */
  fechaFin?: FirestoreTimestamp;
  /** Tarifas (según tipo). */
  tarifas?: {
    fijo?: TarifasFijo;
    variable?: TarifasVariable;
  };
  /** SLAs por criticidad. */
  slas: SLAContrato;
  /** Tipos de equipo cubiertos (ids/códigos). */
  tiposEquipoCubiertos?: string[];
  /** Exclusiones (texto libre). */
  exclusiones?: string[];
  /** Documento adjunto (URL). */
  documentoUrl?: string;
  /** Metadatos de auditoría. */
  auditoria: Auditoria;
}

/** Datos de formulario para crear/editar un contrato (sin auditoría). */
export type ContratoFormData = Omit<Contrato, 'id' | 'auditoria'>;

// ----------------------------
// 12. Preventivo (ampliación)
// ----------------------------

/** Historial de ejecuciones simplificado (para lista rápida). */
export interface PreventivoHistorialItem {
  /** ID de la ejecución. */
  ejecucionId: DocumentId;
  /** Fecha de ejecución. */
  fecha: FirestoreTimestamp;
  /** Resultado/resumen. */
  resultado?: 'ok' | 'anomalia' | 'cancelada';
  /** Incidencia generada (si aplica). */
  incidenciaGeneradaId?: DocumentId;
}

// Declaración merging: añade campos opcionales a la interfaz existente `Preventivo`.
export interface Preventivo {
  /** Tipo de activo al que aplica en el modelo ampliado (sin colisionar con `tipoActivo: string`). */
  aplicaA?: 'autobus' | 'equipo';
  /** Checklist/plantilla (alias semántico de `tareas` cuando proceda). */
  checklist?: TareaPreventivo[];
  /** Historial de ejecuciones (últimas N). */
  historialEjecuciones?: PreventivoHistorialItem[];
}

// ============================================
// 13. FACTURACIÓN
// ============================================

export const ESTADOS_FACTURA = {
  BORRADOR: 'borrador',
  PENDIENTE: 'pendiente',
  ENVIADA: 'enviada',
  PAGADA: 'pagada',
  ANULADA: 'anulada',
} as const;

export type EstadoFactura = (typeof ESTADOS_FACTURA)[keyof typeof ESTADOS_FACTURA];

/** Línea individual de una factura */
export interface LineaFactura {
  /** ID de la OT asociada */
  otId: DocumentId;
  /** Código de la OT */
  codigoOT: string;
  /** Descripción del trabajo */
  descripcion: string;
  /** Tipo de trabajo (correctivo/preventivo) */
  tipoTrabajo: 'correctivo' | 'preventivo';
  /** Horas de mano de obra */
  horasManoObra: number;
  /** Coste hora */
  costeHora: number;
  /** Subtotal mano de obra */
  subtotalManoObra: number;
  /** Materiales utilizados */
  materiales: {
    itemId: DocumentId;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  /** Subtotal materiales */
  subtotalMateriales: number;
  /** Total línea */
  totalLinea: number;
  /** Fecha de la OT */
  fechaOT: FirestoreTimestamp;
}

/** Factura generada */
export interface Factura {
  /** ID de la factura */
  id: DocumentId;
  /** Número/código de factura */
  numero: string;
  /** Operador al que se factura */
  operadorId: DocumentId;
  /** Nombre del operador */
  operadorNombre: string;
  /** Contrato asociado */
  contratoId: DocumentId;
  /** Período de facturación */
  periodo: {
    desde: FirestoreTimestamp;
    hasta: FirestoreTimestamp;
  };
  /** Líneas de la factura */
  lineas: LineaFactura[];
  /** Subtotal antes de impuestos */
  subtotal: number;
  /** Porcentaje IVA */
  porcentajeIVA: number;
  /** Importe IVA */
  importeIVA: number;
  /** Total factura */
  total: number;
  /** Estado de la factura */
  estado: EstadoFactura;
  /** Fecha de emisión */
  fechaEmision?: FirestoreTimestamp;
  /** Fecha de vencimiento */
  fechaVencimiento?: FirestoreTimestamp;
  /** Fecha de pago */
  fechaPago?: FirestoreTimestamp;
  /** Observaciones */
  observaciones?: string;
  /** Documento PDF generado (URL) */
  documentoUrl?: string;
  /** Auditoría */
  auditoria: Auditoria;
}

/** Datos para crear/editar factura */
export type FacturaFormData = Omit<Factura, 'id' | 'auditoria'>;

// ============================================
// 14. CONFIGURACIÓN DEL SISTEMA
// ============================================

/** Operador/Empresa de transporte */
export interface Operador {
  /** ID del operador */
  id: DocumentId;
  /** Código único */
  codigo: string;
  /** Nombre comercial */
  nombre: string;
  /** Razón social */
  razonSocial: string;
  /** CIF/NIF */
  cif: string;
  /** Dirección fiscal */
  direccion: {
    calle: string;
    ciudad: string;
    codigoPostal: string;
    provincia: string;
  };
  /** Contacto principal */
  contacto: {
    nombre: string;
    email: string;
    telefono: string;
  };
  /** Activo/Inactivo */
  activo: boolean;
  /** Logo (URL) */
  logoUrl?: string;
  /** Fecha de alta */
  fechaAlta: FirestoreTimestamp;
  /** Auditoría */
  auditoria: Auditoria;
}

/** Ubicación/Almacén */
export interface Ubicacion {
  /** ID de la ubicación */
  id: DocumentId;
  /** Código único */
  codigo: string;
  /** Nombre de la ubicación */
  nombre: string;
  /** Tipo de ubicación */
  tipo: 'almacen' | 'taller' | 'laboratorio' | 'cochera';
  /** Operador propietario (opcional) */
  operadorId?: DocumentId;
  /** Dirección */
  direccion?: {
    calle: string;
    ciudad: string;
    codigoPostal: string;
  };
  /** Capacidad (para almacenes) */
  capacidad?: number;
  /** Activo */
  activo: boolean;
  /** Auditoría */
  auditoria: Auditoria;
}

/** Laboratorio de reparación */
export interface Laboratorio {
  /** ID del laboratorio */
  id: DocumentId;
  /** Código único */
  codigo: string;
  /** Nombre */
  nombre: string;
  /** Especialidades */
  especialidades: string[];
  /** Contacto */
  contacto: {
    nombre: string;
    email: string;
    telefono: string;
  };
  /** Tiempo medio de reparación (días) */
  tiempoMedioReparacion?: number;
  /** Activo */
  activo: boolean;
  /** Auditoría */
  auditoria: Auditoria;
}

/** Tipo de equipo configurable */
export interface TipoEquipoConfig {
  /** ID */
  id: DocumentId;
  /** Código */
  codigo: string;
  /** Nombre */
  nombre: string;
  /** Descripción */
  descripcion?: string;
  /** Categoría */
  categoria: 'telemetria' | 'validacion' | 'video' | 'informacion' | 'otro';
  /** Campos personalizados */
  camposPersonalizados?: {
    nombre: string;
    tipo: 'texto' | 'numero' | 'fecha' | 'booleano' | 'seleccion';
    opciones?: string[];
    requerido?: boolean;
  }[];
  /** Activo */
  activo: boolean;
  /** Auditoría */
  auditoria: Auditoria;
}

/** Parámetros globales del sistema */
export interface ParametrosSistema {
  /** ID del documento (singleton) */
  id: 'config';
  /** IVA por defecto */
  ivaPorDefecto: number;
  /** Coste hora por defecto */
  costeHoraPorDefecto: number;
  /** Días para vencimiento de factura */
  diasVencimientoFactura: number;
  /** Prefijo para códigos de factura */
  prefijoFactura: string;
  /** Siguiente número de factura */
  siguienteNumeroFactura: number;
  /** Prefijo para códigos de OT */
  prefijoOT: string;
  /** Siguiente número de OT */
  siguienteNumeroOT: number;
  /** Email de notificaciones */
  emailNotificaciones?: string;
  /** Logo de la empresa */
  logoUrl?: string;
  /** Última actualización */
  updatedAt: FirestoreTimestamp;
}

/** Log de auditoría del sistema */
export interface LogAuditoria {
  /** ID del log */
  id: DocumentId;
  /** Timestamp */
  timestamp: FirestoreTimestamp;
  /** Usuario que realizó la acción */
  usuarioId: DocumentId;
  /** Email del usuario */
  usuarioEmail: string;
  /** Nombre del usuario */
  usuarioNombre: string;
  /** Acción realizada */
  accion: 'crear' | 'editar' | 'eliminar' | 'login' | 'logout' | 'exportar' | 'importar' | 'configurar';
  /** Entidad afectada */
  entidad: string;
  /** ID de la entidad */
  entidadId?: DocumentId;
  /** Descripción */
  descripcion: string;
  /** Datos anteriores (para ediciones) */
  datosAnteriores?: Record<string, unknown>;
  /** Datos nuevos */
  datosNuevos?: Record<string, unknown>;
  /** IP del cliente */
  ip?: string;
  /** User Agent */
  userAgent?: string;
}

// ============================================
// TIPOS PARA IMPORTACIÓN DE DATOS
// ============================================

/** Estado de validación de una fila */
export type EstadoValidacion = 'valido' | 'advertencia' | 'error' | 'duplicado';

/** Error de validación */
export interface ErrorValidacion {
  columna: string;
  mensaje: string;
  valor?: unknown;
  tipo: 'error' | 'advertencia';
}

/** Fila procesada de Excel */
export interface FilaImportacion<T = Record<string, unknown>> {
  /** Número de fila en Excel (1-indexed) */
  numeroFila: number;
  /** Datos originales de la fila */
  datosOriginales: Record<string, unknown>;
  /** Datos mapeados y procesados */
  datosProcesados: Partial<T>;
  /** Estado de validación */
  estado: EstadoValidacion;
  /** Errores encontrados */
  errores: ErrorValidacion[];
  /** Si está seleccionada para importar */
  seleccionada: boolean;
}

/** Mapeo de columnas Excel a campos del sistema */
export interface MapeoColumna {
  /** Nombre de la columna en Excel */
  columnaExcel: string;
  /** Campo destino en el sistema */
  campoDestino: string;
  /** Tipo de dato esperado */
  tipoDato: 'texto' | 'numero' | 'fecha' | 'booleano';
  /** Si es requerido */
  requerido: boolean;
  /** Función de transformación personalizada */
  transformacion?: string;
  /** Valor por defecto si está vacío */
  valorDefecto?: unknown;
}

/** Configuración de importación */
export interface ConfiguracionImportacion {
  /** Tipo de entidad a importar */
  tipoEntidad: 'flota' | 'tecnicos' | 'historico' | 'inventario';
  /** Mapeo de columnas */
  mapeoColumnas: MapeoColumna[];
  /** Fila donde empiezan los datos (0-indexed) */
  filaInicio: number;
  /** Si tiene fila de encabezados */
  tieneEncabezados: boolean;
  /** Columnas a ignorar */
  columnasIgnorar: string[];
  /** Detectar duplicados */
  detectarDuplicados: boolean;
  /** Campo para detectar duplicados */
  campoDuplicado?: string;
  /** Generar códigos automáticamente */
  generarCodigos: boolean;
  /** Prefijo para códigos generados */
  prefijoCodigo?: string;
}

/** Resultado de importación */
export interface ResultadoImportacion {
  /** Total de filas procesadas */
  totalFilas: number;
  /** Filas importadas exitosamente */
  filasImportadas: number;
  /** Filas con errores */
  filasError: number;
  /** Filas duplicadas omitidas */
  filasDuplicadas: number;
  /** Filas con advertencias */
  filasAdvertencia: number;
  /** Tiempo de procesamiento (ms) */
  tiempoProcesamiento: number;
  /** IDs de documentos creados */
  documentosCreados: string[];
  /** Log detallado */
  log: LogImportacion[];
  /** Fecha de importación */
  fecha: Date;
  /** Usuario que importó */
  usuarioId: string;
}

/** Entrada de log de importación */
export interface LogImportacion {
  /** Timestamp */
  timestamp: Date;
  /** Nivel */
  nivel: 'info' | 'warning' | 'error' | 'success';
  /** Mensaje */
  mensaje: string;
  /** Fila relacionada */
  fila?: number;
  /** Detalles adicionales */
  detalles?: Record<string, unknown>;
}

/** Plantilla de importación para flota */
export interface PlantillaFlota {
  /** Código interno (ej: EKI-001) */
  codigo?: string;
  /** Matrícula */
  matricula?: string;
  /** Marca */
  marca?: string;
  /** Modelo */
  modelo?: string;
  /** Número de serie / bastidor */
  numeroSerie?: string;
  /** Año de fabricación */
  anioFabricacion?: number;
  /** Fecha de alta */
  fechaAlta?: Date;
  /** Operador (código) */
  operador?: string;
  /** Ubicación base */
  ubicacionBase?: string;
  /** Kilometraje actual */
  kilometraje?: number;
  /** Estado inicial */
  estado?: string;
  /** Notas */
  notas?: string;
}

/** Plantilla de importación para técnicos */
export interface PlantillaTecnicos {
  /** Email */
  email: string;
  /** Nombre */
  nombre: string;
  /** Apellidos */
  apellidos: string;
  /** Teléfono */
  telefono?: string;
  /** Rol */
  rol?: string;
  /** Especialidades */
  especialidades?: string;
  /** Activo */
  activo?: boolean;
}

/** Plantilla de importación para histórico */
export interface PlantillaHistorico {
  /** Código del activo */
  codigoActivo: string;
  /** Fecha de la incidencia */
  fecha: Date;
  /** Descripción */
  descripcion: string;
  /** Tipo */
  tipo?: string;
  /** Estado final */
  estadoFinal?: string;
  /** Técnico asignado */
  tecnico?: string;
  /** Tiempo de resolución (horas) */
  tiempoResolucion?: number;
  /** Materiales utilizados */
  materiales?: string;
  /** Coste total */
  coste?: number;
}
