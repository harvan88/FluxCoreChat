import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export interface SidebarNavItem {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  /** Optional trailing element (Switch, Badge, etc.) */
  trailing?: ReactNode;
}

interface SidebarNavListProps extends HTMLAttributes<HTMLDivElement | HTMLElement> {
  items: SidebarNavItem[];
  as?: 'div' | 'nav';
}

export function SidebarNavList({
  items,
  as = 'div',
  className,
  ...rest
}: SidebarNavListProps) {
  const Container = as;

  return (
    <Container
      className={clsx('flex-1 py-2 overflow-y-auto space-y-1', className)}
      {...rest}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onSelect}
          disabled={item.disabled}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-2.5 border border-transparent text-left transition-colors duration-150',
            item.active
              ? 'bg-active text-primary border-subtle'
              : 'text-secondary hover:bg-hover hover:text-primary hover:border-subtle',
            item.disabled && 'opacity-40 pointer-events-none cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <span
              className={clsx(
                'flex-shrink-0 transition-colors',
                item.active ? 'text-accent' : 'text-muted'
              )}
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-primary truncate">
                {item.label}
              </div>
              {item.description && (
                <div className="text-xs text-secondary truncate">
                  {item.description}
                </div>
              )}
            </div>
          </div>
          {item.trailing && (
            <div
              className="flex-shrink-0"
              onClick={(event) => event.stopPropagation()}
            >
              {item.trailing}
            </div>
          )}
        </button>
      ))}
    </Container>
  );
}

export default SidebarNavList;
