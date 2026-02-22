/**
 * Response format helpers — JSON and Markdown.
 */

export type ResponseFormat = 'json' | 'markdown';

export function formatAsMarkdown(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map((item) => `- ${formatItem(item)}`).join('\n');
  }
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([k, v]) => `**${k}:** ${formatItem(v)}`)
      .join('\n\n');
  }
  return String(data);
}

function formatItem(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(formatItem).join(', ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function paginate<T>(
  items: T[],
  limit: number,
  offset: number,
): { items: T[]; has_more: boolean; next_offset: number; total_count: number } {
  const total = items.length;
  const slice = items.slice(offset, offset + limit);
  return {
    items: slice,
    has_more: offset + slice.length < total,
    next_offset: offset + slice.length,
    total_count: total,
  };
}
