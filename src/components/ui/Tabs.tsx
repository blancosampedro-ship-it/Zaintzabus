'use client';

import * as React from 'react';
import { Tab } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Tabs({
  tabs,
  defaultIndex = 0,
  onChange,
  variant = 'default',
  size = 'md',
  className,
}: TabsProps) {
  const variantClasses = {
    default: {
      list: 'bg-slate-800/50 p-1 rounded-lg border border-slate-700',
      tab: (selected: boolean) =>
        cn(
          'rounded-md transition-all',
          selected
            ? 'bg-slate-700 text-white shadow'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
        ),
    },
    pills: {
      list: 'gap-2',
      tab: (selected: boolean) =>
        cn(
          'rounded-full border transition-all',
          selected
            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
            : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
        ),
    },
    underline: {
      list: 'border-b border-slate-700',
      tab: (selected: boolean) =>
        cn(
          'relative pb-3 -mb-px transition-colors',
          selected
            ? 'text-cyan-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-500'
            : 'text-slate-400 hover:text-white'
        ),
    },
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <Tab.Group defaultIndex={defaultIndex} onChange={onChange}>
      <Tab.List className={cn('flex', variantClasses[variant].list, className)}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            disabled={tab.disabled}
            className={({ selected }) =>
              cn(
                'inline-flex items-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed',
                sizeClasses[size],
                variantClasses[variant].tab(selected)
              )
            }
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full bg-slate-600 text-xs min-w-[1.25rem] h-5 px-1.5'
                )}
              >
                {tab.badge}
              </span>
            )}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="mt-4">
        {tabs.map((tab) => (
          <Tab.Panel key={tab.id} className="focus:outline-none">
            {tab.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}

// Controlled Tabs (without Tab.Panels)
export interface ControlledTabsProps {
  tabs: Omit<TabItem, 'content'>[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ControlledTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'md',
  className,
}: ControlledTabsProps) {
  const variantClasses = {
    default: {
      list: 'bg-slate-800/50 p-1 rounded-lg border border-slate-700',
      tab: (selected: boolean) =>
        cn(
          'rounded-md transition-all',
          selected
            ? 'bg-slate-700 text-white shadow'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
        ),
    },
    pills: {
      list: 'gap-2',
      tab: (selected: boolean) =>
        cn(
          'rounded-full border transition-all',
          selected
            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
            : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
        ),
    },
    underline: {
      list: 'border-b border-slate-700',
      tab: (selected: boolean) =>
        cn(
          'relative pb-3 -mb-px transition-colors',
          selected
            ? 'text-cyan-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-500'
            : 'text-slate-400 hover:text-white'
        ),
    },
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <div className={cn('flex', variantClasses[variant].list, className)}>
      {tabs.map((tab) => {
        const isSelected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'inline-flex items-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed',
              sizeClasses[size],
              variantClasses[variant].tab(isSelected)
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="inline-flex items-center justify-center rounded-full bg-slate-600 text-xs min-w-[1.25rem] h-5 px-1.5">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ==================== COMPONENTES RADIX-STYLE ====================

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within TabsRoot');
  }
  return context;
}

interface TabsRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function TabsRoot({ 
  value: controlledValue, 
  defaultValue = '', 
  onValueChange, 
  children,
  className 
}: TabsRootProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  }, [isControlled, onValueChange]);

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <div 
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-slate-800/50 p-1',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
        'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected 
          ? 'bg-slate-700 text-white shadow-sm' 
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  
  if (selectedValue !== value) {
    return null;
  }

  return (
    <div 
      role="tabpanel"
      className={cn('mt-2 ring-offset-background focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
