/**
 * Safe arithmetic expression evaluator using recursive descent parsing.
 * Supports: +, -, *, /, parentheses, decimals with comma or dot.
 * Does NOT use eval() or new Function().
 */

const ALLOWED_CHARS = /^[\d+\-*/().,\s]+$/;

function isExpression(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const withoutLeadingSign = trimmed.startsWith('-') ? trimmed.slice(1) : trimmed;
  return /[+\-*/()]/.test(withoutLeadingSign);
}

function tokenize(expr: string): string[] {
  const normalized = expr.replace(/\s/g, '').replace(/,/g, '.');
  const tokens: string[] = [];
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];

    if ('0123456789.'.includes(ch)) {
      let num = '';
      while (i < normalized.length && '0123456789.'.includes(normalized[i])) {
        num += normalized[i];
        i++;
      }
      tokens.push(num);
    } else if ('+-*/()'.includes(ch)) {
      tokens.push(ch);
      i++;
    } else {
      return [];
    }
  }
  return tokens;
}

class Parser {
  private tokens: string[];
  private pos: number;

  constructor(tokens: string[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse(): number | null {
    if (this.tokens.length === 0) return null;
    const result = this.parseExpression();
    if (this.pos !== this.tokens.length) return null;
    return result;
  }

  private parseExpression(): number | null {
    let left = this.parseTerm();
    if (left === null) return null;

    while (this.pos < this.tokens.length && (this.tokens[this.pos] === '+' || this.tokens[this.pos] === '-')) {
      const op = this.tokens[this.pos];
      this.pos++;
      const right = this.parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseTerm(): number | null {
    let left = this.parseUnary();
    if (left === null) return null;

    while (this.pos < this.tokens.length && (this.tokens[this.pos] === '*' || this.tokens[this.pos] === '/')) {
      const op = this.tokens[this.pos];
      this.pos++;
      const right = this.parseUnary();
      if (right === null) return null;
      if (op === '/') {
        if (right === 0) return null;
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  private parseUnary(): number | null {
    if (this.pos < this.tokens.length && this.tokens[this.pos] === '-') {
      this.pos++;
      const val = this.parsePrimary();
      if (val === null) return null;
      return -val;
    }
    if (this.pos < this.tokens.length && this.tokens[this.pos] === '+') {
      this.pos++;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number | null {
    if (this.pos >= this.tokens.length) return null;

    if (this.tokens[this.pos] === '(') {
      this.pos++;
      const val = this.parseExpression();
      if (val === null) return null;
      if (this.pos >= this.tokens.length || this.tokens[this.pos] !== ')') return null;
      this.pos++;
      return val;
    }

    const token = this.tokens[this.pos];
    const num = parseFloat(token);
    if (isNaN(num)) return null;
    this.pos++;
    return num;
  }
}

export function evaluateSafeExpression(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!ALLOWED_CHARS.test(trimmed)) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  const parser = new Parser(tokens);
  const result = parser.parse();

  if (result === null || !isFinite(result)) return null;
  return result;
}

export { isExpression };
