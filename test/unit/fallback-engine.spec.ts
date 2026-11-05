import { OfflineFallbackEngine } from '../../src/services/fallback-engine';
import { TEST_FIXTURES } from '../mocks/fixtures';

describe('OfflineFallbackEngine', () => {
  describe('estimateStoryPoints', () => {
    it('returns 8 points for high complexity keywords', () => {
      expect(OfflineFallbackEngine.estimateStoryPoints('Distributed Consensus Architecture')).toBe(8);
      expect(OfflineFallbackEngine.estimateStoryPoints('OAuth2 Multi-Tenant SSO Migration')).toBe(8);
      expect(OfflineFallbackEngine.estimateStoryPoints('Database Sharding and Partitioning')).toBe(8);
    });

    it('returns 5 points for medium-high complexity keywords', () => {
      expect(OfflineFallbackEngine.estimateStoryPoints('Implement JWT Authentication Service')).toBe(5);
      expect(OfflineFallbackEngine.estimateStoryPoints('Kafka Event Pipeline & Streaming Worker')).toBe(5);
      expect(OfflineFallbackEngine.estimateStoryPoints('GraphQL Client Endpoint Integration')).toBe(5);
    });

    it('returns 3 points for standard CRUD and UI keywords', () => {
      expect(OfflineFallbackEngine.estimateStoryPoints('Build CRUD REST Controller Endpoint')).toBe(3);
      expect(OfflineFallbackEngine.estimateStoryPoints('Issue Details Screen and Form Modal')).toBe(3);
    });

    it('returns 2 points for low complexity keywords', () => {
      expect(OfflineFallbackEngine.estimateStoryPoints('Add Input Validation and Error Handling')).toBe(2);
      expect(OfflineFallbackEngine.estimateStoryPoints('Unit test suite and mock stubs')).toBe(2);
    });

    it('returns 1 point for trivial or empty inputs (T2-F28-01)', () => {
      expect(OfflineFallbackEngine.estimateStoryPoints('', '')).toBe(1);
      expect(OfflineFallbackEngine.estimateStoryPoints('Fix typo in header label', '')).toBe(1);
      expect(OfflineFallbackEngine.estimateStoryPoints('a', '')).toBe(1);
    });

    it('estimates based on word count when no keywords match', () => {
      const longText = 'This is a long description with lots of detailed explanations that goes on and on and contains more than thirty words in total length to verify the heuristic word count branch of the estimation algorithm';
      expect(OfflineFallbackEngine.estimateStoryPoints('Generic feature', longText)).toBe(5);

      const medText = 'A moderate description with eleven words in it right here now';
      expect(OfflineFallbackEngine.estimateStoryPoints('Generic feature', medText)).toBe(3);
    });

    it('produces full estimation result with confidence and complexity factors', () => {
      const res = OfflineFallbackEngine.estimateStoryPointsFull({
        title: 'Distributed Consensus Architecture',
        description: 'Implement Raft algorithm',
        type: 'STORY',
      });
      expect(res.storyPoints).toBe(8);
      expect(res.confidence).toBe(0.85);
      expect(res.complexityFactors.length).toBeGreaterThan(0);
    });
  });

  describe('generateAcceptanceCriteria', () => {
    it('generates standard Gherkin syntax with Given/When/Then (T1-F28-02)', () => {
      const gherkin = OfflineFallbackEngine.generateAcceptanceCriteria('User Authentication Flow');
      expect(gherkin).toContain('Feature: User Authentication Flow');
      expect(gherkin).toContain('Scenario: Successful execution (Happy Path)');
      expect(gherkin).toContain('Given');
      expect(gherkin).toContain('When');
      expect(gherkin).toContain('Then');
      expect(gherkin).toContain('Scenario: Validation or boundary handling (Negative Path)');
    });

    it('produces full criteria response with scenariosCount', () => {
      const res = OfflineFallbackEngine.generateAcceptanceCriteriaFull({
        title: 'Payment Gateway',
        description: 'Stripe integration',
        userRole: 'shopper',
      });
      expect(res.scenariosCount).toBe(2);
      expect(res.acceptanceCriteriaGherkin).toContain('shopper');
    });
  });

  describe('decomposeEpic', () => {
    it('decomposes authentication epic into auth-specific user stories', () => {
      const res = OfflineFallbackEngine.decomposeEpic(TEST_FIXTURES.authEpic);
      expect(res.epicTitle).toBe(TEST_FIXTURES.authEpic.epicTitle);
      expect(res.stories.length).toBeGreaterThanOrEqual(3);
      for (const story of res.stories) {
        expect(story.title).toContain('[AUTH]');
        expect(story.estimatedStoryPoints).toBeGreaterThan(0);
        expect(story.acceptanceCriteriaGherkin).toContain('Scenario:');
        expect(story.acceptanceCriteriaGherkin).toContain('Given');
      }
    });

    it('decomposes issue epic into backlog/kanban user stories', () => {
      const res = OfflineFallbackEngine.decomposeEpic(TEST_FIXTURES.issueEpic);
      expect(res.stories.length).toBeGreaterThanOrEqual(3);
      expect(res.stories.some((s) => s.title.includes('Interactive Kanban') || s.title.includes('gRPC'))).toBe(true);
    });

    it('decomposes stream/kafka epic into ingestion user stories', () => {
      const res = OfflineFallbackEngine.decomposeEpic(TEST_FIXTURES.kafkaEpic);
      expect(res.stories.length).toBeGreaterThanOrEqual(3);
      expect(res.stories.some((s) => s.title.includes('Ingestion') || s.title.includes('Consumer'))).toBe(true);
    });

    it('decomposes generic epic into universal architectural slices', () => {
      const res = OfflineFallbackEngine.decomposeEpic({
        epicTitle: 'Automated Billing and Invoicing',
        epicDescription: 'Generate monthly invoices and send PDF receipts',
        projectKey: 'BILL',
      });
      expect(res.stories.length).toBeGreaterThanOrEqual(3);
      expect(res.stories[0].title).toContain('Core Data Contracts');
    });
  });

  describe('planSprint', () => {
    it('allocates candidate issues within team capacity (T1-F27-02)', () => {
      const res = OfflineFallbackEngine.planSprint({
        sprintGoal: 'Deliver MVP release',
        teamCapacityStoryPoints: 15,
        candidateIssues: [
          { id: 'iss-1', storyPoints: 5 },
          { id: 'iss-2', storyPoints: 8 },
          { id: 'iss-3', storyPoints: 5 },
        ],
      });

      expect(res.allocatedStoryPoints).toBe(13);
      expect(res.recommendedIssueIds).toEqual(['iss-1', 'iss-2']);
      expect(res.capacityUtilizationPercent).toBe(87);
      expect(res.riskAssessment).toBe('OPTIMAL');
    });

    it('returns empty selection when capacity is 0 (T2-F28-02)', () => {
      const res = OfflineFallbackEngine.planSprint({
        sprintGoal: 'Empty capacity sprint',
        teamCapacityStoryPoints: 0,
        candidateIssues: [{ id: 'iss-1', storyPoints: 5 }],
      });

      expect(res.allocatedStoryPoints).toBe(0);
      expect(res.capacityUtilizationPercent).toBe(0);
      expect(res.recommendedIssueIds).toEqual([]);
    });

    it('returns empty selection when candidate issues is empty', () => {
      const res = OfflineFallbackEngine.planSprint({
        sprintGoal: 'No issues',
        teamCapacityStoryPoints: 20,
        candidateIssues: [],
      });

      expect(res.allocatedStoryPoints).toBe(0);
      expect(res.recommendedIssueIds).toEqual([]);
    });

    it('recommends backlog deferral when all candidate issues exceed total capacity (T2-F28-03)', () => {
      const res = OfflineFallbackEngine.planSprint({
        sprintGoal: 'Tiny capacity sprint',
        teamCapacityStoryPoints: 10,
        candidateIssues: [
          { id: 'huge-1', storyPoints: 20 },
          { id: 'huge-2', storyPoints: 15 },
        ],
      });

      expect(res.allocatedStoryPoints).toBe(0);
      expect(res.recommendedIssueIds).toEqual([]);
      expect(res.riskAssessment).toBe('HIGH_CAPACITY_RISK');
      expect(res.rationale).toContain('Backlog deferral recommended');
    });

    it('marks risk as MEDIUM_CAPACITY_RISK when allocation exceeds 90%', () => {
      const res = OfflineFallbackEngine.planSprint({
        sprintGoal: 'High capacity test',
        teamCapacityStoryPoints: 10,
        candidateIssues: [
          { id: 'iss-1', storyPoints: 5 },
          { id: 'iss-2', storyPoints: 5 },
        ],
      });

      expect(res.allocatedStoryPoints).toBe(10);
      expect(res.capacityUtilizationPercent).toBe(100);
      expect(res.riskAssessment).toBe('MEDIUM_CAPACITY_RISK');
    });
  });

  describe('diagnoseMetrics', () => {
    it('diagnoses lagging burndown and blocked issues as AT_RISK (T1-F27-03)', () => {
      const res = OfflineFallbackEngine.diagnoseMetrics({
        sprintId: 'sprint-diag-1',
        burndownData: [
          { day: 1, idealRemaining: 20, actualRemaining: 20 },
          { day: 5, idealRemaining: 12, actualRemaining: 18 },
        ],
        blockedIssuesCount: 2,
      });

      expect(res.healthStatus).toBe('AT_RISK');
      expect(res.rootCauses.length).toBeGreaterThan(0);
      expect(res.actionableRecommendations.length).toBeGreaterThan(0);
      expect(res.diagnosis).toContain('at risk of velocity deficit');
    });

    it('diagnoses on-track sprint as HEALTHY', () => {
      const res = OfflineFallbackEngine.diagnoseMetrics({
        sprintId: 'sprint-healthy-1',
        burndownData: TEST_FIXTURES.healthyBurndown,
        blockedIssuesCount: 0,
      });

      expect(res.healthStatus).toBe('HEALTHY');
      expect(res.rootCauses[0]).toContain('ideal burndown trajectory');
    });

    it('handles empty burndown data gracefully', () => {
      const res = OfflineFallbackEngine.diagnoseMetrics({
        sprintId: 'sprint-empty-1',
        burndownData: [],
        blockedIssuesCount: 0,
      });

      expect(res.healthStatus).toBe('HEALTHY');
      expect(res.diagnosis).toContain('no burndown data points');
    });

    it('flags blocked issues even if burndown is empty', () => {
      const res = OfflineFallbackEngine.diagnoseMetrics({
        sprintId: 'sprint-blocked-empty',
        burndownData: [],
        blockedIssuesCount: 3,
      });

      expect(res.healthStatus).toBe('AT_RISK');
      expect(res.rootCauses[0]).toContain('BLOCKED');
    });
  });

  describe('suggestAssignees', () => {
    it('ranks team members according to skill match and available capacity', () => {
      const res = OfflineFallbackEngine.suggestAssignees({
        issueTitle: 'Implement Go gRPC Server',
        issueDescription: 'Connect to PostgreSQL database and setup RPC handlers',
        requiredSkills: ['go', 'grpc'],
        teamMembers: TEST_FIXTURES.sampleTeamMembers,
      });

      expect(res.recommendedAssigneeId).toBe('dev-1'); // Alice has go, grpc, postgresql skills
      expect(res.recommendations[0].memberName).toBe('Alice Backend');
      expect(res.recommendations[0].matchScore).toBeGreaterThan(res.recommendations[1].matchScore);
    });
  });
});
