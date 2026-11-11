import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { GeminiService } from '../services/gemini-service';
import {
  DecomposeEpicInputSchema,
  PlanSprintInputSchema,
  DiagnoseMetricsInputSchema,
  EstimateStoryPointsInputSchema,
  HealthCheckResponseSchema,
} from '../schemas/zod-schemas';
import { HealthCheckResponse } from '../types';

export function createExpressApp(aiService: GeminiService, mcpServer?: McpServer): Express {
  const app = express();

  // 1. Global Middlewares
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Handle JSON parse errors & Payload too large
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({ error: 'Payload Too Large: exceeded 1MB limit' });
    }
    next(err);
  });

  // 2. Health Check
  app.get('/healthz', (req: Request, res: Response) => {
    const response: HealthCheckResponse = {
      status: 'ok',
      model: aiService.getModelName(),
      mode: aiService.getMode(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  });

  // 3. POST /agent/decompose-epic
  app.post('/agent/decompose-epic', async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty' });
    }

    const parseResult = DecomposeEpicInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Validation failed';
      return res.status(422).json({ error: firstIssue, details: parseResult.error.format() });
    }

    try {
      const result = await aiService.decomposeEpic(parseResult.data);
      res.setHeader('x-ai-engine', result.source);
      return res.status(200).json(result.data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Epic decomposition failed' });
    }
  });

  // 4. POST /agent/plan-sprint
  app.post('/agent/plan-sprint', async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty' });
    }

    const parseResult = PlanSprintInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Validation failed';
      return res.status(422).json({ error: firstIssue, details: parseResult.error.format() });
    }

    try {
      const result = await aiService.planSprint(parseResult.data);
      res.setHeader('x-ai-engine', result.source);
      return res.status(200).json(result.data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Sprint planning failed' });
    }
  });

  // 5. POST /agent/diagnose-metrics
  app.post('/agent/diagnose-metrics', async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty' });
    }

    const parseResult = DiagnoseMetricsInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Validation failed';
      return res.status(422).json({ error: firstIssue, details: parseResult.error.format() });
    }

    try {
      const result = await aiService.diagnoseMetrics(parseResult.data);
      res.setHeader('x-ai-engine', result.source);
      return res.status(200).json(result.data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Metrics diagnosis failed' });
    }
  });

  app.post('/agent/improve-story', async (req: Request, res: Response) => {
    const parseResult = EstimateStoryPointsInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({ error: parseResult.error.issues[0]?.message || 'Validation failed' });
    }
    try {
      const [estimate, criteria] = await Promise.all([
        aiService.estimateStoryPoints(parseResult.data),
        aiService.generateAcceptanceCriteria({
          title: parseResult.data.title,
          description: parseResult.data.description,
        }),
      ]);
      res.setHeader('x-ai-engine', estimate.source);
      return res.status(200).json({
        storyPoints: estimate.data.storyPoints,
        confidence: estimate.data.confidence,
        reasoning: estimate.data.reasoning,
        complexityFactors: estimate.data.complexityFactors,
        acceptanceCriteriaGherkin: criteria.data.acceptanceCriteriaGherkin,
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Story improvement failed' });
    }
  });

  // 6. SSE Transport for MCP
  let activeTransport: SSEServerTransport | null = null;

  app.get('/sse', async (req: Request, res: Response) => {
    if (!mcpServer) {
      return res.status(503).json({ error: 'MCP Server not attached' });
    }
    try {
      activeTransport = new SSEServerTransport('/messages', res);
      await mcpServer.connect(activeTransport);
    } catch (err: any) {
      res.status(500).end(`Failed to establish SSE session: ${err.message}`);
    }
  });

  app.post('/messages', async (req: Request, res: Response) => {
    if (!activeTransport) {
      return res.status(400).json({ error: 'No active SSE connection session' });
    }
    try {
      await activeTransport.handlePostMessage(req, res);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 7. Catch-All 404 Route Handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  return app;
}
