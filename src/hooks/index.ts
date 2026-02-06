/**
 * Hooks de datos y acciones para ZaintzaBus.
 *
 * Decisión técnica: hooks nativos en lugar de React Query/SWR porque:
 * - El proyecto no usa esas librerías actualmente (evitamos dependencias).
 * - Los servicios de Firestore ya ofrecen listeners realtime (`onSnapshot`).
 * - Para la escala actual, hooks nativos con useState/useEffect son suficientes.
 * - Se puede migrar a React Query en el futuro si se necesita cache avanzado.
 *
 * Convenciones:
 * - `use<Entity>` para obtener uno por ID.
 * - `use<Entities>` para listas (con filtros opcionales).
 * - `use<Accion>` para operaciones de escritura.
 * - Todos devuelven `{ data, loading, error, refetch? }` o similar.
 */

export * from './useDebounce';

// Cache and pagination
export {
  useCache,
  usePagination,
  useInfiniteScroll,
  clearCache,
  clearCacheByPrefix,
} from './useCache';

// Keyboard shortcuts
export {
  useKeyboardShortcut,
  useKeyboardShortcuts,
  useAppShortcuts,
  useEscapeKey,
  useEnterKey,
  getRegisteredShortcuts,
} from './useKeyboardShortcuts';

// Toast notifications
export { useToast, ToastProvider, type Toast } from './useToast';

// Media queries
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  usePrefersDarkMode,
  usePrefersReducedMotion,
} from './useMediaQuery';

// Local storage
export { useLocalStorage, useSessionStorage } from './useLocalStorage';

// Service layer helpers
export * from './useServiceContext';
export * from './useServiceCall';

// Hooks de datos
export * from './useOperadores';
export * from './useAutobuses';
export * from './useEquipos';
export * from './useTecnicos';
export * from './useIncidencias';
export * from './useOrdenesTrabajo';
export * from './useMovimientosEquipo';
export * from './useEstadisticas';
export * from './useAlertas';
export * from './useDashboardMetrics';
export * from './useReportData';
export * from './useAuditHistory';

// Hooks de acciones
export * from './useCrearEquipo';
export * from './useMoverEquipo';
export * from './useCambiarEstadoEquipo';
export * from './useCrearIncidencia';
export * from './useCambiarEstadoIncidencia';
export * from './useCrearOT';
export * from './useAsignarOT';
export * from './useCerrarOT';
