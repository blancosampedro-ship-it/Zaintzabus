/**
 * =============================================================================
 * SYNC-ONLY - Script de Sincronización de Equipos en Autobuses
 * =============================================================================
 * 
 * Este script SOLO sincroniza:
 * - Busca equipos vinculados a cada autobús
 * - Actualiza contadores.totalEquipos
 * - Genera el array equiposResumen[]
 * 
 * EJECUCIÓN:
 *   npx tsx scripts/sync-only.ts
 *   npx tsx scripts/sync-only.ts --dry-run
 * 
 * =============================================================================
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const CONFIG = {
  TENANT: 'ekialdebus-26',
  BATCH_SIZE: 400,
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  DELAY_MS: 500, // Delay entre buses para evitar quota exceeded
};

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccountPath) });
}
const db = getFirestore();

interface EquipoResumen {
  id: string;
  tipo: string;
  serie?: string;
  estado: string;
  posicion?: string;
}

function log(msg: string, type: 'info' | 'success' | 'error' = 'info') {
  const icons = { info: '📋', success: '✅', error: '❌' };
  console.log(`${icons[type]} ${msg}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         SYNC-ONLY - Sincronización de Equipos              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (CONFIG.DRY_RUN) {
    log('MODO DRY-RUN: No se aplicarán cambios', 'info');
  }

  const autobusesRef = db.collection(`tenants/${CONFIG.TENANT}/autobuses`);
  const equiposRef = db.collection(`tenants/${CONFIG.TENANT}/equipos`);

  const autobusesSnap = await autobusesRef.get();
  log(`Encontrados ${autobusesSnap.size} autobuses en ${CONFIG.TENANT}`, 'info');

  let batch = db.batch();
  let opCount = 0;
  let actualizados = 0;
  let errores = 0;

  for (const busDoc of autobusesSnap.docs) {
    const busData = busDoc.data();
    const busId = busDoc.id;
    const busCodigo = busData.codigo || busId;

    // Skip buses que ya tienen equiposResumen (ya sincronizados)
    if (busData.equiposResumen && busData.equiposResumen.length > 0) {
      if (CONFIG.VERBOSE) console.log(`   ⏭️  Bus ${busCodigo}: ya sincronizado (${busData.equiposResumen.length} equipos)`);
      actualizados++;
      continue;
    }

    try {
      // Throttle para evitar quota exceeded
      await sleep(CONFIG.DELAY_MS);
      // Buscar equipos por múltiples criterios
      const [snap1, snap2, snap3] = await Promise.all([
        equiposRef.where('ubicacionActual.id', '==', busId).get(),
        equiposRef.where('ubicacionActual.id', '==', busCodigo).get(),
        equiposRef.where('ubicacionActual.nombre', '==', `BUS-${busCodigo}`).get(),
      ]);

      // Unificar (evitar duplicados)
      const equiposMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach(doc => {
        equiposMap.set(doc.id, doc);
      });
      const equiposDocs = Array.from(equiposMap.values());

      // Generar resumen
      const equiposResumen: EquipoResumen[] = equiposDocs.map(doc => {
        const eq = doc.data()!;
        const resumen: EquipoResumen = {
          id: doc.id,
          tipo: eq.tipoEquipoNombre || eq.tipoEquipoId || 'Desconocido',
          estado: eq.estado || 'en_servicio',
        };
        if (eq.numeroSerieFabricante) resumen.serie = eq.numeroSerieFabricante;
        if (eq.ubicacionActual?.posicionEnBus) resumen.posicion = eq.ubicacionActual.posicionEnBus;
        return resumen;
      });

      // Preparar update
      const updateData = {
        'contadores.totalEquipos': equiposDocs.length,
        equiposResumen,
        'auditoria.actualizadoPor': 'sync-only',
        'auditoria.updatedAt': FieldValue.serverTimestamp(),
      };

      if (!CONFIG.DRY_RUN) {
        batch.update(busDoc.ref, updateData);
        opCount++;

        if (opCount >= CONFIG.BATCH_SIZE) {
          await batch.commit();
          log(`💾 Batch commit (${opCount} ops)`, 'info');
          batch = db.batch();
          opCount = 0;
        }
      }

      actualizados++;
      if (CONFIG.VERBOSE || equiposDocs.length > 0) {
        console.log(`   🚌 Bus ${busCodigo}: ${equiposDocs.length} equipos`);
      }

    } catch (error) {
      console.error(`   ❌ Error en bus ${busId}: ${error}`);
      errores++;
    }
  }

  // Commit final
  if (opCount > 0 && !CONFIG.DRY_RUN) {
    await batch.commit();
    log(`💾 Batch final (${opCount} ops)`, 'info');
  }

  // Resumen
  console.log('\n┌─────────────────────────────────────┐');
  console.log('│           RESUMEN                   │');
  console.log('├─────────────────────────────────────┤');
  console.log(`│  ✅ Autobuses actualizados: ${String(actualizados).padStart(5)} │`);
  console.log(`│  ❌ Errores:                ${String(errores).padStart(5)} │`);
  console.log('└─────────────────────────────────────┘');

  if (CONFIG.DRY_RUN) {
    console.log('\n⚠️  Ejecuta sin --dry-run para aplicar cambios.\n');
  } else {
    log('Sincronización completada.\n', 'success');
  }
}

main().catch(console.error);
