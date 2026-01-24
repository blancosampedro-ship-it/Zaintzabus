/**
 * =============================================================================
 * SYNC-FLOTA-PRO - Script de Migración y Sincronización Profesional
 * =============================================================================
 * 
 * Este script realiza:
 * 1. Migración física de documentos a tenant normalizado (ekialdebus-26)
 * 2. Sincronización y denormalización de equipos en autobuses
 * 3. Enriquecimiento por lógica de negocio (comentarios → campos)
 * 4. Limpieza de rutas antiguas
 * 5. Registro de auditoría final
 * 
 * EJECUCIÓN:
 *   npx tsx scripts/sync-flota-pro.ts
 * 
 * =============================================================================
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const CONFIG = {
  // Tenant destino (estándar oficial)
  TARGET_TENANT: 'ekialdebus-26',
  OPERADOR_CODIGO: 26,
  OPERADOR_NOMBRE: 'Ekialdebus',
  
  // Tenants origen a migrar
  SOURCE_TENANTS: ['ekialdebus', 'lurraldebus-gipuzkoa'],
  
  // Límite de operaciones por batch (Firestore max = 500, usamos 400 por seguridad)
  BATCH_SIZE: 400,
  
  // Modo de ejecución
  DRY_RUN: process.argv.includes('--dry-run'),
  SKIP_DELETE: process.argv.includes('--skip-delete'),
  VERBOSE: process.argv.includes('--verbose'),
};

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

const db = getFirestore();

// =============================================================================
// TIPOS LOCALES
// =============================================================================

interface EquipoResumen {
  id: string;
  tipo: string;
  serie?: string;
  estado: string;
  posicion?: string;
}

interface MigrationStats {
  autobusesCreados: number;
  autobusesFallidos: number;
  equiposCreados: number;
  equiposFallidos: number;
  documentosEliminados: number;
  autobusesActualizados: number;
  errores: string[];
}

interface BatchManager {
  batch: FirebaseFirestore.WriteBatch;
  operationCount: number;
}

// =============================================================================
// UTILIDADES
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    warn: '⚠️',
    error: '❌',
  };
  console.log(`${icons[type]} ${message}`);
}

function logVerbose(message: string) {
  if (CONFIG.VERBOSE) {
    console.log(`   └─ ${message}`);
  }
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

/**
 * Crea un nuevo batch manager para controlar límites de Firestore
 */
function createBatchManager(): BatchManager {
  return {
    batch: db.batch(),
    operationCount: 0,
  };
}

/**
 * Añade una operación al batch, haciendo commit si es necesario
 */
async function addToBatch(
  manager: BatchManager,
  operation: 'set' | 'update' | 'delete',
  ref: FirebaseFirestore.DocumentReference,
  data?: Record<string, unknown>
): Promise<void> {
  if (manager.operationCount >= CONFIG.BATCH_SIZE) {
    if (!CONFIG.DRY_RUN) {
      await manager.batch.commit();
      log(`   💾 Batch commit (${manager.operationCount} operaciones)`, 'info');
    }
    manager.batch = db.batch();
    manager.operationCount = 0;
  }

  if (!CONFIG.DRY_RUN) {
    switch (operation) {
      case 'set':
        manager.batch.set(ref, data!);
        break;
      case 'update':
        manager.batch.update(ref, data!);
        break;
      case 'delete':
        manager.batch.delete(ref);
        break;
    }
  }
  manager.operationCount++;
}

/**
 * Hace commit final del batch si quedan operaciones pendientes
 */
async function flushBatch(manager: BatchManager): Promise<void> {
  if (manager.operationCount > 0 && !CONFIG.DRY_RUN) {
    await manager.batch.commit();
    log(`   💾 Batch final commit (${manager.operationCount} operaciones)`, 'info');
  }
}

/**
 * Convierte cualquier formato de fecha a Timestamp de Firestore Admin
 */
function toTimestamp(value: unknown): Timestamp | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'object' && 'toDate' in (value as object)) {
    return Timestamp.fromDate((value as { toDate: () => Date }).toDate());
  }
  if (typeof value === 'number') return Timestamp.fromMillis(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return null;
}

