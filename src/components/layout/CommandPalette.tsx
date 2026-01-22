'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/index';
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  Package,
  Bus,
  Calendar,
  FileText,
  Users,
  Plus,
  ArrowRight,
  Clock,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navegación' | 'acciones' | 'reciente';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Definir comandos disponibles
  const commands: CommandItem[] = useMemo(() => [
    // Navegación
    {
      id: 'nav-dashboard',
      title: 'Ir a Dashboard',
      subtitle: 'Panel de control principal',
      icon: LayoutDashboard,
      action: () => router.push('/dashboard'),
      category: 'navegación',
      keywords: ['inicio', 'home', 'panel'],
    },
    {
      id: 'nav-incidencias',
      title: 'Ir a Incidencias',
      subtitle: 'Gestión de incidencias',
      icon: AlertTriangle,
      action: () => router.push('/incidencias'),
      category: 'navegación',
      keywords: ['problemas', 'averías', 'errores'],
    },
    {
      id: 'nav-activos',
      title: 'Ir a Activos',
      subtitle: 'Gestión de flota',
      icon: Bus,
      action: () => router.push('/activos'),
      category: 'navegación',
      keywords: ['buses', 'flota', 'vehículos'],
    },
    {
      id: 'nav-preventivo',
      title: 'Ir a Preventivo',
      subtitle: 'Mantenimiento programado',
      icon: Calendar,
      action: () => router.push('/preventivo'),
      category: 'navegación',
      keywords: ['mantenimiento', 'programado', 'calendario'],
    },
    {
      id: 'nav-inventario',
      title: 'Ir a Inventario',
      subtitle: 'Control de stock',
      icon: Package,
      action: () => router.push('/inventario'),
      category: 'navegación',
      keywords: ['stock', 'repuestos', 'componentes'],
    },
    {
      id: 'nav-informes',
      title: 'Ir a Informes',
      subtitle: 'Reportes y estadísticas',
      icon: FileText,
      action: () => router.push('/informes'),
      category: 'navegación',
      keywords: ['reportes', 'estadísticas', 'análisis'],
    },
    {
      id: 'nav-usuarios',
      title: 'Ir a Usuarios',
      subtitle: 'Gestión de usuarios',
      icon: Users,
      action: () => router.push('/admin/usuarios'),
      category: 'navegación',
      keywords: ['admin', 'administración', 'permisos'],
    },
    // Acciones rápidas
    {
      id: 'action-nueva-incidencia',
      title: 'Nueva Incidencia',
      subtitle: 'Reportar un problema',
      icon: Plus,
      action: () => router.push('/incidencias/nueva'),
      category: 'acciones',
      keywords: ['crear', 'reportar', 'problema'],
    },
    {
      id: 'action-nuevo-activo',
      title: 'Nuevo Activo',
      subtitle: 'Registrar vehículo',
      icon: Plus,
      action: () => router.push('/activos/nuevo'),
      category: 'acciones',
      keywords: ['crear', 'añadir', 'bus'],
    },
    {
      id: 'action-nuevo-preventivo',
      title: 'Nuevo Preventivo',
      subtitle: 'Programar mantenimiento',
      icon: Plus,
      action: () => router.push('/preventivo/nuevo'),
      category: 'acciones',
      keywords: ['crear', 'programar', 'mantenimiento'],
    },
    {
      id: 'action-nuevo-inventario',
      title: 'Nuevo Item Inventario',
      subtitle: 'Añadir componente',
      icon: Plus,
      action: () => router.push('/inventario/nuevo'),
      category: 'acciones',
      keywords: ['crear', 'añadir', 'repuesto'],
    },
  ], [router]);

  // Filtrar comandos basado en la búsqueda
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    
    const searchLower = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.subtitle?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(searchLower))
    );
  }, [commands, query]);

  // Agrupar por categoría
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navegación: [],
      acciones: [],
      reciente: [],
    };
    
    filteredCommands.forEach(cmd => {
      if (groups[cmd.category]) {
        groups[cmd.category].push(cmd);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredCommands]);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Global keyboard shortcut
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar comandos, páginas..."
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron resultados</p>
            </div>
          ) : (
            groupedCommands.map(([category, items]) => (
              <div key={category}>
                <p className="px-4 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {category}
                </p>
                {items.map((cmd) => {
                  const currentIndex = globalIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  const Icon = cmd.icon;

                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-cyan-500/20' : 'hover:bg-slate-700/50'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-cyan-500/30 text-cyan-400' : 'bg-slate-700 text-slate-400'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          isSelected ? 'text-white' : 'text-slate-300'
                        )}>
                          {cmd.title}
                        </p>
                        {cmd.subtitle && (
                          <p className="text-xs text-slate-500 truncate">{cmd.subtitle}</p>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-700 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 bg-slate-700 rounded">↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↵</kbd>
              seleccionar
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K para abrir
          </span>
        </div>
      </div>
    </div>
  );
}
