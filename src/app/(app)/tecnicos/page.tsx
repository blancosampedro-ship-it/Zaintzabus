'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tecnico, ESTADOS_TECNICO } from '@/types';
import { getTecnicos, getCargaTecnicos, CargaTecnico } from '@/lib/firebase/tecnicos';
import { useTenantId } from '@/contexts';
import { TecnicoCard, CargaTrabajoGrid } from '@/components/tecnicos';
import { Button, Input, Select, Badge } from '@/components/ui';
import { 
  Plus, 
  Search, 
  Users, 
  LayoutGrid,
  BarChart3,
  Filter,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Constantes de especialidades
const ESPECIALIDADES_TECNICO = {
  MECANICA: 'mecanica',
  ELECTRICIDAD: 'electricidad',
  CARROCERIA: 'carroceria',
  NEUMATICOS: 'neumaticos',
  CLIMATIZACION: 'climatizacion',
  ELECTRONICA: 'electronica',
} as const;

type VistaActiva = 'grid' | 'carga';

export default function TecnicosPage() {
  const router = useRouter();
  const tenantId = useTenantId();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargas, setCargas] = useState<CargaTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('grid');

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<string>('');

  const cargarDatos = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const [tecnicosResult, cargasData] = await Promise.all([
        getTecnicos({ tenantId, pageSize: 100 }),
        getCargaTecnicos(tenantId),
      ]);
      setTecnicos(tecnicosResult.tecnicos);
      setCargas(cargasData);
    } catch (error) {
      console.error('Error cargando técnicos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tenantId]);

  // Filtrar técnicos
  const tecnicosFiltrados = useMemo(() => {
    return tecnicos.filter((tecnico) => {
      // Filtro por búsqueda
      if (busqueda) {
        const termino = busqueda.toLowerCase();
        const nombreCompleto = `${tecnico.nombre} ${tecnico.apellidos}`.toLowerCase();
        const codigo = tecnico.codigoEmpleado?.toLowerCase() || '';
        if (!nombreCompleto.includes(termino) && !codigo.includes(termino)) {
          return false;
        }
      }

      // Filtro por estado
      if (filtroEstado && tecnico.estado !== filtroEstado) {
        return false;
      }

      // Filtro por especialidad
      if (filtroEspecialidad && !tecnico.especialidades?.includes(filtroEspecialidad)) {
        return false;
      }

      return true;
    });
  }, [tecnicos, busqueda, filtroEstado, filtroEspecialidad]);

  // Filtrar cargas según técnicos filtrados
  const cargasFiltradas = useMemo(() => {
    const idsVisibles = new Set(tecnicosFiltrados.map((t) => t.id));
    return cargas.filter((c) => idsVisibles.has(c.tecnicoId));
  }, [cargas, tecnicosFiltrados]);

  // Obtener carga para un técnico específico
  const getCargaTecnico = (tecnicoId: string) => {
    const carga = cargas.find((c) => c.tecnicoId === tecnicoId);
    if (!carga) return undefined;
    return {
      otsAsignadas: carga.otsAsignadas,
      disponibilidad: carga.disponibilidad,
    };
  };

  // Stats rápidas
  const stats = useMemo(() => {
    const activos = tecnicos.filter((t) => t.estado === ESTADOS_TECNICO.ACTIVO).length;
    const vacaciones = tecnicos.filter((t) => t.estado === ESTADOS_TECNICO.VACACIONES).length;
    const sobrecargados = cargas.filter((c) => c.otsAsignadas > 5).length;
    return { activos, vacaciones, sobrecargados, total: tecnicos.length };
  }, [tecnicos, cargas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Técnicos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión del equipo de mantenimiento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={cargarDatos}
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => router.push('/tecnicos/nuevo')}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Técnico
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400">Total técnicos</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
          <p className="text-2xl font-bold text-green-400">{stats.activos}</p>
          <p className="text-xs text-slate-400">Activos</p>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30">
          <p className="text-2xl font-bold text-amber-400">{stats.vacaciones}</p>
          <p className="text-xs text-slate-400">Vacaciones</p>
        </div>
        <div className={cn(
          'rounded-lg p-4 border',
          stats.sobrecargados > 0 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-slate-800/50 border-slate-700/50'
        )}>
          <p className={cn(
            'text-2xl font-bold',
            stats.sobrecargados > 0 ? 'text-red-400' : 'text-white'
          )}>
            {stats.sobrecargados}
          </p>
          <p className="text-xs text-slate-400">Sobrecargados</p>
        </div>
      </div>

      {/* Filtros y Vista */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={filtroEstado}
            onChange={(value) => setFiltroEstado(value)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: ESTADOS_TECNICO.ACTIVO, label: 'Activo' },
              { value: ESTADOS_TECNICO.VACACIONES, label: 'Vacaciones' },
              { value: ESTADOS_TECNICO.BAJA_TEMPORAL, label: 'Baja temporal' },
              { value: ESTADOS_TECNICO.BAJA_DEFINITIVA, label: 'Baja definitiva' },
            ]}
            className="w-48"
          />

          <Select
            value={filtroEspecialidad}
            onChange={(value) => setFiltroEspecialidad(value)}
            options={[
              { value: '', label: 'Todas las especialidades' },
              { value: ESPECIALIDADES_TECNICO.MECANICA, label: 'Mecánica' },
              { value: ESPECIALIDADES_TECNICO.ELECTRICIDAD, label: 'Electricidad' },
              { value: ESPECIALIDADES_TECNICO.CARROCERIA, label: 'Carrocería' },
              { value: ESPECIALIDADES_TECNICO.NEUMATICOS, label: 'Neumáticos' },
              { value: ESPECIALIDADES_TECNICO.CLIMATIZACION, label: 'Climatización' },
              { value: ESPECIALIDADES_TECNICO.ELECTRONICA, label: 'Electrónica' },
            ]}
            className="w-56"
          />
        </div>

        {/* Toggle de vista */}
        <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
          <button
            onClick={() => setVistaActiva('grid')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors',
              vistaActiva === 'grid' 
                ? 'bg-blue-500 text-white' 
                : 'text-slate-400 hover:text-white'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Tarjetas
          </button>
          <button
            onClick={() => setVistaActiva('carga')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors',
              vistaActiva === 'carga' 
                ? 'bg-blue-500 text-white' 
                : 'text-slate-400 hover:text-white'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Carga
          </button>
        </div>
      </div>

      {/* Chips de filtros activos */}
      {(busqueda || filtroEstado || filtroEspecialidad) && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {busqueda && (
            <Badge 
              variant="default" 
              className="cursor-pointer"
              onClick={() => setBusqueda('')}
            >
              Búsqueda: {busqueda} ×
            </Badge>
          )}
          {filtroEstado && (
            <Badge 
              variant="default" 
              className="cursor-pointer"
              onClick={() => setFiltroEstado('')}
            >
              Estado: {filtroEstado} ×
            </Badge>
          )}
          {filtroEspecialidad && (
            <Badge 
              variant="default" 
              className="cursor-pointer"
              onClick={() => setFiltroEspecialidad('')}
            >
              Especialidad: {filtroEspecialidad} ×
            </Badge>
          )}
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('');
              setFiltroEspecialidad('');
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tecnicosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No se encontraron técnicos</p>
          {(busqueda || filtroEstado || filtroEspecialidad) && (
            <button
              onClick={() => {
                setBusqueda('');
                setFiltroEstado('');
                setFiltroEspecialidad('');
              }}
              className="text-blue-400 hover:text-blue-300 text-sm mt-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : vistaActiva === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicosFiltrados.map((tecnico) => (
            <TecnicoCard
              key={tecnico.id}
              tecnico={tecnico}
              cargaActual={getCargaTecnico(tecnico.id)}
              mode="full"
              onClick={() => router.push(`/tecnicos/${tecnico.id}`)}
            />
          ))}
        </div>
      ) : (
        <CargaTrabajoGrid
          cargas={cargasFiltradas}
          onTecnicoClick={(id) => router.push(`/tecnicos/${id}`)}
        />
      )}

      {/* Contador de resultados */}
      <div className="text-center text-sm text-slate-400">
        Mostrando {tecnicosFiltrados.length} de {tecnicos.length} técnicos
      </div>
    </div>
  );
}