/**
 * Analiza el campo comentarios para extraer información de negocio
 */
function analizarComentarios(comentarios?: string): {
  tieneFms: boolean | null;
  tags: string[];
} {
  const result = { tieneFms: null as boolean | null, tags: [] as string[] };
  
  if (!comentarios) return result;
  
  const comentariosLower = comentarios.toLowerCase();
  
  // Detectar FMS
  if (comentariosLower.includes('no hay fms') || 
      comentariosLower.includes('sin fms') ||
      comentariosLower.includes('no tiene fms')) {
    result.tieneFms = false;
  } else if (comentariosLower.includes('fms instalado') ||
             comentariosLower.includes('con fms')) {
    result.tieneFms = true;
  }
  
  // Detectar tags
  if (comentariosLower.includes('cable reforzado') ||
      comentariosLower.includes('cableado reforzado')) {
    result.tags.push('cableado_reforzado');
  }
  if (comentariosLower.includes('migrado')) {
    result.tags.push('migrado');
  }
  if (comentariosLower.includes('vandal') || comentariosLower.includes('roto')) {
    result.tags.push('incidencia_previa');
  }
  
  return result;
}

// =============================================================================
// FASE 1: MIGRACIÓN DE ACTIVOS → AUTOBUSES
// =============================================================================

async function migrarActivos(stats: MigrationStats): Promise<Map<string, string>> {
  logSection('FASE 1: Migración de Activos → Autobuses');
  
  const busIdMap = new Map<string, string>(); // codigo → nuevo docId
  const batchManager = createBatchManager();
  const autobusesRef = db.collection(`tenants/${CONFIG.TARGET_TENANT}/autobuses`);
  
  for (const sourceTenant of CONFIG.SOURCE_TENANTS) {
    log(`\n📂 Procesando tenant: ${sourceTenant}`, 'info');
    
    const activosRef = db.collection(`tenants/${sourceTenant}/activos`);
    const snapshot = await activosRef.get();
    
    if (snapshot.empty) {
      log(`   No hay activos en ${sourceTenant}`, 'warn');
      continue;
    }
    
    log(`   Encontrados ${snapshot.size} activos`, 'info');
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      try {
        // Extraer código del bus
        const codigo = data.codigo || docId;
        
        // Analizar comentarios
        const { tieneFms, tags } = analizarComentarios(data.comentarios);
        
        // Construir documento Autobus normalizado
        const autobusData: Record<string, unknown> = {
          // Identificación
          codigo: codigo,
          matricula: data.matricula || '',
          numeroChasis: data.numeroChasis || data.chasis || data.bastidor || null,
          
          // Vehículo
          marca: data.marca || data.modelo || null, // En datos antiguos, modelo = marca
          modelo: data.carroceria || null, // En datos antiguos, carroceria = modelo
          carroceria: data.carroceria || null,
          anio: data.anio || data.anioFabricacion || data.anyoFabricacion || null,
          
          // Operador
          operadorId: CONFIG.TARGET_TENANT,
          
          // Estado
          estado: data.estado || 'operativo',
          
          // Telemetría (enriquecido por comentarios)
          telemetria: {
            tieneFms: tieneFms ?? data.telemetria?.tieneFms ?? true,
            fmsConectado: data.telemetria?.fmsConectado ?? null,
          },
          
          // Cartelería
          carteleria: data.carteleria || { tiene: false },
          
          // Instalación
          instalacion: {
            fase: data.instalacion?.fase || 'completa',
            fechaPreinstalacion: toTimestamp(data.fechaPreInstalacion || data.instalacion?.fechaPreinstalacion),
            fechaInstalacionCompleta: toTimestamp(data.fechaInstalacion || data.instalacion?.fechaInstalacionCompleta),
            tecnicosIds: data.instalacion?.tecnicosIds || [],
          },
          
          // Contadores (se actualizarán en fase de sincronización)
          contadores: {
            totalEquipos: data.contadores?.totalEquipos || 0,
            totalAverias: data.contadores?.totalAverias || 0,
          },
          
          // Tags (nuevo campo para metadatos de negocio)
          tags: tags.length > 0 ? tags : null,
          
          // Comentarios originales (preservar)
          comentarios: data.comentarios || null,
          
          // Metadatos de migración
          tenantId: CONFIG.TARGET_TENANT,
          migracion: {
            origenTenant: sourceTenant,
            origenDocId: docId,
            fechaMigracion: FieldValue.serverTimestamp(),
          },
          
          // Auditoría
          auditoria: {
            creadoPor: 'sync-flota-pro',
            createdAt: toTimestamp(data.createdAt) || FieldValue.serverTimestamp(),
            actualizadoPor: 'sync-flota-pro',
            updatedAt: FieldValue.serverTimestamp(),
          },
        };
        
        // Limpiar campos null
        const cleanData = Object.fromEntries(
          Object.entries(autobusData).filter(([_, v]) => v !== null && v !== undefined)
        );
        
        // Usar el código como ID del documento
        const newDocRef = autobusesRef.doc(codigo);
        await addToBatch(batchManager, 'set', newDocRef, cleanData);
        
        busIdMap.set(codigo, codigo);
        stats.autobusesCreados++;
        
        logVerbose(`Bus ${codigo} (${data.matricula || 'sin matrícula'}) → migrado`);
        
      } catch (error) {
        const errorMsg = `Error migrando activo ${docId}: ${error}`;
        stats.errores.push(errorMsg);
        stats.autobusesFallidos++;
        log(errorMsg, 'error');
      }
    }
  }
  
  await flushBatch(batchManager);
  log(`\n✅ Migración de activos completada: ${stats.autobusesCreados} autobuses`, 'success');
  
  return busIdMap;
}

