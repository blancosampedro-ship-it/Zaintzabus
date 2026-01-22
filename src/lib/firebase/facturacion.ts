'use strict';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getContratoActivo } from '@/lib/firebase/contratos';
import type {
  Factura,
  FacturaFormData,
  LineaFactura,
  OrdenTrabajo,
  Contrato,
  DocumentId,
  Auditoria,
  EstadoFactura,
  ESTADOS_FACTURA,
} from '@/types';

// ============================================
// COLECCIONES
// ============================================

const getFacturasRef = (tenantId: string) =>
  collection(db, `tenants/${tenantId}/facturas`);

const getOTsRef = (tenantId: string) =>
  collection(db, `tenants/${tenantId}/ordenes_trabajo`);

const getConfigRef = () => doc(db, 'config/sistema');

// ============================================
// FACTURAS - CRUD
// ============================================

/**
 * Obtiene todas las facturas de un tenant
 */
export async function getFacturas(tenantId: string): Promise<Factura[]> {
  const q = query(
    getFacturasRef(tenantId),
    orderBy('auditoria.createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Factura[];
}

/**
 * Obtiene facturas por operador
 */
export async function getFacturasPorOperador(
  tenantId: string,
  operadorId: string
): Promise<Factura[]> {
  const q = query(
    getFacturasRef(tenantId),
    where('operadorId', '==', operadorId),
    orderBy('auditoria.createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Factura[];
}

/**
 * Obtiene facturas por estado
 */
export async function getFacturasPorEstado(
  tenantId: string,
  estado: EstadoFactura
): Promise<Factura[]> {
  const q = query(
    getFacturasRef(tenantId),
    where('estado', '==', estado),
    orderBy('auditoria.createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Factura[];
}

/**
 * Obtiene una factura por ID
 */
export async function getFactura(
  tenantId: string,
  facturaId: string
): Promise<Factura | null> {
  const docRef = doc(getFacturasRef(tenantId), facturaId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Factura;
}

/**
 * Crea una nueva factura
 */
export async function crearFactura(
  tenantId: string,
  data: FacturaFormData,
  userId: string
): Promise<string> {
  const auditoria: Auditoria = {
    createdAt: serverTimestamp() as Timestamp,
    createdBy: userId,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
  };

  const docRef = await addDoc(getFacturasRef(tenantId), {
    ...data,
    auditoria,
  });

  // Marcar las OTs como facturadas
  const batch = writeBatch(db);
  for (const linea of data.lineas) {
    const otRef = doc(getOTsRef(tenantId), linea.otId);
    batch.update(otRef, {
      'facturacion.facturable': true,
      'facturacion.facturaId': docRef.id,
      'auditoria.updatedAt': serverTimestamp(),
      'auditoria.updatedBy': userId,
    });
  }
  await batch.commit();

  return docRef.id;
}

/**
 * Actualiza el estado de una factura
 */
export async function actualizarEstadoFactura(
  tenantId: string,
  facturaId: string,
  estado: EstadoFactura,
  userId: string,
  datosAdicionales?: Partial<Pick<Factura, 'fechaEmision' | 'fechaVencimiento' | 'fechaPago' | 'observaciones'>>
): Promise<void> {
  const docRef = doc(getFacturasRef(tenantId), facturaId);
  await updateDoc(docRef, {
    estado,
    ...datosAdicionales,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });
}

/**
 * Anula una factura
 */
export async function anularFactura(
  tenantId: string,
  facturaId: string,
  userId: string,
  motivo: string
): Promise<void> {
  const factura = await getFactura(tenantId, facturaId);
  if (!factura) throw new Error('Factura no encontrada');

  // Desmarcar las OTs como facturadas
  const batch = writeBatch(db);
  for (const linea of factura.lineas) {
    const otRef = doc(getOTsRef(tenantId), linea.otId);
    batch.update(otRef, {
      'facturacion.facturaId': null,
      'auditoria.updatedAt': serverTimestamp(),
      'auditoria.updatedBy': userId,
    });
  }

  // Actualizar la factura
  const facturaRef = doc(getFacturasRef(tenantId), facturaId);
  batch.update(facturaRef, {
    estado: 'anulada',
    observaciones: motivo,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });

  await batch.commit();
}

// ============================================
// OTs FACTURABLES
// ============================================

/**
 * Obtiene OTs pendientes de facturar
 */
export async function getOTsFacturables(
  tenantId: string,
  operadorId?: string
): Promise<OrdenTrabajo[]> {
  let q = query(
    getOTsRef(tenantId),
    where('facturacion.facturable', '==', true),
    where('estado', 'in', ['completada', 'validada']),
    orderBy('fechaCompletada', 'desc')
  );

  // Nota: Firestore no permite filtrar por campo null fácilmente
  // Se filtra en cliente
  const snapshot = await getDocs(q);
  let ots = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as OrdenTrabajo))
    .filter((ot) => !ot.facturacion?.facturaId);

  if (operadorId) {
    ots = ots.filter((ot) => ot.operadorId === operadorId);
  }

  return ots;
}

/**
 * Agrupa OTs por operador y período
 */
export async function agruparOTsPorOperadorYPeriodo(
  tenantId: string,
  desde: Date,
  hasta: Date
): Promise<Map<string, OrdenTrabajo[]>> {
  const q = query(
    getOTsRef(tenantId),
    where('facturacion.facturable', '==', true),
    where('estado', 'in', ['completada', 'validada']),
    where('fechaCompletada', '>=', Timestamp.fromDate(desde)),
    where('fechaCompletada', '<=', Timestamp.fromDate(hasta))
  );

  const snapshot = await getDocs(q);
  const ots = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as OrdenTrabajo))
    .filter((ot) => !ot.facturacion?.facturaId);

  // Agrupar por operador
  const porOperador = new Map<string, OrdenTrabajo[]>();
  for (const ot of ots) {
    const operadorId = ot.operadorId || 'sin_operador';
    if (!porOperador.has(operadorId)) {
      porOperador.set(operadorId, []);
    }
    porOperador.get(operadorId)!.push(ot);
  }

  return porOperador;
}

// ============================================
// GENERACIÓN DE FACTURAS
// ============================================

/**
 * Genera el siguiente número de factura
 */
export async function generarNumeroFactura(prefijo: string = 'FAC'): Promise<string> {
  const configDoc = await getDoc(getConfigRef());
  let numero = 1;
  
  if (configDoc.exists()) {
    const config = configDoc.data();
    numero = (config.siguienteNumeroFactura || 0) + 1;
    await updateDoc(getConfigRef(), {
      siguienteNumeroFactura: numero,
    });
  }

  const año = new Date().getFullYear();
  return `${prefijo}-${año}-${numero.toString().padStart(5, '0')}`;
}

/**
 * Calcula los importes de una línea de factura según contrato
 */
export function calcularImporteLinea(
  ot: OrdenTrabajo,
  contrato: Contrato
): LineaFactura {
  // Obtener tarifa según tipo de contrato
  let costeHora = 45; // Por defecto
  
  if (contrato.tipo === 'fijo' && contrato.tarifas?.fijo) {
    costeHora = contrato.tarifas.fijo.cuotaMensual / 160; // Estimación
  } else if (contrato.tipo === 'variable' && contrato.tarifas?.variable) {
    costeHora = contrato.tarifas.variable.costeManoObra;
  } else if (contrato.tipo === 'mixto') {
    costeHora = contrato.tarifas?.variable?.costeManoObra || 45;
  }

  // Calcular horas de mano de obra
  const horasManoObra = ot.tiempoReal?.minutosReales 
    ? ot.tiempoReal.minutosReales / 60 
    : ot.tiempoEstimado?.minutosEstimados 
      ? ot.tiempoEstimado.minutosEstimados / 60
      : 1;

  const subtotalManoObra = horasManoObra * costeHora;

  // Calcular materiales
  const materiales = (ot.materiales || []).map((m) => ({
    itemId: m.itemId,
    descripcion: m.descripcion || 'Material',
    cantidad: m.cantidad,
    precioUnitario: m.coste || 0,
    subtotal: m.cantidad * (m.coste || 0),
  }));

  const subtotalMateriales = materiales.reduce((sum, m) => sum + m.subtotal, 0);

  return {
    otId: ot.id,
    codigoOT: ot.codigo,
    descripcion: ot.descripcion,
    tipoTrabajo: ot.tipo === 'preventivo' ? 'preventivo' : 'correctivo',
    horasManoObra: Math.round(horasManoObra * 100) / 100,
    costeHora,
    subtotalManoObra: Math.round(subtotalManoObra * 100) / 100,
    materiales,
    subtotalMateriales: Math.round(subtotalMateriales * 100) / 100,
    totalLinea: Math.round((subtotalManoObra + subtotalMateriales) * 100) / 100,
    fechaOT: ot.fechaCompletada || ot.auditoria.createdAt,
  };
}

/**
 * Genera un borrador de factura para un operador
 */
export async function generarBorradorFactura(
  tenantId: string,
  operadorId: string,
  operadorNombre: string,
  ots: OrdenTrabajo[],
  userId: string,
  ivaPorcentaje: number = 21
): Promise<Factura> {
  // Obtener contrato activo
  const contrato = await getContratoActivo(tenantId, operadorId);
  if (!contrato) {
    throw new Error('No hay contrato activo para este operador');
  }

  // Calcular líneas
  const lineas: LineaFactura[] = ots.map((ot) => 
    calcularImporteLinea(ot, contrato)
  );

  // Calcular totales
  const subtotal = lineas.reduce((sum, l) => sum + l.totalLinea, 0);
  const importeIVA = Math.round(subtotal * ivaPorcentaje) / 100;
  const total = subtotal + importeIVA;

  // Determinar período
  const fechas = ots
    .map((ot) => ot.fechaCompletada?.toMillis() || ot.auditoria.createdAt.toMillis())
    .sort((a, b) => a - b);
  
  const desde = Timestamp.fromMillis(fechas[0]);
  const hasta = Timestamp.fromMillis(fechas[fechas.length - 1]);

  // Generar número
  const numero = await generarNumeroFactura();

  const factura: Factura = {
    id: '', // Se asignará al guardar
    numero,
    operadorId,
    operadorNombre,
    contratoId: contrato.id,
    periodo: { desde, hasta },
    lineas,
    subtotal: Math.round(subtotal * 100) / 100,
    porcentajeIVA: ivaPorcentaje,
    importeIVA: Math.round(importeIVA * 100) / 100,
    total: Math.round(total * 100) / 100,
    estado: 'borrador',
    auditoria: {
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    },
  };

  return factura;
}

// ============================================
// EXPORTACIÓN
// ============================================

/**
 * Exporta factura a formato CSV
 */
export function exportarFacturaCSV(factura: Factura): string {
  const headers = [
    'Código OT',
    'Descripción',
    'Tipo',
    'Horas',
    'Coste/Hora',
    'Mano Obra',
    'Materiales',
    'Total',
  ];

  const rows = factura.lineas.map((l) => [
    l.codigoOT,
    `"${l.descripcion.replace(/"/g, '""')}"`,
    l.tipoTrabajo,
    l.horasManoObra.toFixed(2),
    l.costeHora.toFixed(2),
    l.subtotalManoObra.toFixed(2),
    l.subtotalMateriales.toFixed(2),
    l.totalLinea.toFixed(2),
  ]);

  // Añadir totales
  rows.push([]);
  rows.push(['', '', '', '', '', 'Subtotal:', '', factura.subtotal.toFixed(2)]);
  rows.push(['', '', '', '', '', `IVA (${factura.porcentajeIVA}%):`, '', factura.importeIVA.toFixed(2)]);
  rows.push(['', '', '', '', '', 'TOTAL:', '', factura.total.toFixed(2)]);

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

/**
 * Exporta factura a formato JSON para sistema externo
 */
export function exportarFacturaJSON(factura: Factura): object {
  return {
    numeroFactura: factura.numero,
    operador: {
      id: factura.operadorId,
      nombre: factura.operadorNombre,
    },
    periodo: {
      desde: factura.periodo.desde.toDate().toISOString(),
      hasta: factura.periodo.hasta.toDate().toISOString(),
    },
    lineas: factura.lineas.map((l) => ({
      referencia: l.codigoOT,
      descripcion: l.descripcion,
      tipo: l.tipoTrabajo,
      unidades: l.horasManoObra,
      precioUnitario: l.costeHora,
      importeManoObra: l.subtotalManoObra,
      importeMateriales: l.subtotalMateriales,
      importeTotal: l.totalLinea,
    })),
    subtotal: factura.subtotal,
    impuestos: {
      tipo: 'IVA',
      porcentaje: factura.porcentajeIVA,
      importe: factura.importeIVA,
    },
    total: factura.total,
    estado: factura.estado,
    fechaEmision: factura.fechaEmision?.toDate().toISOString(),
    fechaVencimiento: factura.fechaVencimiento?.toDate().toISOString(),
  };
}

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * Obtiene resumen de facturación
 */
export async function getResumenFacturacion(
  tenantId: string,
  año?: number
): Promise<{
  totalFacturado: number;
  totalPendiente: number;
  totalCobrado: number;
  numeroFacturas: number;
  facturasEmitidas: number;
  facturasPendientes: number;
  facturasPagadas: number;
}> {
  const facturas = await getFacturas(tenantId);
  const añoFiltro = año || new Date().getFullYear();

  const facturasFiltradas = facturas.filter((f) => {
    const fechaCreacion = f.auditoria.createdAt.toDate();
    return fechaCreacion.getFullYear() === añoFiltro && f.estado !== 'anulada';
  });

  let totalFacturado = 0;
  let totalPendiente = 0;
  let totalCobrado = 0;
  let facturasEmitidas = 0;
  let facturasPendientes = 0;
  let facturasPagadas = 0;

  for (const factura of facturasFiltradas) {
    totalFacturado += factura.total;
    
    if (factura.estado === 'pagada') {
      totalCobrado += factura.total;
      facturasPagadas++;
    } else if (factura.estado !== 'borrador') {
      totalPendiente += factura.total;
      if (factura.estado === 'pendiente' || factura.estado === 'enviada') {
        facturasPendientes++;
      }
    }

    if (factura.estado !== 'borrador') {
      facturasEmitidas++;
    }
  }

  return {
    totalFacturado: Math.round(totalFacturado * 100) / 100,
    totalPendiente: Math.round(totalPendiente * 100) / 100,
    totalCobrado: Math.round(totalCobrado * 100) / 100,
    numeroFacturas: facturasFiltradas.length,
    facturasEmitidas,
    facturasPendientes,
    facturasPagadas,
  };
}
