/**
 * Utilitários seguros para manipulação de datas sem bugs de fuso horário (UTC vs Local)
 */

/**
 * Converte um objeto Date ou string de data para o formato YYYY-MM-DD local para uso em <input type="date">
 */
export function toLocalDateInputString(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Cria uma data UTC a partir de uma string YYYY-MM-DD vinda de um input date,
 * garantindo que não haja alteração de dia ao cruzar fusos.
 */
export function parseLocalDateInput(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;

  // Cria a data em UTC com hora 12:00:00 para blindar contra qualquer deslocamento de fuso
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Formata uma data para exibição em pt-BR de forma segura
 */
export function formatLocalDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
