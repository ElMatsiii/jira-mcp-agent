import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_TIMEOUT_MS,
  GeminiService,
  GeminiTimeoutError,
  extractHttpStatus,
  hintForGeminiFailure,
} from '../../src/services/gemini-service';
import { createServer as createNetServer } from 'net';
import { startServer } from '../../src/server';

/** startServer treats port 0 as "use the default 3000", so pick a free port explicitly. */
const freePort = () => new Promise<number>((resolve, reject) => {
  const probe = createNetServer();
  probe.once('error', reject);
  probe.listen(0, () => {
    const { port } = probe.address() as { port: number };
    probe.close(() => resolve(port));
  });
});

const ENV_KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_TIMEOUT_MS', 'FORCE_OFFLINE', 'MOCK_MODE'] as const;

describe('GeminiService diagnostics', () => {
  const savedEnv: Record<string, string | undefined> = {};
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    jest.restoreAllMocks();
  });

  describe('configuration defaults', () => {
    it('uses a current model and a 10 s timeout by default', () => {
      const service = new GeminiService({ apiKey: 'fake-key' });
      expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.5-flash-lite');
      expect(service.getModelName()).toBe(DEFAULT_GEMINI_MODEL);
      expect(service.getTimeoutMs()).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
      expect(DEFAULT_GEMINI_TIMEOUT_MS).toBeLessThan(15000);
    });

    it('reads GEMINI_MODEL and GEMINI_TIMEOUT_MS from the environment', () => {
      process.env.GEMINI_MODEL = ' gemini-3.5-flash ';
      process.env.GEMINI_TIMEOUT_MS = '12000';
      const service = new GeminiService({ apiKey: 'fake-key' });
      expect(service.getModelName()).toBe('gemini-3.5-flash');
      expect(service.getTimeoutMs()).toBe(12000);
    });

    it('ignores an invalid GEMINI_TIMEOUT_MS', () => {
      process.env.GEMINI_TIMEOUT_MS = 'abc';
      expect(new GeminiService({ apiKey: 'k' }).getTimeoutMs()).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
      expect(new GeminiService({ apiKey: 'k', timeoutMs: -5 }).getTimeoutMs()).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
    });
  });

  describe('mock mode reason', () => {
    it('explains that the API key is missing or empty', () => {
      process.env.GEMINI_API_KEY = '   ';
      const service = new GeminiService();
      expect(service.isLiveMode()).toBe(false);
      expect(service.getOfflineReason()).toBe('GEMINI_API_KEY no está definida o está vacía');
      expect(service.describeMode()).toBe('mock (motor de respaldo offline: GEMINI_API_KEY no está definida o está vacía)');
    });

    it('explains when FORCE_OFFLINE or MOCK_MODE forces the fallback', () => {
      process.env.GEMINI_API_KEY = 'AQ.fake-key';
      process.env.MOCK_MODE = 'true';
      const service = new GeminiService();
      expect(service.getOfflineReason()).toBe('FORCE_OFFLINE o MOCK_MODE están activos');
    });

    it('describes live mode without exposing the key', () => {
      const service = new GeminiService({ apiKey: 'AQ.super-secret-value' });
      expect(service.getOfflineReason()).toBeNull();
      expect(service.describeMode()).toBe(`live (modelo ${DEFAULT_GEMINI_MODEL}, timeout ${DEFAULT_GEMINI_TIMEOUT_MS} ms)`);
      expect(service.describeMode()).not.toContain('super-secret');
    });

    it('logs the mock reason as a warning at startup', async () => {
      const { httpServer } = await startServer(await freePort(), new GeminiService({ forceOffline: true }));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      expect(warnSpy).toHaveBeenCalledWith(
        '[Jira-MCP-Agent] Active mode: mock (motor de respaldo offline: FORCE_OFFLINE o MOCK_MODE están activos)',
      );
    });

    it('logs live mode with model and timeout at startup', async () => {
      const { httpServer } = await startServer(await freePort(), new GeminiService({ apiKey: 'fake-key', modelName: 'gemini-3.5-flash' }));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      expect(logSpy).toHaveBeenCalledWith('[Jira-MCP-Agent] Active mode: live (modelo gemini-3.5-flash, timeout 10000 ms)');
    });
  });

  describe('extractHttpStatus', () => {
    it.each([
      [{ status: 404, message: 'x' }, 404],
      [{ code: 403, message: 'x' }, 403],
      [new Error('[GoogleGenerativeAI Error]: Error fetching from https://...: [404 Not Found] models/gemini-2.0-flash is not found'), 404],
      [new Error('got status: 429 from upstream'), 429],
      [{ code: 'ECONNRESET', message: 'socket hang up' }, null],
      [new Error('plain failure'), null],
      [null, null],
    ])('extracts the status from %p', (error, expected) => {
      expect(extractHttpStatus(error)).toBe(expected);
    });
  });

  describe('hintForGeminiFailure', () => {
    it('gives a hint per failure type', () => {
      expect(hintForGeminiFailure(404, false, 'gemini-2.0-flash')).toContain('GEMINI_MODEL');
      expect(hintForGeminiFailure(404, false, 'gemini-2.0-flash')).toContain('gemini-2.0-flash');
      expect(hintForGeminiFailure(401, false, 'm')).toContain('GEMINI_API_KEY');
      expect(hintForGeminiFailure(403, false, 'm')).toContain('GEMINI_API_KEY');
      expect(hintForGeminiFailure(429, false, 'm')).toContain('cuota');
      expect(hintForGeminiFailure(503, false, 'm')).toContain('alta demanda');
      expect(hintForGeminiFailure(null, true, 'm')).toContain('GEMINI_TIMEOUT_MS');
      expect(hintForGeminiFailure(400, false, 'm')).toBeNull();
      expect(hintForGeminiFailure(null, false, 'm')).toBeNull();
    });
  });

  describe('safeExecute logging', () => {
    it('reports the real model as source on success', async () => {
      const service = new GeminiService({ apiKey: 'fake-key', modelName: 'gemini-3.5-flash' });
      const result = await service.safeExecute('op', async () => 'live', () => 'fallback');
      expect(result).toMatchObject({ data: 'live', source: 'gemini-3.5-flash', model: 'gemini-3.5-flash' });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('logs HTTP status, model, elapsed time and a hint when Gemini returns 404', async () => {
      const service = new GeminiService({ apiKey: 'fake-key', modelName: 'gemini-2.0-flash' });
      const failure = Object.assign(new Error('[404 Not Found] models/gemini-2.0-flash is no longer available'), { status: 404 });
      const result = await service.safeExecute('decomposeEpic', async () => { throw failure; }, () => 'fallback');

      expect(result.source).toBe('offline-heuristic');
      expect(result.data).toBe('fallback');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const line: string = errorSpy.mock.calls[0][0];
      expect(line).toContain('"decomposeEpic"');
      expect(line).toContain('modelo=gemini-2.0-flash');
      expect(line).toContain('http=404');
      expect(line).toMatch(/tiempo=\d+ms/);
      expect(line).toContain('timeout=false');
      expect(line).toContain('actualiza GEMINI_MODEL');
      expect(line).not.toContain('fake-key');
    });

    it('logs a 401/403 hint about the API key', async () => {
      const service = new GeminiService({ apiKey: 'fake-key' });
      await service.safeExecute('op', async () => { throw Object.assign(new Error('API key not valid'), { status: 403 }); }, () => 0);
      expect(errorSpy.mock.calls[0][0]).toContain('http=403');
      expect(errorSpy.mock.calls[0][0]).toContain('revisa GEMINI_API_KEY');
    });

    it('marks timeouts and falls back', async () => {
      const service = new GeminiService({ apiKey: 'fake-key', timeoutMs: 20 });
      const result = await service.safeExecute('slow', () => new Promise<string>(() => undefined), () => 'fallback');

      expect(result.data).toBe('fallback');
      const line: string = errorSpy.mock.calls[0][0];
      expect(line).toContain('timeout=true');
      expect(line).toContain('http=n/a');
      expect(line).toContain('Timeout after 20ms');
      expect(line).toContain('GEMINI_TIMEOUT_MS');
    });

    it('describes failures as structured data', () => {
      const service = new GeminiService({ apiKey: 'fake-key' });
      const details = service.describeFailure('op', new GeminiTimeoutError(10), 12);
      expect(details).toEqual({
        operation: 'op', model: DEFAULT_GEMINI_MODEL, elapsedMs: 12, timedOut: true, httpStatus: null,
        message: 'Timeout after 10ms', hint: expect.stringContaining('GEMINI_TIMEOUT_MS'),
      });
      expect(service.describeFailure('op', 'raw\nmulti   line', 1).message).toBe('raw multi line');
    });
  });
});
