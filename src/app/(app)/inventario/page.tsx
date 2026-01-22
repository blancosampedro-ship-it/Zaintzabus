'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getInventario } from '@/lib/firebase/inventario';
import { Inventario, ESTADO_INVENTARIO_LABELS, CATEGORIAS_INVENTARIO, EstadoInventario } from '@/types';
import { cn } from '@/lib/utils/index';
import { InventarioTable } from '@/components/inventario/InventarioTable';
import { StockAlerts } from '@/components/inventario/StockAlerts';
import {
  Plus,
  Search,
  Package,
  RefreshCw,
  X,
  AlertTriangle,
  Archive,
  CheckCircle,
  Wrench,
  LayoutGrid,
  List,
} from 'lucide-react';

type ViewMode = 'tabla' | 'grid';

const ESTADO_TABS: { value: EstadoInventario | 'todos'; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'todos', label: 'Todos', icon: Package, color: 'text-slate-400' },
  { value: 'almacen', label: 'Almacén', icon: Archive, color: 'text-blue-400' },
  { value: 'instalado', label: 'Instalados', icon: CheckCircle, color: 'text-green-400' },
  { value: 'reparacion', label: 'Reparación', icon: Wrench, color: 'text-amber-400' },
];

export default function InventarioPage() {
  const { claims, hasRole } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoInventario | 'todos'>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tabla');

  async function loadInventario(showRefresh = false) {
    if (!claims?.tenantId) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getInventario({
        tenantId: claims.tenantId,
        pageSize: 200,
      });
      setItems(result.items);
    } catch (error) {
      console.error('Error loading inventario:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInventario();
  }, [claims?.tenantId]);

  // Filtrar items
  const itemsFiltrados = useMemo(() => {
    let filtered = items;

    // Filtro por estado
    if (estadoFiltro !== 'todos') {
      filtered = filtered.filter(item => item.estado === estadoFiltro);
    }

    // Filtro por categoría
    if (categoriaFiltro !== 'todas') {
      filtered = filtered.filter(item => item.categoria === categoriaFiltro);
    }

    // Filtro por búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.sku.toLowerCase().includes(searchLower) ||
          item.descripcion.toLowerCase().includes(searchLower) ||
          item.fabricante.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [items, estadoFiltro, categoriaFiltro, busqueda]);

  // Stats
  const stats = useMemo(() => {
    const enAlmacen = items.filter(i => i.estado === 'almacen').length;
    const instalados = items.filter(i => i.estado === 'instalado').length;
    const enReparacion = items.filter(i => i.estado === 'reparacion').length;
    const stockBajo = items.filter(i => 
      i.cantidadMinima !== undefined && 
      i.cantidadDisponible !== undefined && 
      i.cantidadDisponible < i.cantidadMinima
    ).length;
    const sinStock = items.filter(i => 
      i.cantidadDisponible !== undefined && 
      i.cantidadDisponible === 0
    ).length;

    return { total: items.length, enAlmacen, instalados, enReparacion, stockBajo, sinStock };
  }, [items]);

  // Contadores por estado para tabs
  const contadores = useMemo(() => ({
    todos: items.length,
    almacen: items.filter(i => i.estado === 'almacen').length,
    instalado: items.filter(i => i.estado === 'instalado').length,
    reparacion: items.filter(i => i.estado === 'reparacion').length,
    baja: items.filter(i => i.estado === 'baja').length,
  }), [items]);

  const canCreate = hasRole(['admin', 'jefe_mantenimiento', 'operador']);

  const handleItemClick = (item: Inventario) => {
    router.push(`/inventario/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header industrial */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título y stats */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Control de Inventario
                </h1>
                <p className="text-slate-400 text-sm">
                  Gestión de componentes y repuestos
                </p>
              </div>

              {/* Stats rápidos */}
              <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-600">
                {stats.sinStock > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-mono font-bold">{stats.sinStock}</span>
                    <span className="text-red-400/70 text-sm">sin stock</span>
                  </div>
                )}
                {stats.stockBajo > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-mono font-bold">{stats.stockBajo}</span>
                    <span className="text-amber-400/70 text-sm">bajo mínimo</span>
                  </div>
                )}
                <div className="text-slate-400 text-sm">
                  <span className="text-blue-400 font-mono font-bold">{stats.enAlmacen}</span>
                  <span className="mx-1">almacén</span>
                  <span className="mx-2">•</span>
                  <span className="text-cyan-400 font-mono font-bold">{stats.total}</span>
                  <span className="mx-1">total</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              {/* Refresh */}
              <button
                onClick={() => loadInventario(true)}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
              </button>

              {/* Toggle vista */}
              <div className="flex items-center bg-slate-700 rounded p-1">
                <button
                  onClick={() => setViewMode('tabla')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'tabla' 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  )}
                  title="Vista Tabla"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'grid' 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  )}
                  title="Vista Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Nuevo item */}
              {canCreate && (
                <Link
                  href="/inventario/nuevo"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo</span>
                </Link>
              )}
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por SKU, descripción o fabricante..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro por categoría */}
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="todas">Todas las categorías</option>
              {CATEGORIAS_INVENTARIO.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Tabs de estado */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {ESTADO_TABS.map(tab => {
              const Icon = tab.icon;
              const count = contadores[tab.value];
              const isActive = estadoFiltro === tab.value;

              return (
                <button
                  key={tab.value}
                  onClick={() => setEstadoFiltro(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    isActive 
                      ? 'bg-slate-700 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive && tab.color)} />
                  {tab.label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-mono',
                    isActive ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-500'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Tabla/Grid principal */}
          <div className="xl:col-span-3">
            {viewMode === 'tabla' ? (
              <InventarioTable
                items={itemsFiltrados}
                loading={loading}
                onRowClick={handleItemClick}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="h-40 bg-slate-800/50 rounded-xl animate-pulse" />
                  ))
                ) : itemsFiltrados.length === 0 ? (
                  <div className="col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white">Sin resultados</h3>
                    <p className="text-slate-400 mt-1">No hay items que coincidan con los filtros</p>
                  </div>
                ) : (
                  itemsFiltrados.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'p-4 rounded-xl border transition-all text-left',
                        'bg-slate-800/50 hover:bg-slate-700/30',
                        'border-slate-700/50 hover:border-slate-600'
                      )}
                    >
                      <p className="font-mono font-bold text-white">{item.sku}</p>
                      <p className="text-sm text-slate-400 truncate mt-1">{item.descripcion}</p>
                      <p className="text-xs text-slate-500 mt-2">{item.fabricante} • {item.categoria}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Contador de resultados */}
            {!loading && (
              <div className="mt-4 text-sm text-slate-500">
                Mostrando <span className="text-white font-mono">{itemsFiltrados.length}</span> de{' '}
                <span className="text-white font-mono">{items.length}</span> items
              </div>
            )}
          </div>

          {/* Panel lateral - Alertas de stock */}
          <div className="xl:col-span-1">
            <StockAlerts
              items={items}
              onItemClick={handleItemClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
