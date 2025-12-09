/**
 * Component Showcase - Página de validación de Component Library
 * 
 * Muestra todos los componentes con ejemplos interactivos
 * para validar funcionalidad, accesibilidad y responsive
 */

import { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Table,
  Select,
  Checkbox,
  Radio,
  RadioGroup,
  Avatar,
  AvatarGroup,
  type Column,
  type SelectOption,
} from '../ui';
import {
  Save,
  Trash2,
  Edit,
  Mail,
  Lock,
  Settings,
  Check,
  X,
} from 'lucide-react';

export function ComponentShowcase() {
  const [selectedTab, setSelectedTab] = useState<string>('buttons');

  const tabs = [
    { id: 'buttons', label: 'Buttons' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'cards', label: 'Cards' },
    { id: 'badges', label: 'Badges' },
    { id: 'tables', label: 'Tables' },
    { id: 'selects', label: 'Selects' },
    { id: 'checkboxes', label: 'Checkboxes' },
    { id: 'avatars', label: 'Avatars' },
  ];

  return (
    <div className="min-h-screen bg-base p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Component Library Showcase
          </h1>
          <p className="text-secondary">
            Validación interactiva de todos los componentes del sistema
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedTab === tab.id
                  ? 'bg-accent text-inverse'
                  : 'bg-surface text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {selectedTab === 'buttons' && <ButtonExamples />}
          {selectedTab === 'inputs' && <InputExamples />}
          {selectedTab === 'cards' && <CardExamples />}
          {selectedTab === 'badges' && <BadgeExamples />}
          {selectedTab === 'tables' && <TableExamples />}
          {selectedTab === 'selects' && <SelectExamples />}
          {selectedTab === 'checkboxes' && <CheckboxExamples />}
          {selectedTab === 'avatars' && <AvatarExamples />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Button Examples
// ============================================================================

function ButtonExamples() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <Section title="Button Variants">
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </Section>

      <Section title="Button Sizes">
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Button with Icons">
        <div className="flex flex-wrap gap-4">
          <Button leftIcon={<Save size={16} />}>Save</Button>
          <Button variant="danger" leftIcon={<Trash2 size={16} />}>
            Delete
          </Button>
          <Button variant="secondary" rightIcon={<Edit size={16} />}>
            Edit
          </Button>
        </div>
      </Section>

      <Section title="Button States">
        <div className="flex flex-wrap gap-4">
          <Button disabled>Disabled</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 2000);
            }}
          >
            {loading ? 'Loading...' : 'Click to Load'}
          </Button>
          <Button fullWidth>Full Width</Button>
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// Input Examples
// ============================================================================

