import clsx from 'clsx';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Switch({ checked, onCheckedChange, disabled = false, size = 'sm', className }: SwitchProps) {
  const sizeClasses =
    size === 'md'
      ? {
          track: 'w-[60px] h-[34px] rounded-full',
          thumb: 'top-1 left-1 w-[26px] h-[26px] rounded-full',
          translateOn: 'translate-x-[26px]',
        }
      : {
          track: 'w-[34px] h-[18px] rounded-full',
          thumb: 'top-[2px] left-[2px] w-[14px] h-[14px] rounded-full',
          translateOn: 'translate-x-[16px]',
        };

  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onCheckedChange(!checked);
        }
      }}
      className={clsx(
        'relative inline-flex flex-shrink-0 items-center',
        sizeClasses.track,
        'border',
        'bg-transparent transition-colors duration-300',
        'border-default',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      <span
        className={clsx(
          'absolute',
          sizeClasses.thumb,
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          checked
            ? `${sizeClasses.translateOn} bg-accent`
            : 'translate-x-0 bg-muted'
        )}
      />
    </div>
  );
}
