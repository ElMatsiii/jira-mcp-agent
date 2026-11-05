import { startServer } from './server';

// Bootstrap server on configured port
startServer().catch((err) => {
  console.error('[Jira-MCP-Agent] Fatal startup failure:', err);
  process.exit(1);
});
