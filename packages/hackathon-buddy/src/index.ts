#!/usr/bin/env node
/**
 * Hackathon Buddy MCP Server
 * Transport: stdio (default) or HTTP via HACKATHON_BUDDY_TRANSPORT env.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

const transport = process.env.HACKATHON_BUDDY_TRANSPORT || 'stdio';

async function main() {
  const server = createMcpServer();

  if (transport === 'http') {
    const { startHttpServer } = await import('./transport/http.js');
    const port = parseInt(process.env.HACKATHON_BUDDY_HTTP_PORT || '3100', 10);
    await startHttpServer(server, port);
    console.error(`[Hackathon Buddy] HTTP server on port ${port}`);
  } else {
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    console.error('[Hackathon Buddy] stdio transport ready');
  }
}

main().catch((err) => {
  console.error('[Hackathon Buddy] Fatal:', err);
  process.exit(1);
});