// =============================================================================
// FASE 2: MIGRACIÓN DE EQUIPOS
// =============================================================================

async function migrarEquipos(stats: MigrationStats, busIdMap: Map<string, string>): Promise<void> {
  logSection('FASE 2: Migración de Equipos');
  
  const batchManager = createBatchManager();
  const equiposDestRef = db.collection(`tenants/${CONFIG.TARGET_TENANT}/equipos`);
  
  // 2.1 Migrar desde colección raíz 'equipos'
  log('\n📂 Procesando colección raíz: equipos', 'info');
  
  const equiposRaizRef = db.collection('equipos');
  const equiposRaizSnapshot = await equiposRaizRef.get();
  
  if (!equiposRaizSnapshot.empty) {
    log(`   Encontrados ${equiposRaizSnapshot.size} equipos en raíz`, 'info');
    
    for (const doc of equiposRaizSnapshot.docs) {
      const data = doc.data();
      
      try {
        // Determinar ubicación
        const ubicacion = data.ubicacionActual || {};
        const busId = ubicacion.id || ubicacion.nombre?.replace('BUS-', '') || null;
        
        // Construir documento Equipo normalizado
        const equipoData: Record<string, unknown> = {
          codigoInterno: data.codigoInterno || doc.id,
          numeroSerieFabricante: data.numeroSerieFabricante || data.serie || null,
          tipoEquipoId: data.tipoEquipoId || data.tipo || 'desconocido',
          tipoEquipoNombre: data.tipoEquipoNombre || data.tipo || 'Desconocido',
          
          caracteristicas: data.caracteristicas || null,
          red: data.red || null,
          sim: data.sim || null,
          licencias: data.licencias || null,
          
          propiedad: {
            propietario: 'DFG',
            operadorAsignadoId: CONFIG.TARGET_TENANT,
          },
          
          ubicacionActual: {
            tipo: ubicacion.tipo || 'autobus',
            id: busId,
            nombre: ubicacion.nombre || (busId ? `BUS-${busId}` : 'Desconocido'),
            posicionEnBus: ubicacion.posicionEnBus || ubicacion.posicion || null,
          },
          
          estado: data.estado || 'en_servicio',
          
          fechas: {
            alta: toTimestamp(data.fechas?.alta || data.createdAt) || FieldValue.serverTimestamp(),
            instalacionActual: toTimestamp(data.fechas?.instalacionActual),
            ultimaRevision: toTimestamp(data.fechas?.ultimaRevision),
          },
          
          garantia: data.garantia || null,
          
          estadisticas: {
            totalAverias: data.estadisticas?.totalAverias || 0,
            totalMovimientos: data.estadisticas?.totalMovimientos || 1,
            diasEnServicio: data.estadisticas?.diasEnServicio || 0,
          },
          
          tenantId: CONFIG.TARGET_TENANT,
          migracion: {
            origenColeccion: 'equipos',
            origenDocId: doc.id,
            fechaMigracion: FieldValue.serverTimestamp(),
          },
          
          auditoria: {
            creadoPor: 'sync-flota-pro',
            createdAt: toTimestamp(data.createdAt) || FieldValue.serverTimestamp(),
            actualizadoPor: 'sync-flota-pro',
            updatedAt: FieldValue.serverTimestamp(),
          },
          
          searchTerms: generarSearchTerms(data),
        };
        
        const cleanData = Object.fromEntries(
          Object.entries(equipoData).filter(([_, v]) => v !== null && v !== undefined)
        );
        
        const newDocRef = equiposDestRef.doc();
        await addToBatch(batchManager, 'set', newDocRef, cleanData);
        stats.equiposCreados++;
        
        logVerbose(`Equipo ${data.codigoInterno || doc.id} → migrado`);
        
      } catch (error) {
        const errorMsg = `Error migrando equipo raíz ${doc.id}: ${error}`;
        stats.errores.push(errorMsg);
        stats.equiposFallidos++;
        log(errorMsg, 'error');
      }
    }
  }
  
  // 2.2 Migrar desde tenants/.../inventario
  for (const sourceTenant of CONFIG.SOURCE_TENANTS) {
    log(`\n📂 Procesando tenant inventario: ${sourceTenant}`, 'info');
    
    const inventarioRef = db.collection(`tenants/${sourceTenant}/inventario`);
    const inventarioSnapshot = await inventarioRef.get();
    
    if (inventarioSnapshot.empty) {
      log(`   No hay inventario en ${sourceTenant}`, 'warn');
      continue;
    }
    
    log(`   Encontrados ${inventarioSnapshot.size} items en inventario`, 'info');
    
    for (const doc of inventarioSnapshot.docs) {
      const data = doc.data();
      
      try {
        // El inventario antiguo usa activoId/activoCodigo
        const busId = data.activoId || data.activoCodigo || null;
        
        const equipoData: Record<string, unknown> = {
          codigoInterno: data.sku || `INV-${doc.id.substring(0, 8)}`,
          numeroSerieFabricante: data.numeroSerie || data.serie || null,
          tipoEquipoId: data.tipo || data.categoria || 'desconocido',
          tipoEquipoNombre: data.descripcion || data.tipo || 'Desconocido',
          
          caracteristicas: {
            marca: data.fabricante || null,
            modelo: data.modelo || null,
          },
          
          red: null,
          sim: data.telefono ? { msisdn: data.telefono } : null,
          
          propiedad: {
            propietario: 'DFG',
            operadorAsignadoId: CONFIG.TARGET_TENANT,
          },
          
          ubicacionActual: {
            tipo: 'autobus',
            id: busId,
            nombre: busId ? `BUS-${busId}` : 'Desconocido',
            posicionEnBus: data.posicion || null,
          },
          
          estado: mapearEstadoInventario(data.estado),
          
          fechas: {
            alta: toTimestamp(data.createdAt) || FieldValue.serverTimestamp(),
            instalacionActual: toTimestamp(data.ultimoMovimiento),
          },
          
          estadisticas: {
            totalAverias: 0,
            totalMovimientos: 1,
            diasEnServicio: 0,
          },
          
          tenantId: CONFIG.TARGET_TENANT,
          migracion: {
            origenColeccion: `tenants/${sourceTenant}/inventario`,
            origenDocId: doc.id,
            origenColumna: data.origenColumna || null,
            fechaMigracion: FieldValue.serverTimestamp(),
          },
          
          auditoria: {
            creadoPor: 'sync-flota-pro',
            createdAt: toTimestamp(data.createdAt) || FieldValue.serverTimestamp(),
            actualizadoPor: 'sync-flota-pro',
            updatedAt: FieldValue.serverTimestamp(),
          },
          
          searchTerms: generarSearchTerms(data),
        };
        
        const cleanData = Object.fromEntries(
          Object.entries(equipoData).filter(([_, v]) => v !== null && v !== undefined)
        );
        
        const newDocRef = equiposDestRef.doc();
        await addToBatch(batchManager, 'set', newDocRef, cleanData);
        stats.equiposCreados++;
        
        logVerbose(`Inventario ${doc.id} (${data.tipo || 'tipo?'}) → migrado`);
        
      } catch (error) {
        const errorMsg = `Error migrando inventario ${doc.id}: ${error}`;
        stats.errores.push(errorMsg);
        stats.equiposFallidos++;
        log(errorMsg, 'error');
      }
    }
  }
  
  await flushBatch(batchManager);
  log(`\n✅ Migración de equipos completada: ${stats.equiposCreados} equipos`, 'success');
}

