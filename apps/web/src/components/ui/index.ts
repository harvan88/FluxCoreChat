/**
 * Component Library - UI Components
 * FC-404 a FC-411: Componentes base del sistema
 * 
 * Exporta todos los componentes de la biblioteca canónica
 */

// FC-404: Button Component
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// FC-405: Input Component
export { Input, Textarea } from './Input';
export type { InputProps, TextareaProps, InputVariant } from './Input';

// FC-406: Card Component
export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps, CardVariant } from './Card';

// FC-407: Badge Component
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize, BadgeStyle } from './Badge';

// FC-408: Table Component
export { Table } from './Table';
export type { TableProps, Column, SortDirection } from './Table';

// FC-409: Select Component
export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

// FC-410: Checkbox Component
export { Checkbox, Radio, RadioGroup } from './Checkbox';
export type { CheckboxProps, RadioProps, RadioGroupProps } from './Checkbox';

// FC-411: Avatar Component
export { Avatar, AvatarGroup } from './Avatar';
export type { AvatarProps, AvatarGroupProps, AvatarSize, AvatarStatus } from './Avatar';

// FC-412: SidebarLayout Component
export { SidebarLayout, SidebarSection, SidebarItem } from './SidebarLayout';
export type { SidebarLayoutProps, SidebarSectionProps, SidebarItemProps } from './SidebarLayout';
