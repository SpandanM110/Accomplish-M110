export {
  taskConfigSchema,
  permissionResponseSchema,
  resumeSessionSchema,
  validate,
} from '@accomplish_ai/agent-core';

export function normalizeIpcError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return new Error((error as { message: string }).message);
  }
  return new Error('Something went wrong. Please try again.');
}
