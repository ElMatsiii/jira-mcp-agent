import { GeminiService } from '../../src/services/gemini-service';
import { TEST_FIXTURES } from '../mocks/fixtures';

describe('GeminiService', () => {
  describe('Offline and Fallback Behavior', () => {
    it('initializes in mock mode when no API key is provided', () => {
      const service = new GeminiService({ forceOffline: true });
      expect(service.isLiveMode()).toBe(false);
      expect(service.getMode()).toBe('mock');
      expect(service.getModelName()).toBe('gemini-3.5-flash-lite');
    });

    it('decomposes epic via offline fallback engine', async () => {
      const service = new GeminiService({ forceOffline: true });
      const res = await service.decomposeEpic(TEST_FIXTURES.authEpic);

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.epicTitle).toBe(TEST_FIXTURES.authEpic.epicTitle);
      expect(res.data.stories.length).toBeGreaterThanOrEqual(3);
      expect(res.model).toBe('offline-heuristic');
    });

    it('plans sprint via offline fallback engine', async () => {
      const service = new GeminiService({ forceOffline: true });
      const res = await service.planSprint({
        sprintGoal: 'Deliver MVP release',
        teamCapacityStoryPoints: 15,
        candidateIssues: TEST_FIXTURES.candidateIssues,
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.allocatedStoryPoints).toBe(13);
      expect(res.data.recommendedIssueIds).toEqual(['iss-1', 'iss-2']);
    });

    it('diagnoses metrics via offline fallback engine', async () => {
      const service = new GeminiService({ forceOffline: true });
      const res = await service.diagnoseMetrics({
        sprintId: 'sprint-diag-1',
        burndownData: TEST_FIXTURES.laggingBurndown,
        blockedIssuesCount: 2,
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.healthStatus).toBe('AT_RISK');
      expect(res.data.rootCauses.length).toBeGreaterThan(0);
    });

    it('suggests assignees via offline fallback engine', async () => {
      const service = new GeminiService({ forceOffline: true });
      const res = await service.suggestAssignees({
        issueTitle: 'Kafka consumer implementation',
        requiredSkills: ['kafka', 'dotnet'],
        teamMembers: TEST_FIXTURES.sampleTeamMembers,
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.recommendedAssigneeId).toBe('dev-3');
    });

    it('estimates story points via offline fallback engine', async () => {
      const service = new GeminiService({ forceOffline: true });
      const res = await service.estimateStoryPoints({
        title: 'Distributed consensus algorithm',
        description: 'Implement Raft protocol',
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.storyPoints).toBe(8);
    });

    it('generates acceptance criteria via offline fallback engine', async () => {
      const service = new GeminiService({ forceOffline: true });
      const res = await service.generateAcceptanceCriteria({
        title: 'Export CSV reports',
        description: 'Download sprint burndown metrics',
        userRole: 'scrum master',
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.acceptanceCriteriaGherkin).toContain('Feature: Export CSV reports');
      expect(res.data.acceptanceCriteriaGherkin).toContain('scrum master');
    });
  });

  describe('Live Mode and Mock Interception', () => {
    it('seamlessly switches to fallback engine when live call times out (T2-F26-04)', async () => {
      const service = new GeminiService({
        apiKey: 'test-fake-key',
        timeoutMs: 50,
      });

      // Mock internal genAI client with an artificial hang
      (service as any).genAI = {
        models: {
          generateContent: () => new Promise((resolve) => setTimeout(resolve, 500)),
        },
      };

      const res = await service.decomposeEpic(TEST_FIXTURES.authEpic);
      expect(res.source).toBe('offline-heuristic');
      expect(res.data.stories.length).toBeGreaterThan(0);
    });

    it('seamlessly fails over to offline engine when API returns 429 rate limit (T2-F26-01)', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockRejectedValue(new Error('429 Too Many Requests: ResourceExhausted')),
        },
      };

      const res = await service.planSprint({
        sprintGoal: 'Deliver MVP',
        teamCapacityStoryPoints: 15,
        candidateIssues: TEST_FIXTURES.candidateIssues,
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.allocatedStoryPoints).toBe(13);
    });

    it('seamlessly fails over to offline engine when API returns 503 service unavailable (T2-F26-02)', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockRejectedValue(new Error('503 Service Unavailable')),
        },
      };

      const res = await service.diagnoseMetrics({
        sprintId: 'sprint-503',
        burndownData: TEST_FIXTURES.laggingBurndown,
        blockedIssuesCount: 1,
      });

      expect(res.source).toBe('offline-heuristic');
      expect(res.data.healthStatus).toBe('AT_RISK');
    });

    it('strips markdown json fences from Gemini response (T2-F26-03)', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      const mockStories = {
        epicTitle: 'Fence Test Epic',
        stories: [
          {
            title: 'Story 1',
            description: 'Desc 1',
            type: 'STORY',
            priority: 'HIGH',
            estimatedStoryPoints: 3,
            acceptanceCriteriaGherkin: 'Scenario: Clean',
          },
        ],
      };

      const wrappedJson = '```json\n' + JSON.stringify(mockStories) + '\n```';

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: wrappedJson }),
        },
      };

      const res = await service.decomposeEpic({ epicTitle: 'Fence Test Epic' });
      expect(res.source).toBe('gemini-3.5-flash-lite');
      expect(res.data.epicTitle).toBe('Fence Test Epic');
      expect(res.data.stories[0].title).toBe('Story 1');
    });

    it('executes live planSprint when model returns valid response', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      const mockPlan = {
        allocatedStoryPoints: 13,
        capacityUtilizationPercent: 87,
        recommendedIssueIds: ['iss-1', 'iss-2'],
        riskAssessment: 'LOW',
        rationale: 'Optimal allocation from Gemini 2.0 Flash',
      };

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(mockPlan) }),
        },
      };

      const res = await service.planSprint({
        sprintGoal: 'Live planning test',
        teamCapacityStoryPoints: 15,
        candidateIssues: TEST_FIXTURES.candidateIssues,
      });

      expect(res.source).toBe('gemini-3.5-flash-lite');
      expect(res.data.allocatedStoryPoints).toBe(13);
      expect(res.data.rationale).toContain('Gemini 2.0 Flash');
    });

    it('executes live diagnoseMetrics when model returns valid response', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      const mockDiagnosis = {
        healthStatus: 'HEALTHY',
        diagnosis: 'Sprint is on target',
        rootCauses: ['No impediments'],
        actionableRecommendations: ['Keep steady cadence'],
      };

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(mockDiagnosis) }),
        },
      };

      const res = await service.diagnoseMetrics({
        sprintId: 'sprint-live-1',
        burndownData: TEST_FIXTURES.healthyBurndown,
      });

      expect(res.source).toBe('gemini-3.5-flash-lite');
      expect(res.data.healthStatus).toBe('HEALTHY');
    });

    it('executes live estimateStoryPoints when model returns valid response', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      const mockEstimate = {
        storyPoints: 5,
        confidence: 0.9,
        reasoning: 'Medium complexity Kafka setup',
        complexityFactors: ['Streaming'],
      };

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(mockEstimate) }),
        },
      };

      const res = await service.estimateStoryPoints({
        title: 'Kafka Consumer',
      });

      expect(res.source).toBe('gemini-3.5-flash-lite');
      expect(res.data.storyPoints).toBe(5);
    });

    it('executes live generateAcceptanceCriteria when model returns valid response', async () => {
      const service = new GeminiService({ apiKey: 'test-fake-key' });

      const mockCriteria = {
        acceptanceCriteriaGherkin: 'Feature: Live Criteria\nScenario: OK\nGiven valid input',
        scenariosCount: 1,
      };

      (service as any).genAI = {
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(mockCriteria) }),
        },
      };

      const res = await service.generateAcceptanceCriteria({
        title: 'Live Criteria',
      });

      expect(res.source).toBe('gemini-3.5-flash-lite');
      expect(res.data.acceptanceCriteriaGherkin).toContain('Feature: Live Criteria');
    });
  });
});
