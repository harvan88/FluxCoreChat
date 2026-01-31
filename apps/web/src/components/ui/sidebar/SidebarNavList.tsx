import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
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
      className={clsx('flex-1 py-2 overflow-y-auto', className)}
      {...rest}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onSelect}
          disabled={item.disabled}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150',
            item.active
              ? 'bg-active text-primary'
              : 'text-secondary hover:bg-hover hover:text-primary',
            item.disabled && 'opacity-40 pointer-events-none cursor-not-allowed'
          )}
        >
          <span
            className={clsx(
              'flex-shrink-0 transition-colors',
              item.active ? 'text-accent' : 'text-muted'
            )}
          >
            {item.icon}
          </span>
          <span className="text-sm font-medium truncate">{item.label}</span>
        </button>
      ))}
    </Container>
  );
}

export default SidebarNavList;
