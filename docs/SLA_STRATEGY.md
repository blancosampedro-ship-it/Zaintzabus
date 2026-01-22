# ZaintzaBus - Estrategia SLA

## D) Cálculo de Tiempos y Disponibilidad

### Definiciones Base

| Métrica | Incidencia Crítica | Incidencia Normal |
|---------|-------------------|-------------------|
| Tiempo máximo atención | 30 minutos | 2 horas |
| Tiempo máximo resolución | 4 horas | 24 horas |
| Disponibilidad objetivo | 99.5% | 99.5% |

### Campos Clave para Cálculo

```typescript
interface TimestampsIncidencia {
  recepcion: Timestamp;        // T0: Cuando se registra
  inicioAnalisis: Timestamp;   // T1: Cuando técnico acepta
  finAnalisis: Timestamp;      // T2: Diagnóstico completado
  inicioReparacion: Timestamp; // T3: Comienza intervención
  finReparacion: Timestamp;    // T4: Reparación completada
  cierre: Timestamp;           // T5: Validación y cierre
}

// Métricas calculadas
tiempoAtencion = T1 - T0        // ¿Cumple SLA atención?
tiempoResolucion = T4 - T0      // ¿Cumple SLA resolución?
fueraDeServicio = T4 - T0       // Impacto en disponibilidad
```

### Flujo de Cálculo

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER: onIncidenciaWrite                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Detectar cambio de estado                                   │
│  2. Registrar timestamp correspondiente automáticamente         │
│  3. Calcular métricas SLA si hay timestamps suficientes         │
│  4. Actualizar campo sla{} en el documento                      │
│  5. Escribir en auditoría                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SCHEDULED: calcularSLADiario                    │
│                 (Ejecuta cada día a las 02:00)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Agregar incidencias del día anterior por tenant             │
│  2. Calcular promedios y porcentajes                            │
│  3. Calcular disponibilidad por activo y global                 │
│  4. Guardar en sla_metrics/{periodo}                            │
└─────────────────────────────────────────────────────────────────┘
```

### Cloud Function: Trigger de Incidencia

```typescript
// functions/src/sla/onIncidenciaWrite.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onIncidenciaWrite = functions.firestore
  .document('tenants/{tenantId}/incidencias/{incidenciaId}')
  .onWrite(async (change, context) => {
    const { tenantId, incidenciaId } = context.params;
    
    // Si es eliminación, ignorar
    if (!change.after.exists) return;
    
    const before = change.before.data();
    const after = change.after.data();
    const now = admin.firestore.Timestamp.now();
    
    // Detectar cambio de estado
    if (before?.estado !== after.estado) {
      const updates: Record<string, any> = {
        updatedAt: now,
      };
      
      // Registrar timestamp según el nuevo estado
      switch (after.estado) {
        case 'en_analisis':
          if (!after.timestamps?.inicioAnalisis) {
            updates['timestamps.inicioAnalisis'] = now;
          }
          break;
        case 'en_intervencion':
          if (!after.timestamps?.inicioReparacion) {
            updates['timestamps.inicioReparacion'] = now;
          }
          break;
        case 'resuelta':
          if (!after.timestamps?.finReparacion) {
            updates['timestamps.finReparacion'] = now;
          }
          break;
        case 'cerrada':
          updates['timestamps.cierre'] = now;
          break;
        case 'reabierta':
          updates['timestamps.reapertura'] = now;
          // Reset timestamps de resolución
          updates['timestamps.finReparacion'] = admin.firestore.FieldValue.delete();
          break;
      }
      
      // Calcular SLA si hay datos suficientes
      const slaMetrics = await calcularSLAIncidencia(
        after,
        updates,
        tenantId
      );
      
      if (slaMetrics) {
        updates.sla = slaMetrics;
      }
      
      // Aplicar actualizaciones
      await change.after.ref.update(updates);
      
      // Auditoría
      await registrarAuditoria({
        entidad: 'incidencia',
        entidadId: incidenciaId,
        accion: 'cambio_estado',
        usuarioId: after.updatedBy || 'system',
        tenantId,
        cambios: [
          {
            campo: 'estado',
            valorAnterior: before?.estado || null,
            valorNuevo: after.estado
          }
        ]
      });
    }
  });

