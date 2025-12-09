/**
 * FC-411: Avatar Component
 * Componente de avatar con fallback a iniciales
 * 
 * Características:
 * - Imagen con fallback
 * - Iniciales automáticas
 * - Indicador de estado (online/offline/busy)
 * - Múltiples tamaños
 * - Grupos de avatares
 */

import React, { forwardRef, useState, type ImgHTMLAttributes } from 'react';
import clsx from 'clsx';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  /** URL de la imagen */
  src?: string;
  /** Texto alternativo */
  alt?: string;
  /** Nombre para generar iniciales */
  name?: string;
  /** Tamaño del avatar */
  size?: AvatarSize;
  /** Estado del usuario */
  status?: AvatarStatus;
  /** Forma del avatar */
  shape?: 'circle' | 'square';
  /** Color de fondo personalizado */
  bgColor?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-1.5 h-1.5' },
  sm: { container: 'w-8 h-8', text: 'text-sm', status: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-base', status: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', text: 'text-lg', status: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', text: 'text-2xl', status: 'w-4 h-4' },
  '2xl': { container: 'w-20 h-20', text: 'text-3xl', status: 'w-5 h-5' },
};

const statusStyles: Record<AvatarStatus, string> = {
  online: 'bg-success',
  offline: 'bg-muted',
  busy: 'bg-error',
  away: 'bg-warning',
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getColorFromName = (name?: string): string => {
  if (!name) return 'bg-elevated';
  
  // Generate consistent color based on name
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      status,
      shape = 'circle',
      bgColor,
      className,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false);
    const showImage = src && !imageError;
    const initials = getInitials(name || alt);
    const autoColor = getColorFromName(name || alt);

    return (
      <div
        ref={ref}
        className={clsx(
          'relative inline-flex items-center justify-center flex-shrink-0',
          'font-semibold text-inverse overflow-hidden',
          sizeStyles[size].container,
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          !showImage && (bgColor || autoColor),
          className
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            {...props}
          />
        ) : (
          <span className={sizeStyles[size].text}>
            {initials}
          </span>
        )}

        {/* Status Indicator */}
        {status && (
          <span
            className={clsx(
              'absolute bottom-0 right-0',
              'rounded-full border-2 border-base',
              sizeStyles[size].status,
              statusStyles[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// AvatarGroup component
export interface AvatarGroupProps {
  /** Avatares a mostrar */
  children: React.ReactNode;
  /** Número máximo de avatares visibles */
  max?: number;
  /** Tamaño de los avatares */
  size?: AvatarSize;
  /** Espaciado entre avatares */
  spacing?: 'tight' | 'normal' | 'loose';
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      children,
      max = 5,
      size = 'md',
      spacing = 'normal',
    },
    ref
  ) => {
    const childrenArray = React.Children.toArray(children);
    const visibleChildren = childrenArray.slice(0, max);
    const remainingCount = childrenArray.length - max;

    const spacingStyles = {
      tight: '-space-x-2',
      normal: '-space-x-3',
      loose: '-space-x-4',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-center',
          spacingStyles[spacing]
        )}
      >
        {visibleChildren.map((child, index) => (
          <div
            key={index}
            className="ring-2 ring-base rounded-full"
            style={{ zIndex: visibleChildren.length - index }}
          >
            {child}
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className={clsx(
              'flex items-center justify-center',
              'bg-elevated text-secondary font-semibold',
              'ring-2 ring-base rounded-full',
              sizeStyles[size].container,
              sizeStyles[size].text
            )}
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';
