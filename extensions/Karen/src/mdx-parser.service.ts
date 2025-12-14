/**
 * MDX Parser Service
 * Extension Karen - Website Builder
 * Parsea markdown extendido (MDX sin React) a estructura de datos
 */

export interface FrontMatter {
  title?: string;
  description?: string;
  layout?: string;
  menu?: string;
  path?: string;
  status?: string;
  keywords?: string[];
  author?: string;
  order?: number;
  [key: string]: unknown;
}

export interface BlockNode {
  type: 'block';
  name: string;
  props: Record<string, string>;
  children: ASTNode[];
}

export interface ComponentNode {
  type: 'component';
  name: string;
  variant?: string;
  props: Record<string, string>;
  children: string;
}

export interface TextNode {
  type: 'text';
  content: string;
}

export interface HeadingNode {
  type: 'heading';
  level: number;
  text: string;
}

export interface ListNode {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface ParagraphNode {
  type: 'paragraph';
  content: string;
}

export type ASTNode = BlockNode | ComponentNode | TextNode | HeadingNode | ListNode | ParagraphNode;

export interface ParsedMDX {
  frontMatter: FrontMatter;
  ast: ASTNode[];
  raw: string;
}

class MDXParserService {
  parse(content: string): ParsedMDX {
    const { frontMatter, body } = this.extractFrontMatter(content);
    const ast = this.parseBody(body);
    return { frontMatter, ast, raw: content };
  }

  private extractFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontMatterRegex);

    if (!match) return { frontMatter: {}, body: content };

    const yamlContent = match[1];
    const body = content.slice(match[0].length);

