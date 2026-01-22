# ZaintzaBus - Plan de Implementación

## F) Fases del MVP

### Fase 1: Fundamentos (Semana 1-2)
**Objetivo:** Infraestructura, auth y estructura base

| Entregable | Descripción | Prioridad |
|------------|-------------|-----------|
| Setup proyecto | Next.js + Firebase + Tailwind | P0 |
| Firebase config | Firestore, Auth, Rules básicas | P0 |
| Sistema Auth | Login, roles, custom claims | P0 |
| Layout base | Sidebar, header, protección rutas | P0 |
| Modelo usuarios | CRUD usuarios + asignación roles | P0 |
| Dashboard shell | Estructura sin datos reales | P1 |

**Criterios de aceptación:**
- Usuario puede loguearse con email/password
- Rutas protegidas por rol
- Claims se asignan correctamente
- Layout responsive funcional

---

### Fase 2: Core Incidencias (Semana 3-4)
**Objetivo:** Módulo completo de incidencias con SLA

| Entregable | Descripción | Prioridad |
|------------|-------------|-----------|
| Modelo incidencias | Colección + tipos TypeScript | P0 |
| Lista incidencias | Tabla con filtros, paginación | P0 |
| Crear incidencia | Formulario completo | P0 |
| Detalle incidencia | Vista + edición estados | P0 |
| Flujo estados | Transiciones + timestamps auto | P0 |
| Cálculo SLA | Cloud Function trigger | P0 |
| Auditoría básica | Log de cambios de estado | P1 |

**Criterios de aceptación:**
- CRUD completo funcional
- Estados cambian correctamente
- Timestamps se registran automáticamente
- Métricas SLA se calculan
- Log de auditoría se genera

---

### Fase 3: Inventario + Activos (Semana 5-6)
**Objetivo:** Gestión de stock y flota

| Entregable | Descripción | Prioridad |
|------------|-------------|-----------|
| Modelo inventario | Colección + movimientos | P0 |
| Lista inventario | Por estado, categoría | P0 |
| CRUD componentes | Alta, edición, movimientos | P0 |
| Trazabilidad | Historial movimientos | P0 |
| Modelo activos | Vehículos + equipos | P0 |
| Lista activos | Flota con equipos instalados | P0 |
| Vinculación | Incidencia ↔ Activo ↔ Inventario | P1 |

**Criterios de aceptación:**
- Inventario en tiempo real
- Movimientos con trazabilidad
- Estados: instalado/almacén/reparación
- Relación con incidencias

---

### Fase 4: Preventivo + Dashboard (Semana 7-8)
**Objetivo:** Planificación y métricas

| Entregable | Descripción | Prioridad |
|------------|-------------|-----------|
| Modelo preventivo | Planes + periodicidades | P0 |
| Planificador | CRUD planes preventivos | P0 |
| Generación OT | Cloud Function scheduled | P0 |
| Ejecución | Checklist + registro | P1 |
| Dashboard KPIs | SLA, disponibilidad, abiertas | P0 |
| Gráficos | Tendencias últimos 30 días | P1 |
| Alertas | Indicadores visuales SLA | P1 |

**Criterios de aceptación:**
- Planes con periodicidad 3M/6M/1A/2A
- OT preventivas se generan automáticamente
- Dashboard muestra métricas reales
- Filtro por período

---

### Fase 5: Informes + Auditoría (Semana 9-10)
**Objetivo:** Exportación y trazabilidad completa

| Entregable | Descripción | Prioridad |
|------------|-------------|-----------|
| Exportar CSV | Incidencias, inventario, SLA | P0 |
| Exportar PDF | Informes formateados | P1 |
| Vista auditoría | Log con filtros | P0 |
| Auditoría completa | Todos los campos críticos | P0 |
| Filtros avanzados | Por entidad, fecha, usuario | P1 |

**Criterios de aceptación:**
- CSV descargable con todos los campos
- PDF con logo y formato DFG
- Auditoría completa y consultable

---

### Fase 6: Multi-tenant + Refinamiento (Semana 11-12)
**Objetivo:** Preparación producción

| Entregable | Descripción | Prioridad |
|------------|-------------|-----------|
| Segregación datos | Por tenant correcta | P0 |
| Vista DFG global | Cross-tenant para DFG | P0 |
| Admin tenants | CRUD operadores | P1 |
| Optimización | Índices, caché, lecturas | P0 |
| Testing | E2E flujos críticos | P0 |
| Documentación | Manual usuario/admin | P1 |

**Criterios de aceptación:**
- Datos segregados por operador
- DFG ve todos los tenants
- Performance aceptable (<2s carga)

---

## Resumen de Prioridades

```
P0 = Bloqueante/Crítico (debe estar para MVP)
P1 = Importante (mejora significativa)
P2 = Nice-to-have (post-MVP)
```

## Dependencias entre Módulos

```
Auth ──────┐
           ▼
       Dashboard ◄──── Incidencias ◄──── Inventario
           │               │                  │
           │               ▼                  │
           │          Activos ◄───────────────┘
           │               │
           ▼               ▼
       Informes ◄──── Preventivo
           │
           ▼
       Auditoría
```

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tiempo carga dashboard | < 2 segundos |
| Disponibilidad app | 99.9% |
| Coste Firestore mensual | < 50€ (estimado) |
| Satisfacción usuarios | > 4/5 |
