'use strict';

import {
  collection,
  doc,
  writeBatch,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  FilaImportacion,
  ResultadoImportacion,
  LogImportacion,
  PlantillaFlota,
  PlantillaTecnicos,
  PlantillaHistorico,
  Activo,
  Usuario,
  Incidencia,
  MovimientoInventario,
  Auditoria,
} from '@/types';

// ============================================
// CONSTANTES
// ============================================

const MAX_BATCH_SIZE = 500; // Firestore permite máximo 500 operaciones por batch

// ============================================
// IMPORTACIÓN DE FLOTA
// ============================================

/**
 * Importa autobuses desde datos procesados de Excel
 */
export async function importarFlota(
  tenantId: string,
  filas: FilaImportacion<PlantillaFlota>[],
  userId: string,
  opciones: {
    generarCodigosAutomaticos?: boolean;
    prefijoCodigosAutomaticos?: string;
    crearMovimientosAlta?: boolean;
    operadorPorDefecto?: string;
  } = {}
): Promise<ResultadoImportacion> {
  const inicio = Date.now();
  const log: LogImportacion[] = [];
  const documentosCreados: string[] = [];
  let filasImportadas = 0;
  let filasError = 0;
  let filasDuplicadas = 0;

  // Filtrar solo filas seleccionadas
  const filasAImportar = filas.filter((f) => f.seleccionada && f.estado !== 'error');

  if (filasAImportar.length === 0) {
    log.push({
      timestamp: new Date(),
      nivel: 'warning',
      mensaje: 'No hay filas válidas para importar',
    });
    return crearResultado(filas.length, 0, 0, 0, 0, inicio, documentosCreados, log, userId);
  }

  log.push({
    timestamp: new Date(),
    nivel: 'info',
    mensaje: `Iniciando importación de ${filasAImportar.length} autobuses`,
  });

  // Obtener matrículas existentes para evitar duplicados
  const activosRef = collection(db, `tenants/${tenantId}/activos`);
  const existentesSnap = await getDocs(query(activosRef, where('tipo', '==', 'autobus')));
  const matriculasExistentes = new Set(
    existentesSnap.docs.map((d) => String(d.data().matricula || '').toLowerCase())
  );

  // Procesar en batches
  let codigoSecuencia = 1;
  
  for (let i = 0; i < filasAImportar.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchFilas = filasAImportar.slice(i, i + MAX_BATCH_SIZE);

    for (const fila of batchFilas) {
      try {
        const datos = fila.datosProcesados;
        const matricula = String(datos.matricula || '').trim();

        // Verificar duplicado
        if (matriculasExistentes.has(matricula.toLowerCase())) {
          filasDuplicadas++;
          log.push({
            timestamp: new Date(),
            nivel: 'warning',
            mensaje: `Fila ${fila.numeroFila}: Matrícula ${matricula} ya existe, omitida`,
            fila: fila.numeroFila,
          });
          continue;
        }

        // Generar código si es necesario
        let codigo = datos.codigo;
        if (!codigo && opciones.generarCodigosAutomaticos) {
          const prefijo = opciones.prefijoCodigosAutomaticos || 'BUS';
          codigo = `${prefijo}-${String(codigoSecuencia).padStart(3, '0')}`;
          codigoSecuencia++;
        }

        // Crear documento del activo
        const activo: Omit<Activo, 'id'> = {
          tipo: 'autobus',
          codigo: codigo || matricula,
          matricula: matricula,
          marca: datos.marca || undefined,
          modelo: datos.modelo || undefined,
          numeroSerie: datos.numeroSerie || undefined,
          anioFabricacion: datos.anioFabricacion || undefined,
          fechaAlta: datos.fechaAlta 
            ? Timestamp.fromDate(new Date(datos.fechaAlta)) 
            : Timestamp.now(),
          estado: mapearEstado(datos.estado),
          ubicacionActual: datos.ubicacionBase || undefined,
          ubicacionBase: datos.ubicacionBase ? { nombre: datos.ubicacionBase } : undefined,
          tenantId,
          equipos: [],
          kilometraje: datos.kilometraje || 0,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };

        const docRef = doc(activosRef);
        batch.set(docRef, activo);
        documentosCreados.push(docRef.id);
        matriculasExistentes.add(matricula.toLowerCase());

        // Crear movimiento de alta si está habilitado
        if (opciones.crearMovimientosAlta) {
          const movRef = doc(collection(db, `tenants/${tenantId}/movimientos`));
          const movimiento: Omit<MovimientoInventario, 'id'> = {
            tipo: 'entrada',
            fecha: activo.fechaAlta,
            origenTipo: 'proveedor',
            origenDescripcion: 'Alta inicial (importación)',
            destinoTipo: 'activo',
            destinoId: docRef.id,
            destinoDescripcion: `${activo.codigo} - ${matricula}`,
            cantidad: 1,
            observaciones: `Importado desde Excel - Fila ${fila.numeroFila}`,
            usuarioId: userId,
            tenantId,
            createdAt: serverTimestamp() as Timestamp,
          };
          batch.set(movRef, movimiento);
        }

        filasImportadas++;
        log.push({
          timestamp: new Date(),
          nivel: 'success',
          mensaje: `Fila ${fila.numeroFila}: Autobús ${codigo || matricula} importado correctamente`,
          fila: fila.numeroFila,
          detalles: { docId: docRef.id, matricula, codigo },
        });

      } catch (error) {
        filasError++;
        log.push({
          timestamp: new Date(),
          nivel: 'error',
          mensaje: `Fila ${fila.numeroFila}: Error al importar - ${(error as Error).message}`,
          fila: fila.numeroFila,
        });
      }
    }

    // Ejecutar batch
    try {
      await batch.commit();
      log.push({
        timestamp: new Date(),
        nivel: 'info',
        mensaje: `Batch ${Math.floor(i / MAX_BATCH_SIZE) + 1} completado`,
      });
    } catch (error) {
      log.push({
        timestamp: new Date(),
        nivel: 'error',
        mensaje: `Error ejecutando batch: ${(error as Error).message}`,
      });
      // Revertir contadores ya que el batch falló
      filasError += batchFilas.length;
      filasImportadas -= batchFilas.length;
    }
  }

  // Registrar log de auditoría
  await registrarLogAuditoria(tenantId, userId, 'importar', 'flota', {
    totalFilas: filas.length,
    filasImportadas,
    filasError,
    filasDuplicadas,
  });

  log.push({
    timestamp: new Date(),
    nivel: 'success',
    mensaje: `Importación completada: ${filasImportadas} autobuses importados`,
  });

  return crearResultado(
    filas.length,
    filasImportadas,
    filasError,
    filasDuplicadas,
    filas.filter(f => f.estado === 'advertencia').length,
    inicio,
    documentosCreados,
    log,
    userId
  );
}

