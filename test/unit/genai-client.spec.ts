import { ApiError, GoogleGenAI, Type } from '@google/genai';
import { GeminiService, extractHttpStatus } from '../../src/services/gemini-service';
import { epicDecompositionResponseSchema, taskBreakdownResponseSchema } from '../../src/schemas/gemini-schemas';
import { SYSTEM_SCRUM_MASTER_INSTRUCTION } from '../../src/prompts/templates';
import { createFailingGenAIClient, createMockGenAIClient } from '../mocks/gemini.mock';

const liveService = (opts: { timeoutMs?: number } = {}) =>
  new GeminiService({ apiKey: 'AQ.fake-new-format-key', modelName: 'gemini-3.5-flash-lite', ...opts });

describe('@google/genai integration', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates a GoogleGenAI client for new "AQ." keys and runs in live mode', () => {
    const service = liveService();
    expect(service.isLiveMode()).toBe(true);
    expect((service as any).genAI).toBeInstanceOf(GoogleGenAI);
  });

  it('calls models.generateContent in JSON mode with the response schema and system instruction', async () => {
    const service = liveService();
    const client = createMockGenAIClient({ epicTitle: 'Pagos', stories: [] });
    (service as any).genAI = client;

    const result = await service.decomposeEpic({ epicTitle: 'Pagos', projectKey: 'DEMO' });

    expect(result.source).toBe('gemini-3.5-flash-lite');
    expect(client.models.generateContent).toHaveBeenCalledTimes(1);
    const params = client.models.generateContent.mock.calls[0][0];
    expect(params.model).toBe('gemini-3.5-flash-lite');
    expect(typeof params.contents).toBe('string');
    expect(params.contents).toContain('Pagos');
    expect(params.config).toMatchObject({
      systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: epicDecompositionResponseSchema,
      temperature: 0.2,
    });
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(params.config.abortSignal.aborted).toBe(false);
  });

  it('omits responseSchema for free-form JSON operations', async () => {
    const service = liveService();
    const client = createMockGenAIClient({ storyPoints: 3, confidence: 0.8, reasoning: 'ok', complexityFactors: [] });
    (service as any).genAI = client;

    await service.estimateStoryPoints({ title: 'Login' });

    const { config } = client.models.generateContent.mock.calls[0][0];
    expect(config.responseMimeType).toBe('application/json');
    expect(config).not.toHaveProperty('responseSchema');
    expect(config.temperature).toBe(0.1);
  });

  it('runs breakdownTask live with its schema', async () => {
    const service = liveService();
    const client = createMockGenAIClient({ parentTitle: 'Pagos', subtasks: [{ title: 'API' }] });
    (service as any).genAI = client;

    const result = await service.breakdownTask({ title: 'Pagos' });

    expect(result.source).toBe('gemini-3.5-flash-lite');
    expect(result.data.subtasks[0].title).toBe('API');
    expect(client.models.generateContent.mock.calls[0][0].config.responseSchema).toBe(taskBreakdownResponseSchema);
  });

  it('aborts the in-flight request when the timeout guard fires', async () => {
    const service = liveService({ timeoutMs: 20 });
    let captured: AbortSignal | undefined;
    (service as any).genAI = {
      models: {
        generateContent: jest.fn((params: any) => {
          captured = params.config.abortSignal;
          return new Promise(() => undefined);
        }),
      },
    };

    const result = await service.decomposeEpic({ epicTitle: 'Lento' });

    expect(result.source).toBe('offline-heuristic');
    expect(captured?.aborted).toBe(true);
    expect(errorSpy.mock.calls[0][0]).toContain('timeout=true');
  });

  it('falls back and logs the reason when Gemini returns an empty response', async () => {
    const service = liveService();
    (service as any).genAI = {
      models: {
        generateContent: jest.fn().mockResolvedValue({ text: undefined, candidates: [{ finishReason: 'SAFETY' }] }),
      },
    };

    const result = await service.decomposeEpic({ epicTitle: 'Vacío' });

    expect(result.source).toBe('offline-heuristic');
    expect(errorSpy.mock.calls[0][0]).toContain('respuesta vacía (motivo: SAFETY)');
  });

  it('reads the HTTP status from @google/genai ApiError and hints at GEMINI_MODEL on 404', async () => {
    const service = liveService();
    (service as any).genAI = createFailingGenAIClient(
      new ApiError({ message: 'models/gemini-2.0-flash is no longer available', status: 404 }),
    );

    const result = await service.decomposeEpic({ epicTitle: 'Pagos' });

    expect(result.source).toBe('offline-heuristic');
    const line: string = errorSpy.mock.calls[0][0];
    expect(line).toContain('http=404');
    expect(line).toContain('actualiza GEMINI_MODEL');
    expect(line).not.toContain('AQ.fake');
  });

  it('extracts the status from a JSON error body in the message', () => {
    expect(extractHttpStatus(new Error('got an error: {"error":{"code":403,"status":"PERMISSION_DENIED"}}'))).toBe(403);
  });

  it('builds schemas with the @google/genai Type enum', () => {
    expect(epicDecompositionResponseSchema.type).toBe(Type.OBJECT);
    expect(epicDecompositionResponseSchema.properties?.stories?.type).toBe(Type.ARRAY);
  });
});
