import request from 'supertest';
import { createServer } from '../../src/server';
import { GeminiService } from '../../src/services/gemini-service';
import { TEST_FIXTURES } from '../mocks/fixtures';

describe('POST /agent/decompose-epic', () => {
  it('decomposes an epic and returns structured user stories with Gherkin criteria (T1-F27-01)', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    const { app } = createServer(aiService);

    const res = await request(app)
      .post('/agent/decompose-epic')
      .send({
        epicTitle: 'User Authentication & Multi-Tenancy',
        epicDescription: 'Support OAuth2, JWT verification, and organization tenant isolation',
        projectKey: 'AUTH',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['x-ai-engine']).toBe('offline-heuristic');
    expect(res.body.epicTitle).toBe('User Authentication & Multi-Tenancy');
    expect(res.body.stories).toBeDefined();
    expect(res.body.stories.length).toBeGreaterThanOrEqual(3);

    for (const story of res.body.stories) {
      expect(story.title).toBeDefined();
      expect(story.estimatedStoryPoints).toBeGreaterThan(0);
      expect(story.acceptanceCriteriaGherkin).toContain('Scenario:');
      expect(story.acceptanceCriteriaGherkin).toContain('Given');
      expect(story.acceptanceCriteriaGherkin).toContain('When');
      expect(story.acceptanceCriteriaGherkin).toContain('Then');
    }
  });

  it('sets x-ai-engine to the live model name when Gemini responds', async () => {
    const aiService = new GeminiService({ apiKey: 'fake-api-key' });

    const liveResponse = {
      epicTitle: 'Live Epic',
      stories: [
        {
          title: 'Live Story',
          description: 'Desc',
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: 'Scenario: Live\nGiven X\nWhen Y\nThen Z',
        },
      ],
    };
    (aiService as any).genAI = {
      models: {
        generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify(liveResponse) }),
      },
    };

    const { app } = createServer(aiService);
    const res = await request(app).post('/agent/decompose-epic').send({ epicTitle: 'Live Epic' });

    expect(res.status).toBe(200);
    expect(res.headers['x-ai-engine']).toBe('gemini-3.5-flash-lite');
    expect(res.body.stories[0].title).toBe('Live Story');
  });

  it('handles internal unexpected exceptions with HTTP 500', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    jest.spyOn(aiService, 'decomposeEpic').mockRejectedValueOnce(new Error('Fatal decomposition bug'));

    const { app } = createServer(aiService);
    const res = await request(app).post('/agent/decompose-epic').send({ epicTitle: 'Crash Epic' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Fatal decomposition bug');
  });

  describe('POST /agent/breakdown-task', () => {
    it('segments prospective task into complementary subtasks', async () => {
      const aiService = new GeminiService({ forceOffline: true });
      const { app } = createServer(aiService);

      const res = await request(app)
        .post('/agent/breakdown-task')
        .send({ title: 'crear la base de la pagina web' });

      expect(res.status).toBe(200);
      expect(res.body.parentTitle).toBe('crear la base de la pagina web');
      expect(res.body.subtasks.length).toBeGreaterThanOrEqual(3);
      expect(res.body.subtasks[0].title).toBeDefined();
    });

    it('returns 422 if title is missing', async () => {
      const aiService = new GeminiService({ forceOffline: true });
      const { app } = createServer(aiService);

      const res = await request(app)
        .post('/agent/breakdown-task')
        .send({ description: 'Sin titulo' });

      expect(res.status).toBe(422);
    });
  });
});