/**
 * Mapea estados antiguos de inventario al nuevo modelo
 */
function mapearEstadoInventario(estado?: string): string {
  const mapeo: Record<string, string> = {
    'instalado': 'en_servicio',
    'almacen': 'en_almacen',
    'reparacion': 'en_laboratorio',
    'baja': 'baja',
  };
  return mapeo[estado || ''] || 'en_servicio';
}

/**
 * Genera términos de búsqueda para el equipo
 */
function generarSearchTerms(data: Record<string, unknown>): string[] {
  const terms: string[] = [];
  
  const campos = ['codigoInterno', 'numeroSerieFabricante', 'serie', 'tipo', 
                  'tipoEquipoNombre', 'descripcion', 'sku'];
  
  for (const campo of campos) {
    const valor = data[campo];
    if (typeof valor === 'string' && valor.length > 0) {
      terms.push(valor.toLowerCase());
    }
  }
  
  return [...new Set(terms)];
}

// =============================================================================
// FASE 3: SINCRONIZACIÓN Y DENORMALIZACIÓN
// =============================================================================

async function sincronizarAutobuses(stats: MigrationStats): Promise<void> {
  logSection('FASE 3: Sincronización y Denormalización');
  
  const batchManager = createBatchManager();
  
  const autobusesRef = db.collection(`tenants/${CONFIG.TARGET_TENANT}/autobuses`);
  const equiposRef = db.collection(`tenants/${CONFIG.TARGET_TENANT}/equipos`);
  
  const autobusesSnapshot = await autobusesRef.get();
  log(`Procesando ${autobusesSnapshot.size} autobuses para sincronización`, 'info');
  
  for (const busDoc of autobusesSnapshot.docs) {
    const busData = busDoc.data();
    const busId = busDoc.id;
    const busCodigo = busData.codigo || busId;
    
    try {
      // Buscar equipos vinculados a este bus
      // Pueden estar por ubicacionActual.id o ubicacionActual.nombre
      const equiposQuery1 = equiposRef.where('ubicacionActual.id', '==', busId);
      const equiposQuery2 = equiposRef.where('ubicacionActual.id', '==', busCodigo);
      const equiposQuery3 = equiposRef.where('ubicacionActual.nombre', '==', `BUS-${busCodigo}`);
      
      const [snap1, snap2, snap3] = await Promise.all([
        equiposQuery1.get(),
        equiposQuery2.get(),
        equiposQuery3.get(),
      ]);
      
      // Unificar resultados (evitar duplicados)
      const equiposMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach(doc => {
        equiposMap.set(doc.id, doc);
      });
      
      const equiposDocs = Array.from(equiposMap.values());
      
      // Generar resumen de equipos (sin campos undefined)
      const equiposResumen: EquipoResumen[] = equiposDocs.map(doc => {
        const eqData = doc.data()!;
        const resumen: EquipoResumen = {
          id: doc.id,
          tipo: eqData.tipoEquipoNombre || eqData.tipoEquipoId || 'Desconocido',
          estado: eqData.estado || 'en_servicio',
        };
        // Solo añadir campos opcionales si tienen valor
        if (eqData.numeroSerieFabricante) {
          resumen.serie = eqData.numeroSerieFabricante;
        }
        if (eqData.ubicacionActual?.posicionEnBus) {
          resumen.posicion = eqData.ubicacionActual.posicionEnBus;
        }
        return resumen;
      });
      
      // Actualizar autobús
      const updateData: Record<string, unknown> = {
        'contadores.totalEquipos': equiposDocs.length,
        equiposResumen: equiposResumen,
        'auditoria.actualizadoPor': 'sync-flota-pro',
        'auditoria.updatedAt': FieldValue.serverTimestamp(),
      };
      
      await addToBatch(batchManager, 'update', busDoc.ref, updateData);
      stats.autobusesActualizados++;
      
      logVerbose(`Bus ${busCodigo}: ${equiposDocs.length} equipos vinculados`);
      
    } catch (error) {
      const errorMsg = `Error sincronizando bus ${busId}: ${error}`;
      stats.errores.push(errorMsg);
      log(errorMsg, 'error');
    }
  }
  
  await flushBatch(batchManager);
  log(`\n✅ Sincronización completada: ${stats.autobusesActualizados} autobuses actualizados`, 'success');
}