async function calcularSLAIncidencia(
  incidencia: any,
  updates: Record<string, any>,
  tenantId: string
) {
  // Obtener configuración SLA
  const slaConfigDoc = await db.doc(`sla_config/${tenantId}`).get();
  const slaConfig = slaConfigDoc.data() || getDefaultSLAConfig();
  
  const timestamps = {
    ...incidencia.timestamps,
    ...extractTimestamps(updates)
  };
  
  if (!timestamps.recepcion) return null;
  
  const criticidad = incidencia.criticidad || 'normal';
  const tiemposMax = slaConfig.tiempos[criticidad];
  
  const sla: Record<string, any> = {};
  
  // Tiempo de atención
  if (timestamps.inicioAnalisis) {
    const atencionMs = timestamps.inicioAnalisis.toMillis() - 
                       timestamps.recepcion.toMillis();
    sla.tiempoAtencion = Math.round(atencionMs / 60000); // minutos
    sla.dentroTiempoAtencion = sla.tiempoAtencion <= tiemposMax.atencion;
  }
  
  // Tiempo de resolución
  if (timestamps.finReparacion) {
    const resolucionMs = timestamps.finReparacion.toMillis() - 
                         timestamps.recepcion.toMillis();
    sla.tiempoResolucion = Math.round(resolucionMs / 60000);
    sla.dentroTiempoResolucion = sla.tiempoResolucion <= tiemposMax.resolucion;
    
    // Fuera de servicio
    sla.fueraDeServicio = sla.tiempoResolucion;
    
    // Cumplimiento global
    sla.cumpleSLA = sla.dentroTiempoAtencion && sla.dentroTiempoResolucion;
  }
  
  return sla;
}

function getDefaultSLAConfig() {
  return {
    tiempos: {
      critica: { atencion: 30, resolucion: 240 },
      normal: { atencion: 120, resolucion: 1440 }
    }
  };
}
```

### Cloud Function: Cálculo Diario Agregado

```typescript
// functions/src/sla/calcularSLADiario.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const calcularSLADiario = functions.pubsub
  .schedule('0 2 * * *')  // Cada día a las 02:00
  .timeZone('Europe/Madrid')
  .onRun(async () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Obtener todos los tenants
    const tenantsSnap = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      await calcularMetricasTenant(tenantId, ayer, hoy);
    }
  });

async function calcularMetricasTenant(
  tenantId: string,
  desde: Date,
  hasta: Date
) {
  const periodo = formatPeriodo(desde);
  
  // Incidencias cerradas o resueltas en el período
  const incidenciasSnap = await db
    .collection(`tenants/${tenantId}/incidencias`)
    .where('timestamps.finReparacion', '>=', admin.firestore.Timestamp.fromDate(desde))
    .where('timestamps.finReparacion', '<', admin.firestore.Timestamp.fromDate(hasta))
    .get();
  
  if (incidenciasSnap.empty) return;
  
  const incidencias = incidenciasSnap.docs.map(d => d.data());
  
  // Calcular métricas
  const criticas = incidencias.filter(i => i.criticidad === 'critica');
  const normales = incidencias.filter(i => i.criticidad === 'normal');
  
  const metrics = {
    periodo,
    tipo: 'diario',
    totalIncidencias: incidencias.length,
    incidenciasCriticas: criticas.length,
    incidenciasNormales: normales.length,
    
    tiempoAtencionPromedio: promedio(incidencias, 'sla.tiempoAtencion'),
    tiempoResolucionPromedio: promedio(incidencias, 'sla.tiempoResolucion'),
    tiempoFueraServicioPromedio: promedio(incidencias, 'sla.fueraDeServicio'),
    
    incidenciasDentroSLA: incidencias.filter(i => i.sla?.cumpleSLA).length,
    porcentajeCumplimientoSLA: (incidencias.filter(i => i.sla?.cumpleSLA).length / incidencias.length) * 100,
    
    slaDetalle: {
      criticas: calcularDetalle(criticas),
      normales: calcularDetalle(normales)
    },
    
    disponibilidadGlobal: await calcularDisponibilidad(tenantId, desde, hasta),
    
    tenantId,
    calculadoAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await db.doc(`tenants/${tenantId}/sla_metrics/${periodo}`).set(metrics);
}

function promedio(items: any[], campo: string): number {
  const valores = items
    .map(i => getNestedValue(i, campo))
    .filter(v => v != null);
  
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

function calcularDetalle(incidencias: any[]) {
  if (incidencias.length === 0) {
    return { total: 0, dentroSLA: 0, tiempoAtencionPromedio: 0, tiempoResolucionPromedio: 0 };
  }
  
  return {
    total: incidencias.length,
    dentroSLA: incidencias.filter(i => i.sla?.cumpleSLA).length,
    tiempoAtencionPromedio: promedio(incidencias, 'sla.tiempoAtencion'),
    tiempoResolucionPromedio: promedio(incidencias, 'sla.tiempoResolucion')
  };
}

async function calcularDisponibilidad(
  tenantId: string,
  desde: Date,
  hasta: Date
): Promise<number> {
  // Obtener activos
  const activosSnap = await db
    .collection(`tenants/${tenantId}/activos`)
    .where('estado', '!=', 'baja')
    .get();
  
  const totalActivos = activosSnap.size;
  if (totalActivos === 0) return 100;
  
  // Horas totales disponibles (por activo)
  const horasDia = 24; // O usar horario de servicio
  const horasTotales = totalActivos * horasDia;
  
  // Horas fuera de servicio
  const incidenciasSnap = await db
    .collection(`tenants/${tenantId}/incidencias`)
    .where('timestamps.recepcion', '>=', admin.firestore.Timestamp.fromDate(desde))
    .where('timestamps.recepcion', '<', admin.firestore.Timestamp.fromDate(hasta))
    .get();
  
  let minutosFuera = 0;
  incidenciasSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.sla?.fueraDeServicio) {
      minutosFuera += data.sla.fueraDeServicio;
    }
  });
  
  const horasFuera = minutosFuera / 60;
  const disponibilidad = ((horasTotales - horasFuera) / horasTotales) * 100;
  
  return Math.round(disponibilidad * 100) / 100;
}

