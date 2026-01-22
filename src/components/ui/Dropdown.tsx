'use client';

import * as React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  selected?: boolean;
}

export interface DropdownSection {
  title?: string;
  items: DropdownItem[];
}

export interface DropdownProps {
  trigger: React.ReactNode;
  sections: DropdownSection[];
  align?: 'left' | 'right';
  width?: 'auto' | 'sm' | 'md' | 'lg';
  className?: string;
}

const widthClasses = {
  auto: 'min-w-[180px]',
  sm: 'w-48',
  md: 'w-56',
  lg: 'w-64',
};

export function Dropdown({
  trigger,
  sections,
  align = 'right',
  width = 'auto',
  className,
}: DropdownProps) {
  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <Menu.Button as={React.Fragment}>{trigger}</Menu.Button>

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute z-50 mt-2 rounded-xl bg-slate-800 border border-slate-700 shadow-industrial-lg py-1 focus:outline-none',
            align === 'left' ? 'left-0' : 'right-0',
            widthClasses[width]
          )}
        >
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {sectionIndex > 0 && (
                <div className="my-1 h-px bg-slate-700" />
              )}
              {section.title && (
                <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {section.title}
                </div>
              )}
              {section.items.map((item, itemIndex) => (
                <Menu.Item key={itemIndex} disabled={item.disabled}>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                        active && !item.disabled && 'bg-slate-700/50',
                        item.disabled && 'opacity-50 cursor-not-allowed',
                        item.danger
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-slate-300 hover:text-white'
                      )}
                    >
                      {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.selected && <Check className="h-4 w-4 text-cyan-400" />}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

// Simple Dropdown Button
export interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export function DropdownButton({
  label,
  items,
  variant = 'default',
  size = 'md',
  icon,
  className,
}: DropdownButtonProps) {
  const variantClasses = {
    default: 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white',
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    ghost: 'hover:bg-slate-700 text-slate-300 hover:text-white',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2',
  };

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
            variantClasses[variant],
            sizeClasses[size],
            className
          )}
        >
          {icon}
          {label}
          <ChevronDown className="h-4 w-4" />
        </button>
      }
      sections={[{ items }]}
      className={className}
    />
  );
}

// Context Menu (Right-click menu)
export interface ContextMenuProps {
  items: DropdownItem[];
  children: React.ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  React.useEffect(() => {
    const handleClick = () => setIsOpen(false);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-xl bg-slate-800 border border-slate-700 shadow-industrial-lg py-1"
          style={{ left: position.x, top: position.y }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                item.onClick?.();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-slate-700/50',
                item.disabled && 'opacity-50 cursor-not-allowed',
                item.danger
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
