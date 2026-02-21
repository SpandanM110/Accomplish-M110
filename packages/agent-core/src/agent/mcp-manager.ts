/**
 * Manages MCP client connections and tool collection for the AI SDK agent.
 * Connects to local stdio MCP servers (start-task, file-permission, etc.).
 */

import { createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CoreTool } from 'ai';

export interface McpServerSpec {
  name: string;
  command: string[];
  env?: Record<string, string>;
}

export interface McpManagerResult {
  tools: Record<string, CoreTool>;
  clients: Array<{ close: () => Promise<void> }>;
}

/**
 * Creates MCP clients for the given server specs and collects all tools.
 * Callers must close the returned clients when done.
 */
export async function createMcpClientsAndTools(
  serverSpecs: McpServerSpec[],
): Promise<McpManagerResult> {
  const clients: Array<{ close: () => Promise<void> }> = [];
  const allTools: Record<string, CoreTool> = {};

  for (const spec of serverSpecs) {
    if (spec.command.length < 1) {
      console.warn(`[MCP Manager] Skipping ${spec.name}: empty command`);
      continue;
    }

    try {
      const [cmd, ...args] = spec.command;
      const transport = new StdioClientTransport({
        command: cmd,
        args,
        env: spec.env ? { ...process.env, ...spec.env } : undefined,
      });

      const client = await createMCPClient({ transport });
      clients.push(client);

      const serverTools = await client.tools();
      for (const [toolName, tool] of Object.entries(serverTools)) {
        const key = toolName in allTools ? `${spec.name}_${toolName}` : toolName;
        allTools[key] = tool as CoreTool;
      }
      console.log(`[MCP Manager] Loaded ${Object.keys(serverTools).length} tools from ${spec.name}`);
    } catch (err) {
      console.error(`[MCP Manager] Failed to connect to ${spec.name}:`, err);
      throw err;
    }
  }

  return { tools: allTools, clients };
}