// ============================================
// IMPORTACIÓN DE TÉCNICOS
// ============================================

/**
 * Importa técnicos desde datos procesados de Excel
 */
export async function importarTecnicos(
  tenantId: string,
  filas: FilaImportacion<PlantillaTecnicos>[],
  userId: string,
  opciones: {
    rolPorDefecto?: string;
    enviarInvitaciones?: boolean;
  } = {}
): Promise<ResultadoImportacion> {
  const inicio = Date.now();
  const log: LogImportacion[] = [];
  const documentosCreados: string[] = [];
  let filasImportadas = 0;
  let filasError = 0;
  let filasDuplicadas = 0;

  const filasAImportar = filas.filter((f) => f.seleccionada && f.estado !== 'error');

  if (filasAImportar.length === 0) {
    log.push({
      timestamp: new Date(),
      nivel: 'warning',
      mensaje: 'No hay filas válidas para importar',
    });
    return crearResultado(filas.length, 0, 0, 0, 0, inicio, documentosCreados, log, userId);
  }

  log.push({
    timestamp: new Date(),
    nivel: 'info',
    mensaje: `Iniciando importación de ${filasAImportar.length} técnicos`,
  });

  // Obtener emails existentes
  const usuariosRef = collection(db, `tenants/${tenantId}/usuarios`);
  const existentesSnap = await getDocs(usuariosRef);
  const emailsExistentes = new Set(
    existentesSnap.docs.map((d) => String(d.data().email || '').toLowerCase())
  );

  // Procesar en batches
  for (let i = 0; i < filasAImportar.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchFilas = filasAImportar.slice(i, i + MAX_BATCH_SIZE);

    for (const fila of batchFilas) {
      try {
        const datos = fila.datosProcesados;
        const email = String(datos.email || '').trim().toLowerCase();

        if (!email) {
          filasError++;
          log.push({
            timestamp: new Date(),
            nivel: 'error',
            mensaje: `Fila ${fila.numeroFila}: Email vacío`,
            fila: fila.numeroFila,
          });
          continue;
        }

        // Verificar duplicado
        if (emailsExistentes.has(email)) {
          filasDuplicadas++;
          log.push({
            timestamp: new Date(),
            nivel: 'warning',
            mensaje: `Fila ${fila.numeroFila}: Email ${email} ya existe, omitido`,
            fila: fila.numeroFila,
          });
          continue;
        }

        // Crear documento del usuario
        const usuario: Omit<Usuario, 'id'> = {
          email,
          nombre: datos.nombre || '',
          apellidos: datos.apellidos || '',
          telefono: datos.telefono || undefined,
          rol: mapearRol(datos.rol, opciones.rolPorDefecto),
          tenantId,
          activo: datos.activo !== false,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };

        const docRef = doc(usuariosRef);
        batch.set(docRef, usuario);
        documentosCreados.push(docRef.id);
        emailsExistentes.add(email);

        filasImportadas++;
        log.push({
          timestamp: new Date(),
          nivel: 'success',
          mensaje: `Fila ${fila.numeroFila}: Técnico ${datos.nombre} ${datos.apellidos} importado`,
          fila: fila.numeroFila,
          detalles: { docId: docRef.id, email },
        });

      } catch (error) {
        filasError++;
        log.push({
          timestamp: new Date(),
          nivel: 'error',
          mensaje: `Fila ${fila.numeroFila}: Error - ${(error as Error).message}`,
          fila: fila.numeroFila,
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      log.push({
        timestamp: new Date(),
        nivel: 'error',
        mensaje: `Error ejecutando batch: ${(error as Error).message}`,
      });
    }
  }

  await registrarLogAuditoria(tenantId, userId, 'importar', 'tecnicos', {
    totalFilas: filas.length,
    filasImportadas,
    filasError,
    filasDuplicadas,
  });

  log.push({
    timestamp: new Date(),
    nivel: 'success',
    mensaje: `Importación completada: ${filasImportadas} técnicos importados`,
  });

  return crearResultado(
    filas.length,
    filasImportadas,
    filasError,
    filasDuplicadas,
    filas.filter(f => f.estado === 'advertencia').length,
    inicio,
    documentosCreados,
    log,
    userId
  );
}

// ============================================
// IMPORTACIÓN DE HISTÓRICO
// ============================================

/**
 * Importa histórico de incidencias desde datos procesados de Excel
 */
export async function importarHistorico(
  tenantId: string,
  filas: FilaImportacion<PlantillaHistorico>[],
  userId: string,
  opciones: {
    mapeoActivos?: Map<string, string>; // código/matrícula -> activoId
    mapeoTecnicos?: Map<string, string>; // nombre -> usuarioId
  } = {}
): Promise<ResultadoImportacion> {
  const inicio = Date.now();
  const log: LogImportacion[] = [];
  const documentosCreados: string[] = [];
  let filasImportadas = 0;
  let filasError = 0;
  let filasDuplicadas = 0;

  const filasAImportar = filas.filter((f) => f.seleccionada && f.estado !== 'error');

  if (filasAImportar.length === 0) {
    log.push({
      timestamp: new Date(),
      nivel: 'warning',
      mensaje: 'No hay filas válidas para importar',
    });
    return crearResultado(filas.length, 0, 0, 0, 0, inicio, documentosCreados, log, userId);
  }

  log.push({
    timestamp: new Date(),
    nivel: 'info',
    mensaje: `Iniciando importación de ${filasAImportar.length} registros históricos`,
  });

  // Obtener mapeo de activos si no se proporciona
  const mapeoActivos = opciones.mapeoActivos || await obtenerMapeoActivos(tenantId);
  const mapeoTecnicos = opciones.mapeoTecnicos || await obtenerMapeoTecnicos(tenantId);

  // Generar códigos de incidencia
  let codigoSecuencia = await obtenerSiguienteCodigoIncidencia(tenantId);

  const incidenciasRef = collection(db, `tenants/${tenantId}/incidencias`);

  for (let i = 0; i < filasAImportar.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchFilas = filasAImportar.slice(i, i + MAX_BATCH_SIZE);

    for (const fila of batchFilas) {
      try {
        const datos = fila.datosProcesados;
        
        // Buscar activo
        const codigoActivo = String(datos.codigoActivo || '').toLowerCase();
        const activoId = mapeoActivos.get(codigoActivo);

        if (!activoId) {
          log.push({
            timestamp: new Date(),
            nivel: 'warning',
            mensaje: `Fila ${fila.numeroFila}: Activo ${datos.codigoActivo} no encontrado`,
            fila: fila.numeroFila,
          });
        }

        // Buscar técnico
        const nombreTecnico = String(datos.tecnico || '').toLowerCase();
        const tecnicoId = nombreTecnico ? mapeoTecnicos.get(nombreTecnico) : undefined;

        const codigo = `INC-${String(codigoSecuencia).padStart(5, '0')}`;
        codigoSecuencia++;

        const fechaIncidencia = datos.fecha 
          ? Timestamp.fromDate(new Date(datos.fecha))
          : Timestamp.now();

        const incidencia: Partial<Incidencia> = {
          codigo,
          tipo: mapearTipoIncidencia(datos.tipo),
          criticidad: 'normal',
          estado: 'cerrada',
          activoId: activoId || undefined,
          activoCodigo: datos.codigoActivo,
          descripcion: datos.descripcion,
          tecnicoAsignadoId: tecnicoId,
          timestamps: {
            recepcion: fechaIncidencia,
            cierre: fechaIncidencia,
          },
          tiempos: {
            resolucion: datos.tiempoResolucion ? datos.tiempoResolucion * 60 : undefined, // Convertir horas a minutos
          },
          notas: datos.materiales ? `Materiales: ${datos.materiales}` : undefined,
          tenantId,
          importado: true,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        } as Partial<Incidencia>;

        const docRef = doc(incidenciasRef);
        batch.set(docRef, incidencia);
        documentosCreados.push(docRef.id);

        filasImportadas++;
        log.push({
          timestamp: new Date(),
          nivel: 'success',
          mensaje: `Fila ${fila.numeroFila}: Incidencia ${codigo} importada`,
          fila: fila.numeroFila,
        });

      } catch (error) {
        filasError++;
        log.push({
          timestamp: new Date(),
          nivel: 'error',
          mensaje: `Fila ${fila.numeroFila}: Error - ${(error as Error).message}`,
          fila: fila.numeroFila,
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      log.push({
        timestamp: new Date(),
        nivel: 'error',
        mensaje: `Error ejecutando batch: ${(error as Error).message}`,
      });
    }
  }

  await registrarLogAuditoria(tenantId, userId, 'importar', 'historico', {
    totalFilas: filas.length,
    filasImportadas,
    filasError,
    filasDuplicadas,
  });

  log.push({
    timestamp: new Date(),
    nivel: 'success',
    mensaje: `Importación completada: ${filasImportadas} registros históricos importados`,
  });

  return crearResultado(
    filas.length,
    filasImportadas,
    filasError,
    filasDuplicadas,
    filas.filter(f => f.estado === 'advertencia').length,
    inicio,
    documentosCreados,
    log,
    userId
  );
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function mapearEstado(estado?: string): Activo['estado'] {
  if (!estado) return 'operativo';
  const estadoLower = estado.toLowerCase();
  if (estadoLower.includes('baja')) return 'baja';
  if (estadoLower.includes('taller') || estadoLower.includes('reparacion') || estadoLower.includes('reparación')) return 'en_taller';
  if (estadoLower.includes('averia') || estadoLower.includes('avería')) return 'averiado';
  return 'operativo';
}

function mapearRol(rol?: string, defecto?: string): Usuario['rol'] {
  if (!rol) return (defecto as Usuario['rol']) || 'tecnico';
  const rolLower = rol.toLowerCase();
  if (rolLower.includes('admin')) return 'admin';
  if (rolLower.includes('jefe')) return 'jefe_mantenimiento';
  if (rolLower.includes('operador')) return 'operador';
  return 'tecnico';
}

function mapearTipoIncidencia(tipo?: string): Incidencia['tipo'] {
  if (!tipo) return 'correctiva';
  const tipoLower = tipo.toLowerCase();
  if (tipoLower.includes('prevent')) return 'preventiva';
  return 'correctiva';
}

async function obtenerMapeoActivos(tenantId: string): Promise<Map<string, string>> {
  const mapeo = new Map<string, string>();
  const activosRef = collection(db, `tenants/${tenantId}/activos`);
  const snap = await getDocs(activosRef);
  
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.codigo) mapeo.set(data.codigo.toLowerCase(), doc.id);
    if (data.matricula) mapeo.set(data.matricula.toLowerCase(), doc.id);
  });
  
  return mapeo;
}

async function obtenerMapeoTecnicos(tenantId: string): Promise<Map<string, string>> {
  const mapeo = new Map<string, string>();
  const usuariosRef = collection(db, `tenants/${tenantId}/usuarios`);
  const snap = await getDocs(usuariosRef);
  
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const nombreCompleto = `${data.nombre} ${data.apellidos}`.toLowerCase();
    mapeo.set(nombreCompleto, doc.id);
    if (data.nombre) mapeo.set(data.nombre.toLowerCase(), doc.id);
  });
  
  return mapeo;
}

async function obtenerSiguienteCodigoIncidencia(tenantId: string): Promise<number> {
  const incidenciasRef = collection(db, `tenants/${tenantId}/incidencias`);
  const snap = await getDocs(incidenciasRef);
  return snap.size + 1;
}

async function registrarLogAuditoria(
  tenantId: string,
  userId: string,
  accion: string,
  entidad: string,
  detalles: Record<string, unknown>
): Promise<void> {
  try {
    const logsRef = collection(db, `tenants/${tenantId}/logs`);
    await addDoc(logsRef, {
      timestamp: serverTimestamp(),
      usuarioId: userId,
      accion,
      entidad,
      descripcion: `Importación de ${entidad}`,
      detalles,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error registrando log de auditoría:', error);
  }
}

function crearResultado(
  totalFilas: number,
  filasImportadas: number,
  filasError: number,
  filasDuplicadas: number,
  filasAdvertencia: number,
  inicio: number,
  documentosCreados: string[],
  log: LogImportacion[],
  usuarioId: string
): ResultadoImportacion {
  return {
    totalFilas,
    filasImportadas,
    filasError,
    filasDuplicadas,
    filasAdvertencia,
    tiempoProcesamiento: Date.now() - inicio,
    documentosCreados,
    log,
    fecha: new Date(),
    usuarioId,
  };
}
