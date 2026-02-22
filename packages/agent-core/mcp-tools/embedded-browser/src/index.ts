#!/usr/bin/env node
/**
 * Embedded browser MCP — fast, Electron-native.
 * 5 tools: navigate, snapshot, click, type, scroll.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

const API_URL = process.env.EMBEDDED_BROWSER_API_URL || 'http://127.0.0.1:9230';

async function apiCall(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data;
}

const server = new Server(
  { name: 'embedded-browser', version: '0.0.1' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'browser_navigate',
      description:
        'Navigate to a URL. Call this first to open a page. Use https://www.google.com for search.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to (e.g. https://www.google.com)' },
        },
      },
    },
    {
      name: 'browser_snapshot',
      description:
        'Get page content (text, URL, title). Use to read what is on the page. Optional selector for a specific element.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'Optional CSS selector (e.g. #main, .content) to get a specific element',
          },
        },
      },
    },
    {
      name: 'browser_click',
      description:
        'Click an element. Use CSS selector from snapshot (e.g. input[name="q"], button[type="submit"]).',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          selector: { type: 'string', description: 'CSS selector of element to click' },
        },
      },
    },
    {
      name: 'browser_type',
      description:
        'Type text into an input. Use for search boxes (e.g. selector: input[name="q"], text: "Node.js LTS").',
      inputSchema: {
        type: 'object',
        required: ['selector', 'text'],
        properties: {
          selector: { type: 'string', description: 'CSS selector of input element' },
          text: { type: 'string', description: 'Text to type' },
        },
      },
    },
    {
      name: 'browser_scroll',
      description: 'Scroll the page up or down.',
      inputSchema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
          amount: { type: 'number', description: 'Pixels to scroll (default 300)' },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as Record<string, unknown>;

  try {
    let result: unknown;
    switch (name) {
      case 'browser_navigate':
        result = await apiCall('/navigate', { url: a.url });
        break;
      case 'browser_snapshot':
        result = await apiCall('/snapshot', { selector: a.selector });
        break;
      case 'browser_click':
        result = await apiCall('/click', { selector: a.selector });
        break;
      case 'browser_type':
        result = await apiCall('/type', { selector: a.selector, text: a.text });
        break;
      case 'browser_scroll':
        result = await apiCall('/scroll', { direction: a.direction, amount: a.amount });
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[embedded-browser] MCP ready');
}

main().catch((err) => {
  console.error('[embedded-browser] Fatal:', err);
  process.exit(1);
});
