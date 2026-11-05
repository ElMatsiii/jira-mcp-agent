import request from 'supertest';
import { createServer } from '../../src/server';
import { GeminiService } from '../../src/services/gemini-service';

describe('POST /agent/diagnose-metrics', () => {
  it('diagnoses metrics returning healthStatus, rootCauses, and actionable recommendations (T1-F27-03)', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    const { app } = createServer(aiService);

    const res = await request(app)
      .post('/agent/diagnose-metrics')
      .send({
        sprintId: 'sprint-diag-1',
        burndownData: [
          { day: 1, idealRemaining: 20, actualRemaining: 20 },
          { day: 5, idealRemaining: 12, actualRemaining: 18 },
        ],
        blockedIssuesCount: 2,
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['x-ai-engine']).toBe('offline-heuristic');
    expect(res.body.healthStatus).toBe('AT_RISK');
    expect(res.body.rootCauses.length).toBeGreaterThan(0);
    expect(res.body.actionableRecommendations.length).toBeGreaterThan(0);
  });

  it('handles unexpected internal errors with HTTP 500', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    jest.spyOn(aiService, 'diagnoseMetrics').mockRejectedValueOnce(new Error('Internal diagnosis error'));

    const { app } = createServer(aiService);
    const res = await request(app)
      .post('/agent/diagnose-metrics')
      .send({ sprintId: 'sprint-err-1' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Internal diagnosis error');
  });
});
