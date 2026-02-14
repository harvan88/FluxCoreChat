/**
 * Condition Evaluator — Evaluates template expressions for agent flow branching.
 *
 * Supports expressions like:
 *   {{ intent-classifier.intent == 'queja' }}
 *   {{ knowledge-lookup.results.length > 0 }}
 *   {{ trigger.content }}
 *   {{ context.relationship.contactName }}
 *
 * Security: Uses a sandboxed evaluator (no eval/Function). Only supports:
 *   - Property access (dot notation)
 *   - Comparisons: ==, !=, >, <, >=, <=
 *   - Logical: &&, ||, !
 *   - Literals: strings, numbers, booleans, null
 */

// ─── Template interpolation ────────────────────────────────────────────────

const TEMPLATE_RE = /\{\{\s*(.+?)\s*\}\}/g;

/**
 * Resolve all {{ expr }} placeholders in a string against a context object.
 * If the entire string is a single expression, returns the raw resolved value (not stringified).
 * Otherwise interpolates into a string.
 */
export function resolveTemplate(template: string, ctx: Record<string, any>): any {
  const trimmed = template.trim();

  // Fast path: entire value is a single expression
  const singleMatch = trimmed.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (singleMatch) {
    return evaluateExpression(singleMatch[1], ctx);
  }

  // Multi-expression interpolation → always string
  return trimmed.replace(TEMPLATE_RE, (_match, expr) => {
    const val = evaluateExpression(expr, ctx);
    return val == null ? '' : String(val);
  });
}

/**
 * Evaluate a condition expression and return a boolean.
 */
export function evaluateCondition(expression: string, ctx: Record<string, any>): boolean {
  // Strip surrounding {{ }} if present
  let expr = expression.trim();
  const m = expr.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (m) expr = m[1];

  const result = evaluateExpression(expr, ctx);
  return Boolean(result);
}

// ─── Expression tokenizer ───────────────────────────────────────────────────

type Token =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'dot' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'not' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // String literal (single or double quotes)
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let str = '';
      i++;
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < len) { str += input[i + 1]; i += 2; }
        else { str += input[i]; i++; }
      }
      i++; // closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Number
    if (/[0-9]/.test(ch) || (ch === '-' && i + 1 < len && /[0-9]/.test(input[i + 1]))) {
      let num = '';
      if (ch === '-') { num += '-'; i++; }
      while (i < len && /[0-9.]/.test(input[i])) { num += input[i]; i++; }
      tokens.push({ type: 'number', value: Number(num) });
      continue;
    }

    // Two-char operators
    if (i + 1 < len) {
      const two = input.slice(i, i + 2);
      if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
        tokens.push({ type: 'op', value: two });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if (ch === '>' || ch === '<') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '!') { tokens.push({ type: 'not' }); i++; continue; }
    if (ch === '.') { tokens.push({ type: 'dot' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }

    // Identifiers (may include hyphens for step IDs like "intent-classifier")
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_\-]/.test(input[i])) { ident += input[i]; i++; }

      if (ident === 'true') tokens.push({ type: 'boolean', value: true });
      else if (ident === 'false') tokens.push({ type: 'boolean', value: false });
      else if (ident === 'null' || ident === 'undefined') tokens.push({ type: 'null' });
      else tokens.push({ type: 'ident', value: ident });
      continue;
    }

    // Skip unknown
    i++;
  }

  return tokens;
}

/**
 * Evaluate an expression string against a context object.
 */
export function evaluateExpression(expr: string, ctx: Record<string, any>): any {
  try {
    const tokens = tokenize(expr.trim());
    if (tokens.length === 0) return undefined;

    // Resolve property paths in tokens before parsing
    // We do a two-pass approach: first resolve ident chains, then evaluate operators
    return evaluateTokens(tokens, ctx);
  } catch (e: any) {
    console.warn(`[condition-evaluator] Failed to evaluate "${expr}":`, e?.message);
    return undefined;
  }
}