// =============================================================================
// FASE 4: LIMPIEZA DE DATOS ANTIGUOS
// =============================================================================

async function limpiarDatosAntiguos(stats: MigrationStats): Promise<void> {
  logSection('FASE 4: Limpieza de Datos Antiguos');
  
  if (CONFIG.SKIP_DELETE) {
    log('⏭️  Limpieza omitida (--skip-delete)', 'warn');
    return;
  }
  
  const batchManager = createBatchManager();
  
  // 4.1 Eliminar activos de tenants antiguos
  for (const sourceTenant of CONFIG.SOURCE_TENANTS) {
    log(`\n🗑️  Limpiando tenant: ${sourceTenant}`, 'info');
    
    // Eliminar activos
    const activosRef = db.collection(`tenants/${sourceTenant}/activos`);
    const activosSnapshot = await activosRef.get();
    
    for (const doc of activosSnapshot.docs) {
      await addToBatch(batchManager, 'delete', doc.ref);
      stats.documentosEliminados++;
    }
    log(`   Eliminados ${activosSnapshot.size} activos`, 'info');
    
    // Eliminar inventario
    const inventarioRef = db.collection(`tenants/${sourceTenant}/inventario`);
    const inventarioSnapshot = await inventarioRef.get();
    
    for (const doc of inventarioSnapshot.docs) {
      await addToBatch(batchManager, 'delete', doc.ref);
      stats.documentosEliminados++;
    }
    log(`   Eliminados ${inventarioSnapshot.size} items de inventario`, 'info');
  }
  
  // 4.2 Eliminar colección raíz 'equipos' (migrados a tenant)
  log(`\n🗑️  Limpiando colección raíz: equipos`, 'info');
  const equiposRaizRef = db.collection('equipos');
  const equiposRaizSnapshot = await equiposRaizRef.get();
  
  for (const doc of equiposRaizSnapshot.docs) {
    await addToBatch(batchManager, 'delete', doc.ref);
    stats.documentosEliminados++;
  }
  log(`   Eliminados ${equiposRaizSnapshot.size} equipos de raíz`, 'info');
  
  await flushBatch(batchManager);
  log(`\n✅ Limpieza completada: ${stats.documentosEliminados} documentos eliminados`, 'success');
}

