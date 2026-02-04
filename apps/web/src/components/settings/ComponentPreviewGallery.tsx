/**
 * ComponentPreviewGallery - showcases canonical UI components inside Settings.
 */

import { useState } from 'react';
import { X, LayoutGrid, User, Bell, Shield, Palette } from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Select,
  SliderInput,
  Checkbox,
  Table,
  SidebarNavList,
  Switch,
  DoubleConfirmationDeleteButton,
} from '../ui';

interface ComponentPreviewSpec {
  id: string;
  name: string;
  category: string;
  description: string;
  preview: React.ComponentType;
}

function DeleteConfirmationPreview() {
  const [status, setStatus] = useState<'idle' | 'confirmed'>('idle');

  const handleConfirm = () => {
    setStatus('confirmed');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="space-y-3 rounded-xl border border-subtle bg-elevated p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Eliminar integración</p>
          <p className="text-xs text-muted">Acción irreversible protegida con doble confirmación.</p>
        </div>
        <DoubleConfirmationDeleteButton onConfirm={handleConfirm} />
      </div>
      <div className="text-xs text-secondary">
        {status === 'confirmed' ? (
          <span className="text-success">Confirmación registrada correctamente.</span>
        ) : (
          'Haz clic en eliminar y luego confirma para ejecutar la acción.'
        )}
      </div>
    </div>
  );
}

function SwitchPreview() {
  const [aiMode, setAiMode] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Modo IA automático</p>
          <p className="text-xs text-muted">Activa la asistencia continua en tus conversaciones.</p>
        </div>
        <Switch checked={aiMode} onCheckedChange={setAiMode} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Notificaciones push</p>
          <p className="text-xs text-muted">Recibe alertas cuando llegue un mensaje crítico.</p>
        </div>
        <Switch checked={notifications} onCheckedChange={setNotifications} />
      </div>
    </div>
  );
}

function ButtonsPreview() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primario</Button>
      <Button variant="secondary">Secundario</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Peligro</Button>
    </div>
  );
}

function InputsPreview() {
  const [name, setName] = useState('FluxCore Labs');
  const [description, setDescription] = useState('Configura tus componentes con el nuevo sistema canónico.');

  return (
    <div className="space-y-3">
      <Input
        label="Nombre"
        placeholder="Escribe algo"
        value={name}
        onChange={(event) => setName(event.target.value)}
        helperText="Ejemplo de helper text"
      />
      <Textarea
        label="Descripción"
        placeholder="Detalles adicionales"
        rows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
    </div>
  );
}

function CardPreview() {
  return (
    <Card variant="elevated" className="max-w-md">
      <CardHeader title="Plan Pro" subtitle="Ideal para equipos" />
      <CardBody className="space-y-2 text-sm text-secondary">
        <p>• Hasta 5 cuentas conectadas</p>
        <p>• Automatizaciones ilimitadas</p>
        <p>• Soporte prioritario 24/7</p>
      </CardBody>
    </Card>
  );
}

function BadgePreview() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="info">Nuevo</Badge>
      <Badge variant="success" badgeStyle="solid">
        Activo
      </Badge>
      <Badge variant="warning" badgeStyle="outline">
        Pendiente
      </Badge>
      <Badge variant="error" dot>
        Falla
      </Badge>
    </div>
  );
}

function SelectPreview() {
  const [channel, setChannel] = useState('whatsapp');

  return (
    <Select
      label="Canal"
      placeholder="Seleccionar canal"
      options={[
        { value: 'whatsapp', label: 'WhatsApp Business' },
        { value: 'slack', label: 'Slack' },
        { value: 'telegram', label: 'Telegram' },
      ]}
      value={channel}
      onChange={(value) => {
        if (typeof value === 'string') {
          setChannel(value);
        }
      }}
    />
  );
}

function SliderPreview() {
  const [temperature, setTemperature] = useState(0.65);

  return (
    <SliderInput
      label="Temperatura"
      value={temperature}
      min={0}
      max={1}
      step={0.05}
      onChange={setTemperature}
      unit="τ"
    />
  );
}

function CheckboxPreview() {
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [tokenCount, setTokenCount] = useState(false);

  return (
    <div className="space-y-2">
      <Checkbox
        label="Habilitar sugerencias IA"
        checked={aiSuggestions}
        onChange={(event) => setAiSuggestions(event.target.checked)}
      />
      <Checkbox
        label="Mostrar conteo de tokens"
        checked={tokenCount}
        onChange={(event) => setTokenCount(event.target.checked)}
      />
    </div>
  );
}

function TablePreview() {
  return (
    <Table
      columns={[
        { id: 'name', header: 'Nombre', accessor: (row: any) => row.name },
        { id: 'status', header: 'Estado', accessor: (row: any) => row.status },
        { id: 'updated', header: 'Actualizado', accessor: (row: any) => row.updated },
      ]}
      data={[
        { id: '1', name: 'Automatización A', status: 'Activa', updated: 'hace 2h' },
        { id: '2', name: 'Automatización B', status: 'Pausada', updated: 'ayer' },
      ]}
      getRowKey={(row) => row.id}
      onRowClick={() => {}}
    />
  );
}