    try {
      const frontMatter = this.parseYAML(yamlContent);
      return { frontMatter, body };
    } catch (error) {
      console.warn('[MDXParser] Failed to parse front matter:', error);
      return { frontMatter: {}, body: content };
    }
  }

  private parseYAML(yaml: string): FrontMatter {
    const result: FrontMatter = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1);
        result[key] = arrayContent.split(',').map(item => {
          const trimmedItem = item.trim();
          if ((trimmedItem.startsWith('"') && trimmedItem.endsWith('"')) ||
              (trimmedItem.startsWith("'") && trimmedItem.endsWith("'"))) {
            return trimmedItem.slice(1, -1);
          }
          return trimmedItem;
        });
        continue;
      }

      if (value === 'true') { result[key] = true; continue; }
      if (value === 'false') { result[key] = false; continue; }
      if (!isNaN(Number(value)) && value !== '') { result[key] = Number(value); continue; }
      result[key] = value;
    }
    return result;
  }

  private parseBody(body: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    const lines = body.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith(':::block')) {
        const blockResult = this.parseBlock(lines, i);
        if (blockResult) { nodes.push(blockResult.node); i = blockResult.endIndex + 1; continue; }
      }

      if (line.trim().startsWith('<Component')) {
        const componentResult = this.parseComponent(lines, i);
        if (componentResult) { nodes.push(componentResult.node); i = componentResult.endIndex + 1; continue; }
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        nodes.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
        i++; continue;
      }

      if (line.trim().match(/^[-*]\s+/) || line.trim().match(/^\d+\.\s+/)) {
        const listResult = this.parseList(lines, i);
        if (listResult) { nodes.push(listResult.node); i = listResult.endIndex + 1; continue; }
      }

      if (line.trim()) {
        const paragraphResult = this.parseParagraph(lines, i);
        nodes.push(paragraphResult.node);
        i = paragraphResult.endIndex + 1; continue;
      }
      i++;
    }
    return nodes;
  }

  private parseBlock(lines: string[], startIndex: number): { node: BlockNode; endIndex: number } | null {
    const startLine = lines[startIndex].trim();
    const blockMatch = startLine.match(/^:::block\s+(\S+)(?:\s+(.*))?$/);
    if (!blockMatch) return null;

    const blockName = blockMatch[1];
    let endIndex = startIndex + 1;
    const childrenLines: string[] = [];
    const props: Record<string, string> = {};

    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line.trim() === ':::') break;
      const propMatch = line.match(/^\s*(\w+)\s*=\s*"([^"]*)"$/);
      if (propMatch) { props[propMatch[1]] = propMatch[2]; }
      else if (line.trim()) { childrenLines.push(line); }
      endIndex++;
    }

    const childrenContent = childrenLines.join('\n');
    const children = childrenContent.trim() ? this.parseBody(childrenContent) : [];
    return { node: { type: 'block', name: blockName, props, children }, endIndex };
  }

  private parseComponent(lines: string[], startIndex: number): { node: ComponentNode; endIndex: number } | null {
    const startLine = lines[startIndex].trim();
    
    const selfClosingMatch = startLine.match(/^<Component\s+([^>]*)\/?>$/);
    if (selfClosingMatch) {
      const props = this.parseComponentProps(selfClosingMatch[1]);
      return { node: { type: 'component', name: props.name || 'unknown', variant: props.variant, props, children: '' }, endIndex: startIndex };
    }

    const openMatch = startLine.match(/^<Component\s+([^>]*)>$/);
    if (!openMatch) return null;

    const props = this.parseComponentProps(openMatch[1]);
    let endIndex = startIndex + 1;
    const childrenLines: string[] = [];

    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line.trim() === '</Component>') break;
      childrenLines.push(line);
      endIndex++;
    }
    return { node: { type: 'component', name: props.name || 'unknown', variant: props.variant, props, children: childrenLines.join('\n').trim() }, endIndex };
  }

  private parseComponentProps(propsStr: string): Record<string, string> {
    const props: Record<string, string> = {};
    const regex = /(\w+)="([^"]*)"/g;
    let match;
    while ((match = regex.exec(propsStr)) !== null) { props[match[1]] = match[2]; }
    return props;
  }

  private parseList(lines: string[], startIndex: number): { node: ListNode; endIndex: number } {
    const items: string[] = [];
    let endIndex = startIndex;
    const firstLine = lines[startIndex].trim();
    const ordered = /^\d+\./.test(firstLine);

    while (endIndex < lines.length) {
      const line = lines[endIndex].trim();
      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (unorderedMatch) { items.push(unorderedMatch[1]); }
      else if (orderedMatch) { items.push(orderedMatch[1]); }
      else if (line === '' || (!unorderedMatch && !orderedMatch)) { break; }
      endIndex++;
    }
    return { node: { type: 'list', ordered, items }, endIndex: endIndex - 1 };
  }

  private parseParagraph(lines: string[], startIndex: number): { node: ParagraphNode; endIndex: number } {
    const paragraphLines: string[] = [];
    let endIndex = startIndex;

    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line.trim() === '' || line.trim().startsWith(':::') || line.trim().startsWith('<Component') || line.trim().match(/^#{1,6}\s+/)) break;
      paragraphLines.push(line);
      endIndex++;
    }
    return { node: { type: 'paragraph', content: paragraphLines.join(' ').trim() }, endIndex: endIndex - 1 };
  }

  extractPlainText(ast: ASTNode[]): string {
    const texts: string[] = [];
    for (const node of ast) {
      switch (node.type) {
        case 'heading': texts.push(node.text); break;
        case 'paragraph': texts.push(node.content); break;
        case 'list': texts.push(...node.items); break;
        case 'component': texts.push(node.children); break;
        case 'block': texts.push(this.extractPlainText(node.children)); break;
        case 'text': texts.push(node.content); break;
      }
    }
    return texts.filter(Boolean).join(' ');
  }

  extractHeadings(ast: ASTNode[]): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];
    for (const node of ast) {
      if (node.type === 'heading') { headings.push({ level: node.level, text: node.text }); }
      else if (node.type === 'block') { headings.push(...this.extractHeadings(node.children)); }
    }
    return headings;
  }
}

export const mdxParser = new MDXParserService();
