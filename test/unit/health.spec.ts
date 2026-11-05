import request from 'supertest';
import { createServer } from '../../src/server';
import { GeminiService } from '../../src/services/gemini-service';

describe('GET /healthz Controller', () => {
  it('returns HTTP 200 with ok status and mock mode when offline', async () => {
    const aiService = new GeminiService({ forceOffline: true });
    const { app } = createServer(aiService);

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.model).toBe('gemini-2.0-flash');
    expect(res.body.mode).toBe('mock');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns HTTP 200 with live mode when configured with API key', async () => {
    const aiService = new GeminiService({ apiKey: 'fake-live-key' });
    const { app } = createServer(aiService);

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('live');
  });
});
