# Manual de Usuario - ZaintzaBus

Sistema de Gestión de Mantenimiento de Flota

---

## 📚 Índice

1. [Primeros Pasos](#primeros-pasos)
2. [Dashboard](#dashboard)
3. [Gestión de Incidencias](#gestión-de-incidencias)
4. [Mantenimiento Preventivo](#mantenimiento-preventivo)
5. [Inventario](#inventario)
6. [Gestión de Activos](#gestión-de-activos)
7. [Administración](#administración)
8. [Atajos de Teclado](#atajos-de-teclado)

---

## Primeros Pasos

### Inicio de Sesión

1. Accede a la URL del sistema
2. Introduce tu email y contraseña
3. Haz clic en "Iniciar Sesión"

Si has olvidado tu contraseña, contacta con el administrador.

### Navegación Principal

El menú lateral izquierdo contiene las secciones principales:
- **Dashboard**: Vista general y KPIs
- **Incidencias**: Gestión de averías y fallos
- **Preventivo**: Mantenimientos programados
- **Inventario**: Control de repuestos
- **Activos**: Flota y equipamiento

---

## Dashboard

El Dashboard muestra una vista general del estado del sistema:

### KPIs Principales
- **Incidencias Abiertas**: Número de incidencias sin resolver
- **SLA Cumplimiento**: Porcentaje de incidencias resueltas en tiempo
- **Preventivos Pendientes**: Mantenimientos próximos
- **Alertas de Stock**: Artículos por debajo del mínimo

### Actividad Reciente
Muestra las últimas acciones realizadas en el sistema.

### Acciones Rápidas
- Nueva Incidencia
- Nuevo Preventivo
- Ver Alertas

---

## Gestión de Incidencias

### Crear Incidencia

1. Pulsa el botón **"Nueva Incidencia"** o usa `Alt + N`
2. Completa el formulario:
   - **Activo afectado**: Selecciona el autobús o equipo
   - **Descripción**: Detalla el problema (mínimo 10 caracteres)
   - **Categoría de fallo**: Mecánico, eléctrico, software, etc.
   - **Naturaleza**: Avería, fallo leve, consulta
3. La criticidad se calcula automáticamente
4. Pulsa **"Crear Incidencia"**

### Estados de Incidencia

| Estado | Descripción |
|--------|-------------|
| Nueva | Recién creada, pendiente de análisis |
| En Análisis | Técnico evaluando el problema |
| En Intervención | Reparación en curso |
| Resuelta | Reparación completada |
| Cerrada | Verificada y archivada |
| Reabierta | Problema recurrente |

### Vista Kanban

La vista Kanban permite:
- Arrastrar incidencias entre columnas
- Filtrar por criticidad, técnico o activo
- Ver resumen de tiempos SLA

### Buscar Incidencias

Usa la barra de búsqueda o filtra por:
- Estado
- Criticidad
- Activo
- Técnico asignado
- Rango de fechas

---

## Mantenimiento Preventivo

### Crear Preventivo

1. Accede a **Preventivo → Nuevo**
2. Completa:
   - **Nombre**: Identificador del mantenimiento
   - **Activo**: Autobús o equipo
   - **Periodicidad**: Días, semanas, meses o kilómetros
   - **Tareas**: Lista de acciones a realizar
3. Define la fecha de primera ejecución
4. Pulsa **"Crear"**

### Calendario

El calendario muestra:
- Preventivos programados (azul)
- Preventivos vencidos (rojo)
- Preventivos completados (verde)

### Completar Preventivo

1. Abre el preventivo desde el calendario o lista
2. Marca las tareas completadas
3. Añade observaciones si es necesario
4. Pulsa **"Completar"**

El sistema calculará automáticamente la próxima fecha.

---

## Inventario

### Consultar Stock

La tabla de inventario muestra:
- Código y nombre del artículo
- Cantidad actual
- Stock mínimo y máximo
- Estado (Normal, Bajo, Sin Stock)

### Filtros Disponibles
- Categoría
- Estado de stock
- Búsqueda por nombre/código

### Registrar Movimiento

**Entrada de material:**
1. Selecciona el artículo
2. Pulsa "Entrada"
3. Indica cantidad y proveedor
4. Confirma

**Salida de material:**
1. Selecciona el artículo
2. Pulsa "Salida"
3. Indica cantidad y destino (incidencia, preventivo)
4. Confirma

### Alertas de Stock

El sistema genera alertas cuando:
- Stock llega a mínimo (amarillo)
- Stock llega a 0 (rojo)

Las alertas aparecen en el Dashboard y por notificación.

---

## Gestión de Activos

### Tipos de Activos

- **Autobuses**: Vehículos de la flota
- **Equipos**: Validadoras, pantallas, routers, cámaras

### Ver Detalle de Activo

1. Accede a **Activos**
2. Selecciona un activo de la lista
3. Verás:
   - Información general
   - Historial de incidencias
   - Preventivos asociados
   - Equipos instalados (si es autobús)

### Estados de Activo

| Estado | Descripción |
|--------|-------------|
| Operativo | Funcionando correctamente |
| Con Incidencias | Tiene averías pendientes |
| En Mantenimiento | En taller |
| Fuera de Servicio | No disponible |
| Baja | Retirado de servicio |

---

## Administración

### Gestión de Usuarios

*Disponible solo para administradores*

1. Accede a **Admin → Usuarios**
2. Puedes:
   - Ver lista de usuarios
   - Crear nuevo usuario
   - Editar roles
   - Desactivar usuarios

### Roles Disponibles

| Rol | Permisos |
|-----|----------|
| Operador | Crear incidencias, consultar |
| Técnico | + Gestionar incidencias e inventario |
| Jefe Mantenimiento | + Gestionar preventivos y activos |
| Administrador | Acceso completo |

### Importación de Datos

1. Accede a **Admin → Importar**
2. Selecciona tipo: Flota, Técnicos o Histórico
3. Sube archivo Excel
4. Mapea columnas
5. Revisa vista previa
6. Confirma importación

---

## Atajos de Teclado

### Navegación
| Atajo | Acción |
|-------|--------|
| `Alt + H` | Ir al Dashboard |
| `Alt + A` | Ir a Activos |
| `Alt + I` | Ir a Incidencias |
| `Alt + M` | Ir a Mantenimiento |
| `Alt + V` | Ir a Inventario |

### Acciones
| Atajo | Acción |
|-------|--------|
| `Ctrl + K` | Abrir búsqueda global |
| `Alt + N` | Nueva incidencia |
| `Alt + P` | Nuevo preventivo |
| `Shift + ?` | Mostrar ayuda de atajos |
| `Esc` | Cerrar modal |

---

## Preguntas Frecuentes

### ¿Cómo cambio mi contraseña?
Contacta con el administrador del sistema.

### ¿Por qué no puedo crear un activo?
Solo los roles Jefe de Mantenimiento y Administrador pueden crear activos.

### ¿Cómo exporto datos?
Usa la opción de exportar disponible en cada tabla (icono de descarga).

### ¿Qué hago si el sistema está lento?
1. Intenta refrescar la página
2. Verifica tu conexión a internet
3. Si persiste, contacta con soporte

---

## Contacto de Soporte

Para problemas técnicos o consultas:
- Email: soporte@zaintzabus.com
- Teléfono: 943 XXX XXX
- Horario: L-V 8:00-18:00

---

*Versión del manual: 1.0*
*Última actualización: Enero 2026*