/**
 * Walk tokens, resolve property access chains, then evaluate comparisons/logic.
 */
function evaluateTokens(tokens: Token[], ctx: Record<string, any>): any {
  // Convert ident.ident.ident chains into resolved values
  const resolved = resolveIdentChains(tokens, ctx);

  // Now parse the resolved token stream
  const parser = new ResolvedParser(resolved);
  return parser.parse();
}

type ResolvedToken =
  | { type: 'value'; value: any }
  | { type: 'op'; value: string }
  | { type: 'not' }
  | { type: 'lparen' }
  | { type: 'rparen' };

function resolveIdentChains(tokens: Token[], ctx: Record<string, any>): ResolvedToken[] {
  const result: ResolvedToken[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.type === 'ident') {
      // Collect full property path: ident(.ident)*
      const parts: string[] = [tok.value];
      i++;
      while (i < tokens.length && tokens[i]?.type === 'dot' && i + 1 < tokens.length && tokens[i + 1]?.type === 'ident') {
        i++; // skip dot
        parts.push((tokens[i] as any).value);
        i++;
      }
      // Resolve path in context
      const val = resolvePath(ctx, parts);
      result.push({ type: 'value', value: val });
      continue;
    }

    if (tok.type === 'string' || tok.type === 'number' || tok.type === 'boolean') {
      result.push({ type: 'value', value: tok.value });
      i++;
      continue;
    }

    if (tok.type === 'null') {
      result.push({ type: 'value', value: null });
      i++;
      continue;
    }

    if (tok.type === 'op') {
      result.push({ type: 'op', value: tok.value });
      i++;
      continue;
    }

    if (tok.type === 'not') { result.push({ type: 'not' }); i++; continue; }
    if (tok.type === 'lparen') { result.push({ type: 'lparen' }); i++; continue; }
    if (tok.type === 'rparen') { result.push({ type: 'rparen' }); i++; continue; }

    // Skip unknown
    i++;
  }

  return result;
}

function resolvePath(obj: any, parts: string[]): any {
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Parser that works on already-resolved tokens (values instead of identifiers).
 */
class ResolvedParser {
  private tokens: ResolvedToken[];
  private pos = 0;

  constructor(tokens: ResolvedToken[]) {
    this.tokens = tokens;
  }

  private peek(): ResolvedToken | undefined { return this.tokens[this.pos]; }
  private advance(): ResolvedToken { return this.tokens[this.pos++]; }

  parse(): any {
    const result = this.parseOr();
    return result;
  }

  private parseOr(): any {
    let left = this.parseAnd();
    while (this.peek()?.type === 'op' && (this.peek() as any).value === '||') {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): any {
    let left = this.parseComparison();
    while (this.peek()?.type === 'op' && (this.peek() as any).value === '&&') {
      this.advance();
      const right = this.parseComparison();
      left = left && right;
    }
    return left;
  }

  private parseComparison(): any {
    let left = this.parseUnary();
    const tok = this.peek();
    if (tok?.type === 'op') {
      const op = (tok as any).value;
      if (['==', '!=', '>', '<', '>=', '<='].includes(op)) {
        this.advance();
        const right = this.parseUnary();
        switch (op) {
          case '==': return left == right;
          case '!=': return left != right;
          case '>': return left > right;
          case '<': return left < right;
          case '>=': return left >= right;
          case '<=': return left <= right;
        }
      }
    }
    return left;
  }

  private parseUnary(): any {
    if (this.peek()?.type === 'not') {
      this.advance();
      return !this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const tok = this.peek();
    if (!tok) return undefined;

    if (tok.type === 'value') { this.advance(); return tok.value; }

    if (tok.type === 'lparen') {
      this.advance();
      const val = this.parseOr();
      if (this.peek()?.type === 'rparen') this.advance();
      return val;
    }

    this.advance();
    return undefined;
  }
}
