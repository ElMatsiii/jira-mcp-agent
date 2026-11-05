import { createMcpServer } from '../../src/mcp/server';
import { GeminiService } from '../../src/services/gemini-service';
import { TEST_FIXTURES } from '../mocks/fixtures';

describe('MCP Server Tools (Feature 25 & 28)', () => {
  let aiService: GeminiService;
  let mcpServer: ReturnType<typeof createMcpServer>;

  const getTools = (server: any) => server._registeredTools;
  const getTool = (server: any, name: string) => {
    const tools = getTools(server);
    if (!tools) return undefined;
    if (typeof tools.get === 'function') return tools.get(name);
    return tools[name];
  };
  const getToolNames = (server: any): string[] => {
    const tools = getTools(server);
    if (!tools) return [];
    if (typeof tools.keys === 'function') return Array.from(tools.keys());
    return Object.keys(tools);
  };

  beforeEach(() => {
    aiService = new GeminiService({ forceOffline: true });
    mcpServer = createMcpServer(aiService);
  });

  it('registers all required tools and alias tools', () => {
    const toolNames = getToolNames(mcpServer);
    expect(toolNames.length).toBeGreaterThan(0);
    expect(toolNames).toContain('decompose_epic');
    expect(toolNames).toContain('decomposeEpic');
    expect(toolNames).toContain('plan_sprint');
    expect(toolNames).toContain('planSprint');
    expect(toolNames).toContain('diagnose_metrics');
    expect(toolNames).toContain('diagnoseMetrics');
    expect(toolNames).toContain('suggest_assignees');
    expect(toolNames).toContain('suggestAssignees');
    expect(toolNames).toContain('estimate_story_points');
    expect(toolNames).toContain('estimateStoryPoints');
    expect(toolNames).toContain('generateAcceptanceCriteria');
    expect(toolNames).toContain('generate_acceptance_criteria');
    expect(toolNames).toContain('balanceSprintCapacity');
  });

  it('executes decompose_epic tool and returns valid content array', async () => {
    const tool = getTool(mcpServer, 'decompose_epic');
    expect(tool).toBeDefined();

    const result = await tool.handler(TEST_FIXTURES.authEpic, {} as any);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.epicTitle).toBe(TEST_FIXTURES.authEpic.epicTitle);
    expect(parsed.stories.length).toBeGreaterThan(0);
  });

  it('executes plan_sprint tool and returns formatted sprint plan', async () => {
    const tool = getTool(mcpServer, 'plan_sprint');

    const result = await tool.handler(
      {
        sprintGoal: 'Test sprint plan',
        teamCapacityStoryPoints: 15,
        candidateIssues: TEST_FIXTURES.candidateIssues,
      },
      {} as any
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.allocatedStoryPoints).toBe(13);
    expect(parsed.recommendedIssueIds).toEqual(['iss-1', 'iss-2']);
  });

  it('executes balanceSprintCapacity tool (Feature 28)', async () => {
    const tool = getTool(mcpServer, 'balanceSprintCapacity');

    const result = await tool.handler(
      {
        sprintGoal: 'Capacity balance',
        teamCapacityStoryPoints: 15,
        candidateIssues: TEST_FIXTURES.candidateIssues,
      },
      {} as any
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.allocatedStoryPoints).toBe(13);
  });

  it('executes diagnose_metrics tool and returns diagnosis and recommendations', async () => {
    const tool = getTool(mcpServer, 'diagnose_metrics');

    const result = await tool.handler(
      {
        sprintId: 'sprint-diag-1',
        burndownData: TEST_FIXTURES.laggingBurndown,
        blockedIssuesCount: 2,
      },
      {} as any
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.healthStatus).toBe('AT_RISK');
    expect(parsed.rootCauses.length).toBeGreaterThan(0);
  });

  it('executes suggest_assignees tool and recommends top team member', async () => {
    const tool = getTool(mcpServer, 'suggest_assignees');

    const result = await tool.handler(
      {
        issueTitle: 'Go gRPC Service Handler',
        requiredSkills: ['go', 'grpc'],
        teamMembers: TEST_FIXTURES.sampleTeamMembers,
      },
      {} as any
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedAssigneeId).toBe('dev-1');
  });

  it('executes estimate_story_points tool (Feature 28)', async () => {
    const tool = getTool(mcpServer, 'estimate_story_points');

    const result = await tool.handler(
      {
        title: 'Kafka Event Ingestion Architecture',
        description: 'High throughput distributed worker',
      },
      {} as any
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.storyPoints).toBe(8);
  });

  it('executes generateAcceptanceCriteria tool (Feature 28)', async () => {
    const tool = getTool(mcpServer, 'generateAcceptanceCriteria');

    const result = await tool.handler(
      {
        title: 'Multi-Tenant Auth Token Verification',
      },
      {} as any
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.acceptanceCriteriaGherkin).toContain('Feature: Multi-Tenant Auth Token Verification');
    expect(parsed.scenariosCount).toBe(2);
  });

  it('handles execution error safely without crashing', async () => {
    const tool = getTool(mcpServer, 'decompose_epic');

    // Force an internal rejection
    jest.spyOn(aiService, 'decomposeEpic').mockRejectedValueOnce(new Error('Simulated internal failure'));

    const result = await tool.handler({ epicTitle: 'Fail Test' }, {} as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Simulated internal failure');
  });
});
