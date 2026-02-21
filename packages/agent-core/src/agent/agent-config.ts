/**
 * Converts OpenCode-generated config to AgentConfig for the AI SDK adapter.
 */

import type { GeneratedConfig } from '../opencode/config-generator.js';
import type { McpServerSpec } from './mcp-manager.js';

export interface AgentConfig {
  systemPrompt: string;
  mcpServerSpecs: McpServerSpec[];
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface AgentConfigInput {
  generatedConfig: GeneratedConfig;
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Converts a GeneratedConfig (from generateConfig) to AgentConfig for the AgentAdapter.
 * Only includes local stdio MCP servers (not remote HTTP connectors).
 */
export function toAgentConfig(input: AgentConfigInput): AgentConfig {
  const { generatedConfig, provider, modelId, apiKey, baseUrl } = input;
  const mcpServerSpecs: McpServerSpec[] = [];

  for (const [name, server] of Object.entries(generatedConfig.mcpServers)) {
    if (server.type !== 'local' || !server.command?.length || server.enabled === false) {
      continue;
    }
    mcpServerSpecs.push({
      name,
      command: server.command,
      env: server.environment,
    });
  }

  return {
    systemPrompt: generatedConfig.systemPrompt,
    mcpServerSpecs,
    provider,
    modelId,
    apiKey,
    baseUrl,
  };
}