// =============================================================================
// FASE 5: AUDITORÍA FINAL
// =============================================================================

async function registrarAuditoria(stats: MigrationStats): Promise<void> {
  logSection('FASE 5: Registro de Auditoría');
  
  const auditoriaRef = db.collection(`tenants/${CONFIG.TARGET_TENANT}/auditoria`);
  
  const auditLog = {
    entidad: 'sistema',
    entidadId: 'migracion-flota',
    accion: 'importacion_masiva',
    
    actor: {
      uid: 'script:sync-flota-pro',
      email: 'sistema@zaintzabus.com',
      rol: 'admin',
    },
    
    cambios: [
      {
        campo: 'autobuses_creados',
        valorAnterior: null,
        valorNuevo: stats.autobusesCreados,
      },
      {
        campo: 'equipos_creados',
        valorAnterior: null,
        valorNuevo: stats.equiposCreados,
      },
      {
        campo: 'autobuses_sincronizados',
        valorAnterior: null,
        valorNuevo: stats.autobusesActualizados,
      },
      {
        campo: 'documentos_eliminados',
        valorAnterior: null,
        valorNuevo: stats.documentosEliminados,
      },
    ],
    
    motivoCambio: 'Migración masiva de flota al tenant normalizado ekialdebus-26',
    
    metadata: {
      script: 'sync-flota-pro.ts',
      version: '1.0.0',
      tenantDestino: CONFIG.TARGET_TENANT,
      tenantsOrigen: CONFIG.SOURCE_TENANTS,
      dryRun: CONFIG.DRY_RUN,
      errores: stats.errores.length,
      detalleErrores: stats.errores.slice(0, 10), // Primeros 10 errores
    },
    
    timestamp: FieldValue.serverTimestamp(),
    tenantId: CONFIG.TARGET_TENANT,
  };
  
  if (!CONFIG.DRY_RUN) {
    await auditoriaRef.add(auditLog);
  }
  
  log('✅ Auditoría registrada', 'success');
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           SYNC-FLOTA-PRO - ZaintzaBus Data Migration                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  if (CONFIG.DRY_RUN) {
    log('🔍 MODO DRY-RUN: No se realizarán cambios en la base de datos', 'warn');
  }
  
  log(`📍 Tenant destino: ${CONFIG.TARGET_TENANT}`, 'info');
  log(`📂 Tenants origen: ${CONFIG.SOURCE_TENANTS.join(', ')}`, 'info');
  log(`📦 Batch size: ${CONFIG.BATCH_SIZE}`, 'info');
  
  const stats: MigrationStats = {
    autobusesCreados: 0,
    autobusesFallidos: 0,
    equiposCreados: 0,
    equiposFallidos: 0,
    documentosEliminados: 0,
    autobusesActualizados: 0,
    errores: [],
  };
  
  const startTime = Date.now();
  
  try {
    // Fase 1: Migrar activos a autobuses
    const busIdMap = await migrarActivos(stats);
    
    // Fase 2: Migrar equipos
    await migrarEquipos(stats, busIdMap);
    
    // Fase 3: Sincronizar y denormalizar
    await sincronizarAutobuses(stats);
    
    // Fase 4: Limpiar datos antiguos
    await limpiarDatosAntiguos(stats);
    
    // Fase 5: Registrar auditoría
    await registrarAuditoria(stats);
    
  } catch (error) {
    log(`Error fatal: ${error}`, 'error');
    stats.errores.push(`Error fatal: ${error}`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Resumen final
  logSection('RESUMEN FINAL');
  console.log('\n');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│              ESTADÍSTICAS                   │');
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  🚌 Autobuses creados:      ${String(stats.autobusesCreados).padStart(10)}    │`);
  console.log(`│  🔧 Equipos creados:        ${String(stats.equiposCreados).padStart(10)}    │`);
  console.log(`│  🔄 Autobuses sincronizados:${String(stats.autobusesActualizados).padStart(10)}    │`);
  console.log(`│  🗑️  Documentos eliminados: ${String(stats.documentosEliminados).padStart(10)}    │`);
  console.log(`│  ❌ Errores:                ${String(stats.errores.length).padStart(10)}    │`);
  console.log(`│  ⏱️  Duración:              ${String(duration + 's').padStart(10)}    │`);
  console.log('└─────────────────────────────────────────────┘');
  
  if (stats.errores.length > 0) {
    console.log('\n❌ ERRORES ENCONTRADOS:');
    stats.errores.slice(0, 20).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
    if (stats.errores.length > 20) {
      console.log(`   ... y ${stats.errores.length - 20} errores más`);
    }
  }
  
  if (CONFIG.DRY_RUN) {
    console.log('\n⚠️  MODO DRY-RUN: No se aplicaron cambios. Ejecuta sin --dry-run para aplicar.');
  }
  
  console.log('\n✅ Script finalizado.\n');
}

// Ejecutar
main().catch(console.error);