function formatPeriodo(fecha: Date): string {
  return fecha.toISOString().split('T')[0]; // "2024-01-15"
}
```

### Versionado de SLA Config

```typescript
// Para mantener histórico de configuraciones SLA
interface SLAConfigVersion {
  version: number;
  vigenciaDesde: Timestamp;
  vigenciaHasta?: Timestamp;
  config: SLAConfig;
  modificadoPor: string;
  motivo: string;
}

// Colección: sla_config/{tenantId}/versiones/{versionId}
```

### Dashboard: Queries para KPIs

```typescript
// Disponibilidad últimos 30 días
const getLast30DaysMetrics = async (tenantId: string) => {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  
  const metricsSnap = await db
    .collection(`tenants/${tenantId}/sla_metrics`)
    .where('tipo', '==', 'diario')
    .where('calculadoAt', '>=', hace30Dias)
    .orderBy('calculadoAt', 'desc')
    .get();
  
  return metricsSnap.docs.map(d => d.data());
};

// Incidencias abiertas ahora
const getIncidenciasAbiertas = async (tenantId: string) => {
  return await db
    .collection(`tenants/${tenantId}/incidencias`)
    .where('estado', 'in', ['nueva', 'en_analisis', 'en_intervencion'])
    .orderBy('timestamps.recepcion', 'desc')
    .get();
};

// Incidencias fuera de SLA
const getIncidenciasFueraSLA = async (tenantId: string) => {
  const ahora = new Date();
  
  // Obtener config
  const config = await getSLAConfig(tenantId);
  
  // Incidencias abiertas que superan tiempo
  const abiertas = await db
    .collection(`tenants/${tenantId}/incidencias`)
    .where('estado', 'in', ['nueva', 'en_analisis', 'en_intervencion'])
    .get();
  
  return abiertas.docs.filter(doc => {
    const data = doc.data();
    const recepcion = data.timestamps.recepcion.toDate();
    const minutosTranscurridos = (ahora.getTime() - recepcion.getTime()) / 60000;
    const tiempoMax = config.tiempos[data.criticidad].resolucion;
    
    return minutosTranscurridos > tiempoMax;
  });
};
```

### Alertas de SLA

```typescript
// functions/src/sla/alertasSLA.ts
export const verificarAlertasSLA = functions.pubsub
  .schedule('*/15 * * * *')  // Cada 15 minutos
  .onRun(async () => {
    const tenantsSnap = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const config = await getSLAConfig(tenantId);
      
      // Incidencias próximas a vencer
      const incidencias = await getIncidenciasProximasVencer(tenantId, config);
      
      for (const inc of incidencias) {
        await enviarAlertaSLA(inc, tenantId);
      }
    }
  });

async function getIncidenciasProximasVencer(tenantId: string, config: any) {
  const ahora = new Date();
  const incidenciasSnap = await db
    .collection(`tenants/${tenantId}/incidencias`)
    .where('estado', 'in', ['nueva', 'en_analisis', 'en_intervencion'])
    .get();
  
  return incidenciasSnap.docs.filter(doc => {
    const data = doc.data();
    const recepcion = data.timestamps.recepcion.toDate();
    const minutosTranscurridos = (ahora.getTime() - recepcion.getTime()) / 60000;
    const tiempoMax = config.tiempos[data.criticidad].resolucion;
    const porcentajeConsumido = (minutosTranscurridos / tiempoMax) * 100;
    
    // Alertar al 80% del tiempo
    return porcentajeConsumido >= 80 && porcentajeConsumido < 100;
  }).map(d => ({ id: d.id, ...d.data() }));
}
```
