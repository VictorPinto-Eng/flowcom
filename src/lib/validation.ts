/**
 * Utilitário de validação e sanitização de inputs para server actions.
 * Zero dependências externas. Throw on invalid, retorna string limpa se válido.
 */

const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Remove HTML tags e normaliza espaços (single-line).
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(HTML_TAG_REGEX, '').replace(/\s+/g, ' ').trim();
}

/**
 * Sanitiza preservando newlines (para campos multi-line como descrições).
 */
function sanitizeMultiline(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(HTML_TAG_REGEX, '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .trim();
}

/**
 * Valida nomes (workspace, board, coluna). Obrigatório, max 100 chars.
 */
export function validateName(value: unknown, fieldLabel: string): string {
  const clean = sanitizeText(value);
  if (!clean) {
    throw new Error(`${fieldLabel} é obrigatório.`);
  }
  if (clean.length > 100) {
    throw new Error(`${fieldLabel} deve ter no máximo 100 caracteres.`);
  }
  return clean;
}

/**
 * Valida títulos (cards). Obrigatório, max 200 chars.
 */
export function validateTitle(value: unknown, fieldLabel: string): string {
  const clean = sanitizeText(value);
  if (!clean) {
    throw new Error(`${fieldLabel} é obrigatório.`);
  }
  if (clean.length > 200) {
    throw new Error(`${fieldLabel} deve ter no máximo 200 caracteres.`);
  }
  return clean;
}

/**
 * Valida descrições/detalhes. Opcional por padrão, max 5000 chars. Preserva newlines.
 */
export function validateDescription(value: unknown, fieldLabel: string, required = false): string | null {
  const clean = sanitizeMultiline(value);
  if (!clean) {
    if (required) throw new Error(`${fieldLabel} é obrigatório.`);
    return null;
  }
  if (clean.length > 5000) {
    throw new Error(`${fieldLabel} deve ter no máximo 5000 caracteres.`);
  }
  return clean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida formato de email. Normaliza para lowercase.
 */
export function validateEmail(value: unknown): string {
  const str = String(value ?? '').trim().toLowerCase();
  if (!str) {
    throw new Error('E-mail é obrigatório.');
  }
  if (str.length > 254) {
    throw new Error('E-mail deve ter no máximo 254 caracteres.');
  }
  if (!EMAIL_REGEX.test(str)) {
    throw new Error('Formato de e-mail inválido.');
  }
  return str;
}
