import { selectElapsedBurndown, todayUtc } from '../../src/services/burndown-window';
import { DiagnoseMetricsInputSchema } from '../../src/schemas/zod-schemas';
import { buildDiagnoseMetricsPrompt, SYSTEM_SCRUM_MASTER_INSTRUCTION, SPANISH_OUTPUT_RULE } from '../../src/prompts/templates';
import { GeminiService } from '../../src/services/gemini-service';

const sprint = [
  { day: 0, date: '2026-11-16', idealRemaining: 20, actualRemaining: 20 },
  { day: 1, date: '2026-11-17', idealRemaining: 15, actualRemaining: 12 },
  { day: 2, date: '2026-11-18', idealRemaining: 10, actualRemaining: null },
  { day: 3, date: '2026-11-19', idealRemaining: 5, actualRemaining: 12 },
];

describe('selectElapsedBurndown', () => {
  it('keeps only the days up to asOfDate and reports the current day', () => {
    const window = selectElapsedBurndown(sprint, '2026-11-17');

    expect(window.elapsed.map((p) => p.date)).toEqual(['2026-11-16', '2026-11-17']);
    expect(window.currentDayNumber).toBe(2);
    expect(window.totalDays).toBe(4);
    expect(window.asOfDate).toBe('2026-11-17');
  });

  it('drops days without an actual value (null = has not happened)', () => {
    const window = selectElapsedBurndown(sprint, '2026-11-18');

    expect(window.elapsed.map((p) => p.date)).toEqual(['2026-11-16', '2026-11-17']);
  });

  it('accepts full ISO timestamps as point dates', () => {
    const window = selectElapsedBurndown(
      [{ day: 0, date: '2026-11-16T00:00:00Z', idealRemaining: 5, actualRemaining: 5 }],
      '2026-11-16'
    );

    expect(window.elapsed).toHaveLength(1);
  });

  it('keeps undated points that carry an actual value', () => {
    const window = selectElapsedBurndown([
      { day: 1, idealRemaining: 5, actualRemaining: 4 },
      { day: 2, idealRemaining: 0 },
    ]);

    expect(window.elapsed).toHaveLength(1);
    expect(window.currentDayNumber).toBe(1);
  });

  it('defaults to today (UTC) when asOfDate is missing or malformed', () => {
    expect(selectElapsedBurndown([], 'mañana').asOfDate).toBe(todayUtc());
    expect(selectElapsedBurndown().asOfDate).toBe(todayUtc());
    expect(selectElapsedBurndown().currentDayNumber).toBe(0);
    expect(todayUtc(new Date('2026-11-15T23:30:00Z'))).toBe('2026-11-15');
  });
});

describe('DiagnoseMetricsInputSchema', () => {
  it('accepts null for future days and keeps them unknown instead of 0', () => {
    const parsed = DiagnoseMetricsInputSchema.parse({ sprintId: 's1', burndownData: sprint, asOfDate: '2026-11-17' });

    expect(parsed.burndownData[2].actualRemaining).toBeUndefined();
    expect(parsed.burndownData[1].actualRemaining).toBe(12);
    expect(parsed.asOfDate).toBe('2026-11-17');
  });

  it('rejects an asOfDate that is not YYYY-MM-DD', () => {
    const parsed = DiagnoseMetricsInputSchema.safeParse({ sprintId: 's1', asOfDate: '17/11/2026' });

    expect(parsed.success).toBe(false);
  });
});

describe('Spanish answers and current day in the prompts', () => {
  it('requires Spanish in the system instruction and in the diagnosis prompt', () => {
    expect(SYSTEM_SCRUM_MASTER_INSTRUCTION).toContain('MUST be written in Spanish');
    const prompt = buildDiagnoseMetricsPrompt('s1', 'Sprint 1', [], 0, [], [], {
      asOfDate: '2026-11-17',
      currentDayNumber: 2,
      totalDays: 4,
    });

    expect(prompt).toContain(SPANISH_OUTPUT_RULE);
    expect(prompt).toContain('Today is 2026-11-17: day 2 of 4 of the sprint.');
  });

  it('describes a sprint that has not started and an unknown day', () => {
    expect(
      buildDiagnoseMetricsPrompt('s1', 'Sprint 1', [], 0, undefined, undefined, {
        asOfDate: '2026-11-15',
        currentDayNumber: 0,
        totalDays: 4,
      })
    ).toContain('has not started yet');
    expect(buildDiagnoseMetricsPrompt('s1')).toContain('Current day: unknown.');
  });

  it('sends Gemini only the elapsed days and the current day', async () => {
    const service = new GeminiService({ apiKey: 'test-fake-key' });
    const generateContent = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        healthStatus: 'HEALTHY',
        diagnosis: 'El sprint va bien',
        rootCauses: ['Sin impedimentos'],
        actionableRecommendations: ['Mantener el ritmo'],
      }),
    });
    (service as any).genAI = { models: { generateContent } };

    await service.diagnoseMetrics({ sprintId: 's1', burndownData: sprint, asOfDate: '2026-11-17' });

    const sentPrompt: string = generateContent.mock.calls[0][0].contents;
    expect(sentPrompt).toContain('day 2 of 4');
    expect(sentPrompt).toContain('2026-11-17');
    expect(sentPrompt).not.toContain('2026-11-19');
  });
});
