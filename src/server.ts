import http from 'node:http';
import dotenv from 'dotenv';
import { GeminiService } from './services/gemini-service';
import { createMcpServer } from './mcp/server';
import { createExpressApp } from './api/routes';

dotenv.config();

export interface ServerInstance {
  httpServer: http.Server;
  app: ReturnType<typeof createExpressApp>;
  mcpServer: ReturnType<typeof createMcpServer>;
  aiService: GeminiService;
}

export function createServer(customAiService?: GeminiService): {
  app: ReturnType<typeof createExpressApp>;
  mcpServer: ReturnType<typeof createMcpServer>;
  aiService: GeminiService;
} {
  const aiService = customAiService || new GeminiService();
  const mcpServer = createMcpServer(aiService);
  const app = createExpressApp(aiService, mcpServer);

  return { app, mcpServer, aiService };
}

export function startServer(port?: number, customAiService?: GeminiService): Promise<ServerInstance> {
  const { app, mcpServer, aiService } = createServer(customAiService);
  const listenPort = port || parseInt(process.env.PORT || process.env.MCP_PORT || '3000', 10);

  return new Promise((resolve, reject) => {
    const httpServer = http.createServer(app);

    httpServer.listen(listenPort, () => {
      console.log(`[Jira-MCP-Agent] Server listening on HTTP port :${listenPort}`);
      const modeLine = `[Jira-MCP-Agent] Active mode: ${aiService.describeMode()}`;
      if (aiService.isLiveMode()) console.log(modeLine);
      else console.warn(modeLine);
      console.log(`[Jira-MCP-Agent] REST endpoints: /agent/decompose-epic, /agent/plan-sprint, /agent/diagnose-metrics, /agent/improve-story, /agent/breakdown-task, /healthz`);
      console.log(`[Jira-MCP-Agent] MCP SSE transport: /sse -> /messages`);

      resolve({ httpServer, app, mcpServer, aiService });
    });

    httpServer.on('error', (err) => {
      console.error(`[Jira-MCP-Agent] Server error: ${err.message}`);
      reject(err);
    });
  });
}