function InputExamples() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <Section title="Input Variants">
        <div className="space-y-4 max-w-md">
          <Input
            variant="text"
            label="Name"
            placeholder="Enter your name"
          />
          <Input
            variant="email"
            label="Email"
            placeholder="your@email.com"
            leftIcon={<Mail size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            variant="password"
            label="Password"
            placeholder="••••••••"
            leftIcon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            variant="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Section>

      <Section title="Input States">
        <div className="space-y-4 max-w-md">
          <Input
            label="With Helper Text"
            placeholder="Enter value"
            helperText="This is a helpful message"
          />
          <Input
            label="With Error"
            placeholder="Enter value"
            error="This field is required"
          />
          <Input
            label="Disabled"
            placeholder="Cannot edit"
            disabled
          />
        </div>
      </Section>

      <Section title="Textarea">
        <div className="max-w-md">
          <Textarea
            label="Description"
            placeholder="Enter description..."
            rows={4}
            helperText="Maximum 500 characters"
          />
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// Card Examples
// ============================================================================

function CardExamples() {
  return (
    <div className="space-y-6">
      <Section title="Card Variants">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="default" padding="md">
            <p className="text-primary">Default Card</p>
          </Card>
          <Card variant="elevated" padding="md">
            <p className="text-primary">Elevated Card</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-primary">Bordered Card</p>
          </Card>
          <Card variant="interactive" padding="md">
            <p className="text-primary">Interactive Card (hover me)</p>
          </Card>
        </div>
      </Section>

      <Section title="Card with Structure">
        <Card variant="elevated">
          <CardHeader
            title="User Profile"
            subtitle="Manage your account settings"
            actions={
              <Button variant="ghost" size="sm">
                <Settings size={16} />
              </Button>
            }
          />
          <CardBody>
            <p className="text-secondary">
              This is the card body with some content. You can put any
              components here.
            </p>
          </CardBody>
          <CardFooter align="right">
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Save Changes</Button>
          </CardFooter>
        </Card>
      </Section>
    </div>
  );
}

// ============================================================================
// Badge Examples
// ============================================================================

function BadgeExamples() {
  return (
    <div className="space-y-6">
      <Section title="Badge Variants">
        <div className="flex flex-wrap gap-4">
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </div>
      </Section>

      <Section title="Badge Styles">
        <div className="flex flex-wrap gap-4">
          <Badge variant="success" badgeStyle="solid">Solid</Badge>
          <Badge variant="success" badgeStyle="soft">Soft</Badge>
          <Badge variant="success" badgeStyle="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Badge with Icons">
        <div className="flex flex-wrap gap-4">
          <Badge variant="success" leftIcon={<Check size={12} />}>
            Active
          </Badge>
          <Badge variant="error" leftIcon={<X size={12} />}>
            Inactive
          </Badge>
          <Badge variant="info" dot>
            Online
          </Badge>
        </div>
      </Section>

      <Section title="Badge Sizes">
        <div className="flex flex-wrap items-center gap-4">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// Table Examples
// ============================================================================

function TableExamples() {
  const data = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
  ];

  const columns: Column[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: (row) => row.name,
      sortable: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.email,
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
      align: 'center',
    },
  ];

  return (
    <div className="space-y-6">
      <Section title="Basic Table">
        <Table
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
        />
      </Section>

      <Section title="Table with Selection">
        <Table
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          selectable
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Select Examples
// ============================================================================

function SelectExamples() {
  const [value, setValue] = useState('');
  const [multiValue, setMultiValue] = useState<string[]>([]);

  const options: SelectOption[] = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
    { value: '4', label: 'Option 4', disabled: true },
  ];

  return (
    <div className="space-y-6">
      <Section title="Basic Select">
        <div className="max-w-md">
          <Select
            options={options}
            value={value}
            onChange={(v) => setValue(v as string)}
            label="Choose an option"
            placeholder="Select..."
          />
        </div>
      </Section>

      <Section title="Searchable Select">
        <div className="max-w-md">
          <Select
            options={options}
            value={value}
            onChange={(v) => setValue(v as string)}
            label="Searchable"
            searchable
            clearable
          />
        </div>
      </Section>

      <Section title="Multiple Select">
        <div className="max-w-md">
          <Select
            options={options}
            values={multiValue}
            onChange={(v) => setMultiValue(v as string[])}
            label="Multiple selection"
            multiple
            searchable
          />
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// Checkbox Examples
// ============================================================================

function CheckboxExamples() {
  const [checked, setChecked] = useState(false);
  const [radioValue, setRadioValue] = useState('1');

  return (
    <div className="space-y-6">
      <Section title="Checkbox">
        <div className="space-y-4">
          <Checkbox
            label="Accept terms and conditions"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <Checkbox
            label="With description"
            description="This checkbox has additional information"
          />
          <Checkbox
            label="Disabled"
            disabled
          />
        </div>
      </Section>

      <Section title="Radio Buttons">
        <div className="space-y-4">
          <Radio
            name="example"
            value="1"
            label="Option 1"
            checked={radioValue === '1'}
            onChange={() => setRadioValue('1')}
          />
          <Radio
            name="example"
            value="2"
            label="Option 2"
            description="With description"
            checked={radioValue === '2'}
            onChange={() => setRadioValue('2')}
          />
        </div>
      </Section>

      <Section title="Radio Group">
        <RadioGroup
          name="group"
          value={radioValue}
          onChange={setRadioValue}
          options={[
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2', description: 'With description' },
            { value: '3', label: 'Option 3', disabled: true },
          ]}
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Avatar Examples
// ============================================================================

function AvatarExamples() {
  return (
    <div className="space-y-6">
      <Section title="Avatar Sizes">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar size="xs" name="John Doe" />
          <Avatar size="sm" name="John Doe" />
          <Avatar size="md" name="John Doe" />
          <Avatar size="lg" name="John Doe" />
          <Avatar size="xl" name="John Doe" />
          <Avatar size="2xl" name="John Doe" />
        </div>
      </Section>

      <Section title="Avatar with Status">
        <div className="flex flex-wrap gap-4">
          <Avatar name="Online User" status="online" />
          <Avatar name="Offline User" status="offline" />
          <Avatar name="Busy User" status="busy" />
          <Avatar name="Away User" status="away" />
        </div>
      </Section>

      <Section title="Avatar with Image">
        <div className="flex flex-wrap gap-4">
          <Avatar
            src="https://i.pravatar.cc/150?img=1"
            alt="User 1"
            status="online"
          />
          <Avatar
            src="https://i.pravatar.cc/150?img=2"
            alt="User 2"
          />
        </div>
      </Section>

      <Section title="Avatar Group">
        <AvatarGroup max={4}>
          <Avatar name="User 1" />
          <Avatar name="User 2" />
          <Avatar name="User 3" />
          <Avatar name="User 4" />
          <Avatar name="User 5" />
          <Avatar name="User 6" />
        </AvatarGroup>
      </Section>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl p-6 border border-subtle">
      <h3 className="text-xl font-semibold text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}
