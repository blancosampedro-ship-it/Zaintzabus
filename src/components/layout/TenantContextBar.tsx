'use client';

import { useOperadorContext } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, Building2, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/**
 * Barra de Contexto de Tenant
 * 
 * Muestra una barra sticky cuando un usuario DFG/Admin está visualizando
 * datos de un operador específico. Ayuda a prevenir errores humanos al
 * hacer modificaciones en el tenant equivocado.
 * 
 * Solo visible para usuarios con canAccessAllTenants (DFG, Admin)
 */
export function TenantContextBar() {
  const { puedeSeleccionarOperador, operadorActual, operadores, seleccionarOperador } = useOperadorContext();
  const { claims, isReadOnly } = useAuth();
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Solo mostrar si el usuario puede ver todos los tenants (DFG/Admin)
  if (!puedeSeleccionarOperador) {
    return null;
  }

  // Si no hay operador seleccionado, mostrar advertencia
  if (!operadorActual) {
    return (
      <div className="sticky top-0 z-40 bg-amber-600 text-amber-950 px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Selecciona un operador para ver sus datos
          </span>
        </div>
      </div>
    );
  }

  const rolLabel = claims?.rol === 'dfg' ? 'DFG' : claims?.rol === 'admin' ? 'Admin' : 'Supervisor';

  return (
    <div className={cn(
      'sticky top-0 z-40 px-4 py-2 border-b transition-colors',
      isReadOnly 
        ? 'bg-amber-500/90 text-amber-950 border-amber-600' 
        : 'bg-orange-500/90 text-orange-950 border-orange-600'
    )}>
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        {/* Indicador de modo supervisión */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isReadOnly ? 'Modo supervisión' : 'Modo administración'}
            </span>
          </div>
          
          <span className="text-xs opacity-75">|</span>
          
          <span className="text-xs font-medium px-2 py-0.5 bg-black/10 rounded">
            {rolLabel}
          </span>
        </div>

        {/* Operador actual con selector */}
        <div className="relative">
          <button
            onClick={() => setSelectorOpen(!selectorOpen)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
              'bg-black/10 hover:bg-black/20',
              'focus:outline-none focus:ring-2 focus:ring-black/20'
            )}
          >
            <Building2 className="h-4 w-4" />
            <span className="font-semibold">
              {operadorActual.nombre}
            </span>
            {operadorActual.codigo && (
              <span className="text-xs opacity-75">
                ({operadorActual.codigo})
              </span>
            )}
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              selectorOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown de operadores */}
          {selectorOpen && (
            <>
              {/* Backdrop para cerrar */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setSelectorOpen(false)} 
              />
              
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1 max-h-80 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700">
                  Cambiar operador
                </div>
                {operadores.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => {
                      seleccionarOperador(op.id);
                      setSelectorOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      'hover:bg-slate-700',
                      op.id === operadorActual.id 
                        ? 'bg-cyan-500/10 text-cyan-400' 
                        : 'text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{op.nombre}</span>
                      {op.codigo && (
                        <span className="text-xs text-slate-500">
                          #{op.codigo}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Advertencia si no es solo lectura */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Los cambios afectarán a este operador</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TenantContextBar;
