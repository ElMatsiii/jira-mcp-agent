/**
 * Model Context Protocol (MCP) Server Setup
 * Registers agile tools conforming to Feature 25 & Feature 28.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GeminiService } from '../services/gemini-service';
import {
  DecomposeEpicInputSchema,
  PlanSprintInputSchema,
  DiagnoseMetricsInputSchema,
  SuggestAssigneesInputSchema,
  EstimateStoryPointsInputSchema,
  GenerateAcceptanceCriteriaInputSchema,
  BalanceCapacityInputSchema,
  BreakdownTaskInputSchema,
} from '../schemas/zod-schemas';

export function createMcpServer(aiService: GeminiService): McpServer {
  const mcpServer = new McpServer(
    {
      name: 'jira-mcp-agent',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const server: any = mcpServer;

  // 1. Tool: decompose_epic
  server.registerTool(
    'decompose_epic',
    {
      description: 'Decomposes an agile Epic into actionable User Stories with Gherkin acceptance criteria and Fibonacci points',
      inputSchema: DecomposeEpicInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.decomposeEpic(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing decompose_epic' }) }],
        };
      }
    }
  );

  // Alias: decomposeEpic
  server.registerTool(
    'decomposeEpic',
    {
      description: 'Alias for decompose_epic',
      inputSchema: DecomposeEpicInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.decomposeEpic(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing decomposeEpic' }) }],
        };
      }
    }
  );

  // 2. Tool: plan_sprint
  server.registerTool(
    'plan_sprint',
    {
      description: 'Allocates candidate issues against team story point capacity budget',
      inputSchema: PlanSprintInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.planSprint(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing plan_sprint' }) }],
        };
      }
    }
  );

  // Alias: planSprint
  server.registerTool(
    'planSprint',
    {
      description: 'Alias for plan_sprint',
      inputSchema: PlanSprintInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.planSprint(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing planSprint' }) }],
        };
      }
    }
  );

  // 3. Tool: diagnose_metrics
  server.registerTool(
    'diagnose_metrics',
    {
      description: 'Diagnoses sprint burndown curves, detecting scope inflation, velocity deficits, and blockers',
      inputSchema: DiagnoseMetricsInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.diagnoseMetrics(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing diagnose_metrics' }) }],
        };
      }
    }
  );

  // Alias: diagnoseMetrics
  server.registerTool(
    'diagnoseMetrics',
    {
      description: 'Alias for diagnose_metrics',
      inputSchema: DiagnoseMetricsInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.diagnoseMetrics(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing diagnoseMetrics' }) }],
        };
      }
    }
  );

  // 4. Tool: suggest_assignees
  server.registerTool(
    'suggest_assignees',
    {
      description: 'Suggests team member assignees based on skill matching and capacity availability',
      inputSchema: SuggestAssigneesInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.suggestAssignees(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing suggest_assignees' }) }],
        };
      }
    }
  );

  // Alias: suggestAssignees
  server.registerTool(
    'suggestAssignees',
    {
      description: 'Alias for suggest_assignees',
      inputSchema: SuggestAssigneesInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.suggestAssignees(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing suggestAssignees' }) }],
        };
      }
    }
  );

  // 5. Tool: estimate_story_points
  server.registerTool(
    'estimate_story_points',
    {
      description: 'Estimates Fibonacci story points (1, 2, 3, 5, 8, 13) for an issue',
      inputSchema: EstimateStoryPointsInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.estimateStoryPoints(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing estimate_story_points' }) }],
        };
      }
    }
  );

  // Feature 28 contract name: estimateStoryPoints
  server.registerTool(
    'estimateStoryPoints',
    {
      description: 'Estimates Fibonacci story points (Feature 28 contract)',
      inputSchema: EstimateStoryPointsInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.estimateStoryPoints(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing estimateStoryPoints' }) }],
        };
      }
    }
  );

  // 6. Tool: generateAcceptanceCriteria
  server.registerTool(
    'generateAcceptanceCriteria',
    {
      description: 'Generates formal Gherkin acceptance criteria scenarios (Feature 28 contract)',
      inputSchema: GenerateAcceptanceCriteriaInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.generateAcceptanceCriteria(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing generateAcceptanceCriteria' }) }],
        };
      }
    }
  );

  // Alias: generate_acceptance_criteria
  server.registerTool(
    'generate_acceptance_criteria',
    {
      description: 'Alias for generateAcceptanceCriteria',
      inputSchema: GenerateAcceptanceCriteriaInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.generateAcceptanceCriteria(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing generate_acceptance_criteria' }) }],
        };
      }
    }
  );

  // 7. Tool: balanceSprintCapacity
  server.registerTool(
    'balanceSprintCapacity',
    {
      description: 'Optimizes issue selection against team story point budget (Feature 28 contract)',
      inputSchema: BalanceCapacityInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.planSprint(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing balanceSprintCapacity' }) }],
        };
      }
    }
  );

  // 8. Tool: breakdown_task
  server.registerTool(
    'breakdown_task',
    {
      description: 'Breaks down and segments a prospective task into complementary subtasks (Frontend, Backend, DB, CI/CD, etc.)',
      inputSchema: BreakdownTaskInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.breakdownTask(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing breakdown_task' }) }],
        };
      }
    }
  );

  // Alias: segment_task
  server.registerTool(
    'segment_task',
    {
      description: 'Alias for breakdown_task',
      inputSchema: BreakdownTaskInputSchema.shape,
    },
    async (args: any) => {
      try {
        const result = await aiService.breakdownTask(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Error executing segment_task' }) }],
        };
      }
    }
  );

  return mcpServer;
}
