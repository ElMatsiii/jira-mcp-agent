import {
  normalizeAcceptanceCriteria,
  normalizeEstimate,
  toNearestFibonacci,
} from '../../src/utils/response-normalizers';
import { buildEstimatePrompt, buildGherkinPrompt } from '../../src/prompts/templates';

describe('toNearestFibonacci', () => {
  it.each([
    [1, 1], [2, 2], [3, 3], [4, 5], [5, 5], [6, 5], [7, 8], [10, 8], [11, 13], [13, 13], [21, 13],
    [0, 1], [-3, 1], [2.4, 2], [Number.NaN, 1],
  ])('maps %p to %p', (value, expected) => {
    expect(toNearestFibonacci(value)).toBe(expected);
  });
});

describe('normalizeEstimate', () => {
  it('keeps a well-formed estimate', () => {
    expect(normalizeEstimate({ storyPoints: 5, confidence: 0.9, reasoning: 'ok', complexityFactors: ['OAuth'] }))
      .toEqual({ storyPoints: 5, confidence: 0.9, reasoning: 'ok', complexityFactors: ['OAuth'] });
  });

  it('accepts alternative names, numeric strings and clamps values', () => {
    expect(normalizeEstimate({ points: '6', confidence: 3, rationale: 'r', complexityFactors: ['a', 1, null] }))
      .toEqual({ storyPoints: 5, confidence: 1, reasoning: 'r', complexityFactors: ['a'] });
    expect(normalizeEstimate({ story_points: 4 })).toEqual({ storyPoints: 5, confidence: 0.5, reasoning: '', complexityFactors: [] });
  });

  it('throws when there are no story points', () => {
    expect(() => normalizeEstimate({ confidence: 0.9 })).toThrow('sin storyPoints');
    expect(() => normalizeEstimate({ storyPoints: 'muchos' })).toThrow('sin storyPoints');
    expect(() => normalizeEstimate(null)).toThrow('sin storyPoints');
  });
});

describe('normalizeAcceptanceCriteria', () => {
  const gherkin = 'Feature: Login\n  Scenario: ok\n    Given x\n  Scenario: error\n    Given y';

  it('keeps the contract field', () => {
    expect(normalizeAcceptanceCriteria({ acceptanceCriteriaGherkin: gherkin, scenariosCount: 2 }))
      .toEqual({ acceptanceCriteriaGherkin: gherkin, scenariosCount: 2 });
  });

  it('maps gherkinText (what live Gemini returned) and other aliases', () => {
    expect(normalizeAcceptanceCriteria({ title: 'Login', gherkinText: gherkin, scenariosCount: 2 }).acceptanceCriteriaGherkin).toBe(gherkin);
    expect(normalizeAcceptanceCriteria({ gherkin }).acceptanceCriteriaGherkin).toBe(gherkin);
    expect(normalizeAcceptanceCriteria(gherkin).acceptanceCriteriaGherkin).toBe(gherkin);
  });

  it('counts scenarios when the count is missing or invalid', () => {
    expect(normalizeAcceptanceCriteria({ gherkinText: gherkin }).scenariosCount).toBe(2);
    expect(normalizeAcceptanceCriteria({ gherkinText: 'Feature: X', scenariosCount: 0 }).scenariosCount).toBe(1);
  });

  it('throws when there is no Gherkin text', () => {
    expect(() => normalizeAcceptanceCriteria({ title: 'Login', scenariosCount: 2 })).toThrow('acceptanceCriteriaGherkin');
    expect(() => normalizeAcceptanceCriteria({ acceptanceCriteriaGherkin: '   ' })).toThrow('acceptanceCriteriaGherkin');
  });
});

describe('improve-story prompts', () => {
  it('name the exact response fields', () => {
    expect(buildEstimatePrompt('Login')).toContain('storyPoints (integer, one of 1, 2, 3, 5, 8, 13)');
    expect(buildGherkinPrompt('Login')).toContain('acceptanceCriteriaGherkin (string');
    expect(buildGherkinPrompt('Login')).toContain('scenariosCount (integer');
  });
});
