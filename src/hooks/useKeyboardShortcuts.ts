'use client';

import { useEffect, useCallback, useRef } from 'react';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';
type KeyCombo = string; // e.g., 'ctrl+k', 'alt+n', 'shift+?'

interface ShortcutHandler {
  key: string;
  modifiers?: ModifierKey[];
  handler: (event: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
  preventDefault?: boolean;
}

interface ShortcutOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
  scope?: string;
}

// Global registry for all shortcuts
const shortcutRegistry = new Map<string, { description: string; scope: string }>();

/**
 * Parse key combo string to components
 */
function parseKeyCombo(combo: string): { key: string; modifiers: Set<ModifierKey> } {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop() || '';
  const modifiers = new Set<ModifierKey>();
  
  for (const part of parts) {
    if (['ctrl', 'alt', 'shift', 'meta'].includes(part)) {
      modifiers.add(part as ModifierKey);
    }
  }
  
  return { key, modifiers };
}

/**
 * Check if event matches modifiers
 */
function matchesModifiers(event: KeyboardEvent, modifiers: Set<ModifierKey>): boolean {
  const hasCtrl = modifiers.has('ctrl');
  const hasAlt = modifiers.has('alt');
  const hasShift = modifiers.has('shift');
  const hasMeta = modifiers.has('meta');
  
  return (
    event.ctrlKey === hasCtrl &&
    event.altKey === hasAlt &&
    event.shiftKey === hasShift &&
    event.metaKey === hasMeta
  );
}

/**
 * Hook for single keyboard shortcut
 */
export function useKeyboardShortcut(
  keyCombo: KeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  const { enabled = true, ignoreInputs = true, scope = 'global' } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const { key, modifiers } = parseKeyCombo(keyCombo);

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (ignoreInputs) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const eventKey = event.key.toLowerCase();
      if (eventKey === key && matchesModifiers(event, modifiers)) {
        event.preventDefault();
        handlerRef.current(event);
      }
    };

    // Register shortcut
    shortcutRegistry.set(keyCombo, { 
      description: `Shortcut ${keyCombo}`, 
      scope 
    });

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      shortcutRegistry.delete(keyCombo);
    };
  }, [keyCombo, enabled, ignoreInputs, scope]);
}

/**
 * Hook for multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  options: ShortcutOptions = {}
) {
  const { enabled = true, ignoreInputs = true, scope = 'global' } = options;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (ignoreInputs) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const eventKey = event.key.toLowerCase();
      
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        
        const modifiers = new Set(shortcut.modifiers || []);
        
        if (
          eventKey === shortcut.key.toLowerCase() &&
          matchesModifiers(event, modifiers)
        ) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    };

    // Register all shortcuts
    for (const shortcut of shortcuts) {
      const combo = shortcut.modifiers 
        ? [...shortcut.modifiers, shortcut.key].join('+')
        : shortcut.key;
      shortcutRegistry.set(combo, {
        description: shortcut.description || `Shortcut ${combo}`,
        scope,
      });
    }

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      for (const shortcut of shortcuts) {
        const combo = shortcut.modifiers 
          ? [...shortcut.modifiers, shortcut.key].join('+')
          : shortcut.key;
        shortcutRegistry.delete(combo);
      }
    };
  }, [enabled, ignoreInputs, scope, shortcuts]);
}

/**
 * Get all registered shortcuts
 */
export function getRegisteredShortcuts(): Map<string, { description: string; scope: string }> {
  return new Map(shortcutRegistry);
}

/**
 * Common app shortcuts with handlers
 */
export function useAppShortcuts(handlers: {
  onSearch?: () => void;
  onNewIncidencia?: () => void;
  onNewPreventivo?: () => void;
  onGoHome?: () => void;
  onGoActivos?: () => void;
  onGoIncidencias?: () => void;
  onGoPreventivo?: () => void;
  onGoInventario?: () => void;
  onHelp?: () => void;
}) {
  const shortcuts: ShortcutHandler[] = [
    // Search - Ctrl+K or Cmd+K
    {
      key: 'k',
      modifiers: ['ctrl'],
      handler: () => handlers.onSearch?.(),
      description: 'Abrir búsqueda',
    },
    // New incidencia - Alt+N
    {
      key: 'n',
      modifiers: ['alt'],
      handler: () => handlers.onNewIncidencia?.(),
      description: 'Nueva incidencia',
    },
    // New preventivo - Alt+P
    {
      key: 'p',
      modifiers: ['alt'],
      handler: () => handlers.onNewPreventivo?.(),
      description: 'Nuevo preventivo',
    },
    // Go to dashboard - Alt+H
    {
      key: 'h',
      modifiers: ['alt'],
      handler: () => handlers.onGoHome?.(),
      description: 'Ir al dashboard',
    },
    // Go to activos - Alt+A
    {
      key: 'a',
      modifiers: ['alt'],
      handler: () => handlers.onGoActivos?.(),
      description: 'Ir a activos',
    },
    // Go to incidencias - Alt+I
    {
      key: 'i',
      modifiers: ['alt'],
      handler: () => handlers.onGoIncidencias?.(),
      description: 'Ir a incidencias',
    },
    // Go to preventivo - Alt+M (Mantenimiento)
    {
      key: 'm',
      modifiers: ['alt'],
      handler: () => handlers.onGoPreventivo?.(),
      description: 'Ir a mantenimiento preventivo',
    },
    // Go to inventario - Alt+V
    {
      key: 'v',
      modifiers: ['alt'],
      handler: () => handlers.onGoInventario?.(),
      description: 'Ir a inventario',
    },
    // Help - ?
    {
      key: '?',
      modifiers: ['shift'],
      handler: () => handlers.onHelp?.(),
      description: 'Mostrar ayuda de atajos',
    },
  ].filter(s => {
    // Only include shortcuts that have handlers
    const handlerKey = `on${s.description.replace(/\s+/g, '').replace('Ira', 'Go').replace('Nueva', 'New').replace('Nuevo', 'New').replace('Abrir', '').replace('búsqueda', 'Search').replace('Mostrar', '').replace('ayudadeatajos', 'Help')}`;
    return true; // Include all, handlers check for undefined
  });

  useKeyboardShortcuts(shortcuts, { scope: 'app' });
}

/**
 * Escape key handler
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  useKeyboardShortcut('escape', handler, { enabled, ignoreInputs: false });
}

/**
 * Enter key handler
 */
export function useEnterKey(handler: () => void, enabled = true) {
  useKeyboardShortcut('enter', handler, { enabled, ignoreInputs: false });
}