function SidebarNavListPreview() {
  const [activeId, setActiveId] = useState('appearance');

  const items = [
    { id: 'profile', label: 'Perfil', icon: <User size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'privacy', label: 'Privacidad', icon: <Shield size={18} /> },
    { id: 'appearance', label: 'Apariencia', icon: <Palette size={18} /> },
  ];

  return (
    <div className="max-w-xs rounded-xl border border-subtle bg-surface">
      <SidebarNavList
        className="max-h-64"
        items={items.map((item) => ({
          ...item,
          active: item.id === activeId,
          onSelect: () => setActiveId(item.id),
        }))}
      />
    </div>
  );
}

const componentsCatalog: ComponentPreviewSpec[] = [
  {
    id: 'button',
    name: 'Button',
    category: 'Acciones',
    description: 'Botones canónicos con variantes primary, secondary, ghost y danger.',
    preview: ButtonsPreview,
  },
  {
    id: 'double-confirmation-delete',
    name: 'DoubleConfirmationDeleteButton',
    category: 'Acciones críticas',
    description: 'Botón con doble confirmación para operaciones destructivas con feedback inmediato.',
    preview: DeleteConfirmationPreview,
  },
  {
    id: 'inputs',
    name: 'Input & Textarea',
    category: 'Formularios',
    description: 'Campos de texto con estados de foco, helper text y soporte para errores.',
    preview: InputsPreview,
  },
  {
    id: 'card',
    name: 'Card',
    category: 'Layout',
    description: 'Tarjetas con Header/Body/Footer para agrupar información con estados interactivos.',
    preview: CardPreview,
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'Feedback',
    description: 'Indicadores compactos para status, etiquetas y contadores contextuales.',
    preview: BadgePreview,
  },
  {
    id: 'select',
    name: 'Select',
    category: 'Formularios',
    description: 'Selector con búsqueda, múltiples opciones y estados deshabilitados.',
    preview: SelectPreview,
  },
  {
    id: 'slider',
    name: 'SliderInput',
    category: 'Control numérico',
    description: 'Control combinado slider + input numérico para valores continuos.',
    preview: SliderPreview,
  },
  {
    id: 'switch',
    name: 'Switch',
    category: 'Controles',
    description: 'Toggle compacto para activar/desactivar configuraciones.',
    preview: SwitchPreview,
  },
  {
    id: 'checkbox',
    name: 'Checkbox & Radio',
    category: 'Formularios',
    description: 'Controles de selección canónicos con label y estado deshabilitado.',
    preview: CheckboxPreview,
  },
  {
    id: 'table',
    name: 'Table',
    category: 'Datos',
    description: 'Tablas responsivas con sorting, selección y estados vacíos.',
    preview: TablePreview,
  },
  {
    id: 'sidebar-nav',
    name: 'SidebarNavList',
    category: 'Navegación',
    description: 'Lista vertical compacta para menús de sidebar y paneles de configuración.',
    preview: SidebarNavListPreview,
  },
];

export function ComponentPreviewGallery() {
  const [activeComponent, setActiveComponent] = useState<ComponentPreviewSpec | null>(null);

  const handleClose = () => setActiveComponent(null);

  return (
    <div className="mt-10" data-component-name="ComponentPreviewGallery">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium text-primary">Biblioteca de Componentes</h3>
          <p className="text-xs text-muted">Haz clic para ver una vista previa emergente de cada componente canónico.</p>
        </div>
        <Badge badgeStyle="soft" variant="info" className="flex items-center gap-1">
          <LayoutGrid size={14} />
          UI FluxCore
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {componentsCatalog.map((component) => (
          <button key={component.id} onClick={() => setActiveComponent(component)} className="text-left">
            <div className="h-full rounded-xl border border-subtle bg-elevated p-4 transition hover:border-accent/40">
              <p className="text-xs text-muted uppercase tracking-wide">{component.category}</p>
              <h4 className="text-base font-semibold text-primary mt-1">{component.name}</h4>
              <p className="text-sm text-secondary mt-2 line-clamp-2">{component.description}</p>
            </div>
          </button>
        ))}
      </div>

      {activeComponent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-surface border border-subtle shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-subtle px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Vista previa</p>
                <h4 className="text-lg font-semibold text-primary">{activeComponent.name}</h4>
              </div>
              <button
                className="text-secondary hover:text-primary"
                onClick={handleClose}
                aria-label="Cerrar vista previa"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-secondary">{activeComponent.description}</p>
              <div className="rounded-xl border border-dashed border-subtle bg-elevated p-4">
                {(() => {
                  const PreviewComponent = activeComponent.preview;
                  return <PreviewComponent />;
                })()}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-subtle px-6 py-4">
              <Button variant="ghost" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
