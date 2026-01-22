'use client';

import { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navegación
  { keys: ['Alt', 'H'], description: 'Ir al Dashboard', category: 'Navegación' },
  { keys: ['Alt', 'A'], description: 'Ir a Activos', category: 'Navegación' },
  { keys: ['Alt', 'I'], description: 'Ir a Incidencias', category: 'Navegación' },
  { keys: ['Alt', 'M'], description: 'Ir a Mantenimiento Preventivo', category: 'Navegación' },
  { keys: ['Alt', 'V'], description: 'Ir a Inventario', category: 'Navegación' },
  
  // Acciones rápidas
  { keys: ['Ctrl', 'K'], description: 'Abrir búsqueda / Command Palette', category: 'Acciones' },
  { keys: ['Alt', 'N'], description: 'Nueva incidencia', category: 'Acciones' },
  { keys: ['Alt', 'P'], description: 'Nuevo preventivo', category: 'Acciones' },
  
  // General
  { keys: ['Shift', '?'], description: 'Mostrar esta ayuda', category: 'General' },
  { keys: ['Esc'], description: 'Cerrar modal / Cancelar', category: 'General' },
  { keys: ['Enter'], description: 'Confirmar acción', category: 'General' },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Keyboard className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Atajos de Teclado</h2>
              <p className="text-sm text-slate-400">Navega más rápido con estos atajos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-slate-400 mb-3">{category}</h3>
                <div className="space-y-2">
                  {SHORTCUTS.filter((s) => s.category === category).map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-slate-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs font-mono text-slate-300">
                              {key}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-slate-500">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-500 text-center">
            Presiona <kbd className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs font-mono">Esc</kbd> para cerrar
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para mostrar el help de atajos
 */
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
