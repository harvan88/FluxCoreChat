function asStringRecord(input: any): Record<string, string> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }

  const entries = Object.entries(input || {}).filter(([, value]) => typeof value === 'string');
  if (entries.length === 0) {
    return undefined;
  }

  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value as string;
    return acc;
  }, {});
}

interface ParseToolArgumentsOptions {
  fallbackQuery?: string;
}

class CapabilityArgumentNormalizerService {
  parseToolArguments(toolName: string, rawArguments: string, options: ParseToolArgumentsOptions = {}): any {
    let parsed: any = {};

    try {
      parsed = JSON.parse(rawArguments);
    } catch {
      parsed = {};
    }

    return this.normalizeToolArguments(toolName, parsed, options);
  }

  normalizeToolArguments(toolName: string, args: any, options: ParseToolArgumentsOptions = {}): any {
    switch (toolName) {
      case 'search_knowledge': {
        const query = typeof args?.query === 'string' && args.query.trim().length > 0
          ? args.query.trim()
          : (options.fallbackQuery ?? '').trim();

        return { query };
      }

      case 'send_template': {
        const templateId = typeof args?.templateId === 'string' && args.templateId.trim().length > 0
          ? args.templateId.trim()
          : typeof args?.template_id === 'string' && args.template_id.trim().length > 0
            ? args.template_id.trim()
            : '';

        return {
          templateId,
          variables: asStringRecord(args?.variables),
        };
      }

      case 'list_available_templates':
        return {};

      default:
        return args ?? {};
    }
  }
}

export const capabilityArgumentNormalizerService = new CapabilityArgumentNormalizerService();
