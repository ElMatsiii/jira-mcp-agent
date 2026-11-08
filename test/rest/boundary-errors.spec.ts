import request from 'supertest';
import { createServer } from '../../src/server';
import { GeminiService } from '../../src/services/gemini-service';

describe('REST Boundary Conditions & Adversarial Edge Cases (Feature 27 Tier 2)', () => {
  let app: any;

  beforeEach(() => {
    const aiService = new GeminiService({ forceOffline: true });
    app = createServer(aiService).app;
  });

  // T2-F27-01: Empty request body returns HTTP 400 Bad Request
  it('T2-F27-01: should return 400 Bad Request when request body is empty object', async () => {
    const res = await request(app)
      .post('/agent/decompose-epic')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot be empty');
  });

  it('T2-F27-01: should return 400 when empty body is sent to plan-sprint', async () => {
    const res = await request(app)
      .post('/agent/plan-sprint')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(400);
  });

  it('T2-F27-01: should return 400 when empty body is sent to diagnose-metrics', async () => {
    const res = await request(app)
      .post('/agent/diagnose-metrics')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(400);
  });

  // Malformed JSON syntax returns HTTP 400
  it('should return 400 when malformed non-JSON payload is posted', async () => {
    const res = await request(app)
      .post('/agent/decompose-epic')
      .set('Content-Type', 'application/json')
      .send('INVALID{JSON:MALFORMED');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid JSON body');
  });

  // T2-F27-02: Missing mandatory field returns HTTP 422 Unprocessable Entity
  it('T2-F27-02 / T2-BVA-06: should return 422 when decomposing epic without mandatory epicTitle', async () => {
    const res = await request(app)
      .post('/agent/decompose-epic')
      .send({
        epicDescription: 'Description provided but title omitted',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('epicTitle');
  });

  it('T2-F27-02: should return 422 when diagnosing metrics without mandatory sprintId', async () => {
    const res = await request(app)
      .post('/agent/diagnose-metrics')
      .send({
        burndownData: [{ day: 1, idealRemaining: 10, actualRemaining: 10 }],
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('sprintId');
  });

  // T2-F27-03: Request payload exceeding 1MB returns HTTP 413 Payload Too Large
  it('T2-F27-03: should return 413 when payload exceeds 1MB limit', async () => {
    const largeDescription = 'x'.repeat(1024 * 1024 + 100); // > 1MB
    const res = await request(app)
      .post('/agent/decompose-epic')
      .send({
        epicTitle: 'Oversized Epic',
        epicDescription: largeDescription,
      });

    expect(res.status).toBe(413);
    expect(res.body.error).toContain('Payload Too Large');
  });

  // T2-F27-04: Non-existent route returns HTTP 404 Not Found
  it('T2-F27-04 / T2-BVA-07: should return 404 for undefined REST endpoints', async () => {
    const res = await request(app).post('/agent/undefined-endpoint-xyz').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Route not found');
  });

  // T2-F27-05: Unicode in epic description handled correctly
  it('T2-F27-05: should preserve Unicode in input and response', async () => {
    const res = await request(app)
      .post('/agent/decompose-epic')
      .send({
        epicTitle: 'Internationalization & Localization [I18N]',
        epicDescription: 'Support 日本語, Español, and Français characters across all platforms',
        projectKey: 'I18N',
      });

    expect(res.status).toBe(200);
    expect(res.body.epicTitle).toBe('Internationalization & Localization [I18N]');
  });

  // SSE Transport endpoints
  it('returns 400 when posting to /messages without active SSE session', async () => {
    const res = await request(app).post('/messages').send({ jsonrpc: '2.0' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No active SSE connection session');
  });
});
