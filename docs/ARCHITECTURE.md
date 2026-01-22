# ZaintzaBus - Arquitectura del Sistema

## A) Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   /login    │  │ /dashboard  │  │/incidencias │  │  /inventario        │ │
│  │   Auth UI   │  │ KPIs + SLA  │  │ CRUD + Flow │  │  Stock + Moves      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  /activos   │  │ /preventivo │  │  /informes  │  │  /admin/usuarios    │ │
│  │ Flota+Equip │  │ Planificador│  │ Export CSV  │  │  Gestión Roles      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIREBASE SERVICES                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Firebase Auth  │  │    Firestore    │  │    Cloud Functions          │  │
│  │  + Custom Claims│  │  (Base de datos)│  │    (Triggers + Scheduled)   │  │
│  │                 │  │                 │  │                             │  │
│  │  Roles:         │  │  Colecciones:   │  │  - onIncidenciaWrite        │  │
│  │  - dfg          │  │  - usuarios     │  │  - calcularSLADiario        │  │
│  │  - operador     │  │  - incidencias  │  │  - generarPreventivos       │  │
│  │  - jefe_mant    │  │  - inventario   │  │  - sincronizarInventario    │  │
│  │  - tecnico      │  │  - activos      │  │  - auditLogger              │  │
│  │  - soporte_sw   │  │  - preventivos  │  │                             │  │
│  │                 │  │  - auditoria    │  │                             │  │
│  │                 │  │  - sla_metrics  │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐   │
│  │ Cloud Storage   │  │              Firebase Hosting                    │   │
│  │ (Adjuntos/Docs) │  │              (Next.js SSR/SSG)                   │   │
│  └─────────────────┘  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujos Principales

### 1. Flujo de Incidencia (Correctivo)
```
[Alarma/Manual] → Nueva → En Análisis → En Intervención → Resuelta → Cerrada
                    │                         │                │
                    ▼                         ▼                ▼
              (t_recepcion)            (t_inicio_rep)    (t_fin_rep)
                    │                         │                │
                    └─────────────────────────┴────────────────┘
                              Cálculo SLA automático
```

### 2. Flujo de Inventario
```
[Alta Componente] → Almacén ←→ Instalado ←→ En Reparación → Baja
                        │           │              │
                        ▼           ▼              ▼
                   (movimiento) (movimiento)  (movimiento)
                        │           │              │
                        └───────────┴──────────────┘
                            Trazabilidad completa
```

### 3. Flujo Preventivo
```
[Planificador] → Genera OT Preventiva → Técnico ejecuta → Cierre + Registro
      │                   │                    │               │
      ▼                   ▼                    ▼               ▼
(periodicidad)      (checklist)         (materiales)     (próxima fecha)
```

## Decisiones Arquitectónicas

| Decisión | Justificación |
|----------|---------------|
| Next.js App Router | SSR para SEO, RSC para rendimiento, mejor DX |
| Firestore | Tiempo real, escalable, coste predecible |
| Custom Claims | Roles nativos en token, sin lecturas extra |
| Cloud Functions | Lógica servidor, triggers automáticos |
| Timestamps servidor | Integridad temporal para SLA |
| Soft deletes | Auditoría completa, recuperación |

## Segregación Multi-tenant

```
tenants/{tenantId}/
  ├── incidencias/
  ├── inventario/
  ├── activos/
  └── preventivos/

global/
  ├── usuarios/          (todos los usuarios, campo tenantId)
  ├── auditoria/         (log centralizado)
  └── sla_config/        (configuración SLA por tenant)
```

DFG tiene claim `dfg: true` que permite lectura cross-tenant.
