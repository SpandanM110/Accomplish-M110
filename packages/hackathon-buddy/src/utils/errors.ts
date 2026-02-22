/**
 * Standardized error handling. All tools return errors within the result object.
 */

export interface ToolError {
  error: string;
  reason?: string;
  suggestion?: string;
}

export function toToolError(
  err: unknown,
  context?: { what?: string; suggestion?: string },
): ToolError {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    error: msg,
    reason: context?.what,
    suggestion: context?.suggestion,
  };
}

export function formatErrorForResponse(err: ToolError): string {
  let out = `Error: ${err.error}`;
  if (err.reason) out += `\nWhy: ${err.reason}`;
  if (err.suggestion) out += `\nSuggestion: ${err.suggestion}`;
  return out;
}
