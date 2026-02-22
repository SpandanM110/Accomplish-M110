/**
 * In-memory project context store. Keyed by project_id.
 * For production, replace with Redis or persistent DB.
 */

import type { ProjectContext } from '../context/project-context.js';
import { createEmptyContext } from '../context/project-context.js';

const store = new Map<string, ProjectContext>();

export function getContext(projectId: string): ProjectContext {
  let ctx = store.get(projectId);
  if (!ctx) {
    ctx = createEmptyContext(projectId);
    store.set(projectId, ctx);
  }
  return ctx;
}

export function setContext(projectId: string, ctx: ProjectContext): void {
  store.set(projectId, ctx);
}

export function updateContext(
  projectId: string,
  updater: (ctx: ProjectContext) => void,
): ProjectContext {
  const ctx = getContext(projectId);
  updater(ctx);
  store.set(projectId, ctx);
  return ctx;
}

export function deleteContext(projectId: string): boolean {
  return store.delete(projectId);
}
