/**
 * Normalizers for live Gemini answers whose shape is not fully guaranteed.
 *
 * They map known alternative field names to the agent's contract and throw when a mandatory value
 * is missing, so GeminiService.safeExecute logs the reason and falls back to the offline engine
 * instead of returning an incomplete object to the BFF.
 */
import { EstimateStoryPointsResponse, GenerateAcceptanceCriteriaResponse } from '../types';

export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13] as const;

/** Closest Fibonacci value (ties go to the larger one, the safer estimate); clamps to 1..13. */
export function toNearestFibonacci(value: number): number {
  if (!Number.isFinite(value) || value <= 1) return 1;
  let best: number = FIBONACCI_POINTS[0];
  for (const candidate of FIBONACCI_POINTS) {
    if (Math.abs(candidate - value) <= Math.abs(best - value)) best = candidate;
  }
  return best;
}

const asRecord = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

const firstString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
};

export function normalizeEstimate(raw: unknown): EstimateStoryPointsResponse {
  const record = asRecord(raw);
  const pointsValue = record.storyPoints ?? record.story_points ?? record.points ?? record.estimate;
  const points = typeof pointsValue === 'string' ? Number(pointsValue) : pointsValue;
  if (typeof points !== 'number' || !Number.isFinite(points)) {
    throw new Error('Gemini devolvió una estimación sin storyPoints numérico');
  }
  const confidenceValue = Number(record.confidence);
  return {
    storyPoints: toNearestFibonacci(points),
    confidence: Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : 0.5,
    reasoning: firstString(record, ['reasoning', 'rationale', 'explanation']) ?? '',
    complexityFactors: Array.isArray(record.complexityFactors)
      ? record.complexityFactors.filter((factor): factor is string => typeof factor === 'string')
      : [],
  };
}

const GHERKIN_KEYS = ['acceptanceCriteriaGherkin', 'gherkinText', 'gherkin', 'acceptanceCriteria', 'criteria', 'text'];

export function normalizeAcceptanceCriteria(raw: unknown): GenerateAcceptanceCriteriaResponse {
  const gherkin = typeof raw === 'string' && raw.trim() ? raw : firstString(asRecord(raw), GHERKIN_KEYS);
  if (!gherkin) {
    throw new Error('Gemini devolvió criterios sin el texto Gherkin (acceptanceCriteriaGherkin)');
  }
  const declared = Number(asRecord(raw).scenariosCount);
  const counted = (gherkin.match(/^\s*Scenario( Outline)?:/gim) || []).length;
  return {
    acceptanceCriteriaGherkin: gherkin.trim(),
    scenariosCount: Number.isInteger(declared) && declared > 0 ? declared : Math.max(counted, 1),
  };
}
