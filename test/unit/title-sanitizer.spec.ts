import { stripProjectKeyPrefix } from '../../src/utils/title-sanitizer';
import { GeminiService } from '../../src/services/gemini-service';
import { OfflineFallbackEngine } from '../../src/services/fallback-engine';
import { buildBreakdownTaskPrompt, buildDecomposeEpicPrompt } from '../../src/prompts/templates';
import { createMockGenAIClient } from '../mocks/gemini.mock';

describe('stripProjectKeyPrefix', () => {
  it.each([
    ['[DEMO] Integrar pasarela de pagos', 'Integrar pasarela de pagos'],
    ['[DEMO-1] Integrar pasarela de pagos', 'Integrar pasarela de pagos'],
    ['[ DEMO-12 ] Integrar pasarela', 'Integrar pasarela'],
    ['DEMO-1: Integrar pasarela de pagos', 'Integrar pasarela de pagos'],
    ['DEMO: Integrar pasarela de pagos', 'Integrar pasarela de pagos'],
    ['DEMO - Integrar pasarela', 'Integrar pasarela'],
    ['[DEMO]: Integrar pasarela', 'Integrar pasarela'],
    ['[demo] Integrar pasarela', 'Integrar pasarela'],
    ['[DEMO] DEMO-3: Integrar pasarela', 'Integrar pasarela'],
    ['  [DEMO]   Integrar pasarela  ', 'Integrar pasarela'],
  ])('strips the key prefix from "%s"', (title, expected) => {
    expect(stripProjectKeyPrefix(title, 'DEMO')).toBe(expected);
  });

  it.each([
    '[WIP] Integrar pasarela',
    'API: definir contrato de pagos',
    '[API-2] Definir contrato',
    'DEMOS: preparar presentación',
    '[DEMO2] Otra clave parecida',
    'DEMO-1 Integrar pasarela',
    'Integrar DEMO: dentro del título',
  ])('keeps "%s" untouched', (title) => {
    expect(stripProjectKeyPrefix(title, 'DEMO')).toBe(title);
  });

  it('escapes regex characters in the key and ignores empty keys', () => {
    expect(stripProjectKeyPrefix('[A.B] Título', 'A.B')).toBe('Título');
    expect(stripProjectKeyPrefix('[AXB] Título', 'A.B')).toBe('[AXB] Título');
    expect(stripProjectKeyPrefix('[DEMO] Título', '')).toBe('[DEMO] Título');
    expect(stripProjectKeyPrefix('[DEMO] Título', undefined)).toBe('[DEMO] Título');
  });

  it('never returns an empty title', () => {
    expect(stripProjectKeyPrefix('[DEMO]', 'DEMO')).toBe('[DEMO]');
  });
});

describe('project key prefix in generated titles', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('no longer asks Gemini to prefix titles with the project key', () => {
    const epicPrompt = buildDecomposeEpicPrompt('Pagos', '', 'DEMO');
    expect(epicPrompt).not.toContain('for traceability');
    expect(epicPrompt).not.toMatch(/^\d+\. Prefix story titles/m);
    expect(epicPrompt).toContain('Do NOT prefix story titles with the project key');
    expect(buildBreakdownTaskPrompt('Login', '', 'DEMO')).toContain('without the project key');
  });

  it('removes key prefixes that Gemini adds anyway in decomposeEpic', async () => {
    const service = new GeminiService({ apiKey: 'AQ.fake' });
    (service as any).genAI = createMockGenAIClient({
      epicTitle: 'Pagos',
      stories: [
        { title: '[DEMO] Integrar pasarela', priority: 'CRITICAL' },
        { title: 'DEMO-2: Validar tarjeta', priority: 'HIGH' },
        { title: '[WIP] Reembolsos', priority: 'LOW' },
      ],
    });

    const res = await service.decomposeEpic({ epicTitle: 'Pagos', projectKey: 'DEMO' });

    expect(res.data.stories.map((s) => s.title)).toEqual(['Integrar pasarela', 'Validar tarjeta', '[WIP] Reembolsos']);
    expect(res.data.stories.map((s) => s.priority)).toEqual(['CRITICAL', 'HIGH', 'LOW']);
  });

  it('removes key prefixes in breakdownTask subtasks', async () => {
    const service = new GeminiService({ apiKey: 'AQ.fake' });
    (service as any).genAI = createMockGenAIClient({
      parentTitle: 'Login',
      subtasks: [{ title: '[DEMO-7] Crear endpoint' }, { title: 'API: documentar' }],
    });

    const res = await service.breakdownTask({ title: 'Login', projectKey: 'DEMO' });

    expect(res.data.subtasks.map((s) => s.title)).toEqual(['Crear endpoint', 'API: documentar']);
  });

  it('uses the default JIRA key when the request has none', async () => {
    const service = new GeminiService({ apiKey: 'AQ.fake' });
    (service as any).genAI = createMockGenAIClient({ epicTitle: 'X', stories: [{ title: '[JIRA] Algo' }] });

    const res = await service.decomposeEpic({ epicTitle: 'X' });

    expect(res.data.stories[0].title).toBe('Algo');
  });

  it('fallback engine titles carry no project key in any epic template', () => {
    for (const epicTitle of ['Login con JWT y roles', 'Kanban de incidencias', 'Kafka streaming de eventos', 'Facturación']) {
      const res = OfflineFallbackEngine.decomposeEpic({ epicTitle, projectKey: 'DEMO' });
      for (const story of res.stories) expect(story.title).not.toContain('DEMO');
    }
  });

  it('keeps fallback results key-free through the service in mock mode', async () => {
    const service = new GeminiService({ forceOffline: true });
    const res = await service.decomposeEpic({ epicTitle: 'Facturación', projectKey: 'DEMO' });
    expect(res.source).toBe('offline-heuristic');
    expect(res.data.stories.every((s) => !s.title.includes('DEMO'))).toBe(true);
  });
});
