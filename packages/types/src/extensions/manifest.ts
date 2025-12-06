import type { ContextPermission } from './permissions';

export interface ExtensionTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ExtensionUIConfig {
  sidebar?: {
    icon: string;
    title: string;
  };
  panel?: {
    title: string;
    component: string;
  };
}

export interface ConfigSchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  enum?: string[];
  description?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  preinstalled?: boolean;
  permissions: ContextPermission[];
  tools?: ExtensionTool[];
  ui?: ExtensionUIConfig;
  configSchema?: Record<string, ConfigSchemaField>;
}
