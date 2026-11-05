import request from 'supertest';
import { createServer } from '../../src/server';
import { GeminiService } from '../../src/services/gemini-service';

describe('POST /agent/plan-sprint', () => {
  it('allocates candidate issues against team capacity (T1-F27-02)', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    const { app } = createServer(aiService);

    const res = await request(app)
      .post('/agent/plan-sprint')
      .send({
        sprintGoal: 'Deliver MVP release',
        teamCapacityStoryPoints: 15,
        candidateIssues: [
          { id: 'iss-1', storyPoints: 5 },
          { id: 'iss-2', storyPoints: 8 },
          { id: 'iss-3', storyPoints: 5 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['x-ai-engine']).toBe('offline-heuristic');
    expect(res.body.allocatedStoryPoints).toBe(13);
    expect(res.body.recommendedIssueIds).toEqual(['iss-1', 'iss-2']);
    expect(res.body.capacityUtilizationPercent).toBeGreaterThan(80);
    expect(res.body.riskAssessment).toBe('OPTIMAL');
    expect(res.body.rationale).toBeDefined();
  });

  it('handles unexpected internal errors with HTTP 500', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    jest.spyOn(aiService, 'planSprint').mockRejectedValueOnce(new Error('Internal planning fault'));

    const { app } = createServer(aiService);
    const res = await request(app)
      .post('/agent/plan-sprint')
      .send({ sprintGoal: 'Test fail', teamCapacityStoryPoints: 10 });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Internal planning fault');
  });
});
