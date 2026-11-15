import request from 'supertest';
import { createServer } from '../../src/server';
import { GeminiService } from '../../src/services/gemini-service';

/** Live-mode service whose Gemini client answers by prompt: estimation vs. acceptance criteria. */
const liveServiceAnswering = (estimate: unknown, criteria: unknown) => {
  const service = new GeminiService({ apiKey: 'AQ.fake', modelName: 'gemini-3.5-flash-lite' });
  (service as any).genAI = {
    models: {
      generateContent: jest.fn(async (params: { contents: string }) => ({
        text: JSON.stringify(params.contents.startsWith('Estimate') ? estimate : criteria),
      })),
    },
  };
  return service;
};

describe('POST /agent/improve-story', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('always returns every field the BFF requires, including acceptanceCriteriaGherkin', async () => {
    const service = liveServiceAnswering(
      { storyPoints: 4, confidence: 0.9, reasoning: 'OAuth estándar', complexityFactors: ['OAuth2'] },
      // Shape returned by live Gemini before this fix: no acceptanceCriteriaGherkin.
      { title: 'Login', primaryUserPersona: 'user', scenariosCount: 2, gherkinText: 'Feature: Login\n  Scenario: ok' },
    );
    const { app } = createServer(service);

    const res = await request(app).post('/agent/improve-story').send({ title: 'Login con Google', type: 'STORY' });

    expect(res.status).toBe(200);
    expect(res.headers['x-ai-engine']).toBe('gemini-3.5-flash-lite');
    expect(res.body).toEqual({
      storyPoints: 5,
      confidence: 0.9,
      reasoning: 'OAuth estándar',
      complexityFactors: ['OAuth2'],
      acceptanceCriteriaGherkin: 'Feature: Login\n  Scenario: ok',
    });
  });

  it('falls back to the offline criteria when Gemini returns no Gherkin text at all', async () => {
    const service = liveServiceAnswering(
      { storyPoints: 3, confidence: 0.8, reasoning: 'r', complexityFactors: [] },
      { title: 'Login', scenariosCount: 2 },
    );
    const { app } = createServer(service);

    const res = await request(app).post('/agent/improve-story').send({ title: 'Login con Google' });

    expect(res.status).toBe(200);
    expect(typeof res.body.acceptanceCriteriaGherkin).toBe('string');
    expect(res.body.acceptanceCriteriaGherkin).toContain('Scenario');
    expect((console.error as jest.Mock).mock.calls.some(([line]) => String(line).includes('acceptanceCriteriaGherkin'))).toBe(true);
  });

  it('falls back to the offline estimate when Gemini omits storyPoints', async () => {
    const service = liveServiceAnswering(
      { confidence: 0.8, reasoning: 'sin puntos' },
      { acceptanceCriteriaGherkin: 'Feature: X\n  Scenario: A', scenariosCount: 1 },
    );
    const { app } = createServer(service);

    const res = await request(app).post('/agent/improve-story').send({ title: 'Login con Google' });

    expect(res.status).toBe(200);
    expect([1, 2, 3, 5, 8, 13]).toContain(res.body.storyPoints);
    expect(res.body.acceptanceCriteriaGherkin).toBe('Feature: X\n  Scenario: A');
  });

  it('rejects a request without title with 422', async () => {
    const { app } = createServer(new GeminiService({ forceOffline: true }));
    const res = await request(app).post('/agent/improve-story').send({ description: 'x' });
    expect(res.status).toBe(422);
  });
});
