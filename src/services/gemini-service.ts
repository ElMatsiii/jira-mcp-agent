/**
 * Gemini AI Service with Zero-Crash Fallback Architecture
 * Connects to the Google Gemini API (model from GEMINI_MODEL) with seamless failover
 * to the deterministic offline heuristic rule engine.
 */

import { GoogleGenAI, Schema } from '@google/genai';
import {
  DecomposeEpicRequest,
  DecomposeEpicResponse,
  PlanSprintRequest,
  PlanSprintResponse,
  DiagnoseMetricsRequest,
  DiagnoseMetricsResponse,
  SuggestAssigneesRequest,
  SuggestAssigneesResponse,
  EstimateStoryPointsRequest,
  EstimateStoryPointsResponse,
  GenerateAcceptanceCriteriaRequest,
  GenerateAcceptanceCriteriaResponse,
  BreakdownTaskRequest,
  BreakdownTaskResponse,
  AIServiceResult,
} from '../types';
import {
  epicDecompositionResponseSchema,
  sprintPlanningResponseSchema,
  metricsDiagnosisResponseSchema,
  taskBreakdownResponseSchema,
} from '../schemas/gemini-schemas';
import {
  SYSTEM_SCRUM_MASTER_INSTRUCTION,
  buildDecomposeEpicPrompt,
  buildPlanSprintPrompt,
  buildDiagnoseMetricsPrompt,
  buildEstimatePrompt,
  buildGherkinPrompt,
  buildBreakdownTaskPrompt,
} from '../prompts/templates';
import { OfflineFallbackEngine } from './fallback-engine';

export interface GeminiServiceConfig {
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
  forceOffline?: boolean;
}

/**
 * Default model. gemini-2.0-flash and gemini-2.5-flash return 404 for this project's keys;
 * gemini-3.5-flash-lite answered an epic decomposition with valid JSON in ~3 s (3.5-flash took 20-30 s).
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
/** Must stay below the BFF's 15 s HTTP timeout towards this agent. */
export const DEFAULT_GEMINI_TIMEOUT_MS = 10000;

export class GeminiTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Timeout after ${timeoutMs}ms`);
    this.name = 'GeminiTimeoutError';
  }
}

export interface GeminiFailureDetails {
  operation: string;
  model: string;
  elapsedMs: number;
  timedOut: boolean;
  httpStatus: number | null;
  message: string;
  hint: string | null;
}

/**
 * Extracts the HTTP status from SDK errors: `ApiError.status` from @google/genai, a `code` field,
 * or a status embedded in the message (e.g. "[404 Not Found]" or `"code":404`).
 */
export function extractHttpStatus(error: unknown): number | null {
  const candidate = error as { status?: unknown; code?: unknown; message?: unknown } | null;
  for (const value of [candidate?.status, candidate?.code]) {
    if (typeof value === 'number' && value >= 100 && value <= 599) return value;
  }
  const message = typeof candidate?.message === 'string' ? candidate.message : String(error ?? '');
  const match =
    message.match(/\[(\d{3})[^\]]*\]/) ||
    message.match(/\b(?:status|HTTP)\s*:?\s*(\d{3})\b/i) ||
    message.match(/"code"\s*:\s*(\d{3})\b/);
  return match ? Number(match[1]) : null;
}

export function hintForGeminiFailure(httpStatus: number | null, timedOut: boolean, model: string): string | null {
  if (timedOut) return 'Gemini no respondió a tiempo; sube GEMINI_TIMEOUT_MS o usa un modelo más rápido (por ejemplo, una variante "-lite").';
  if (httpStatus === 404) return `El modelo "${model}" no existe o fue dado de baja; actualiza GEMINI_MODEL a un modelo vigente.`;
  if (httpStatus === 401 || httpStatus === 403) return 'La API rechazó la credencial; revisa GEMINI_API_KEY (clave vigente, sin espacios, proyecto con la Gemini API habilitada).';
  if (httpStatus === 429) return 'Se alcanzó la cuota o el límite de solicitudes de la Gemini API; reintenta más tarde.';
  if (httpStatus !== null && httpStatus >= 500) return 'La Gemini API tuvo un error temporal o alta demanda; reintenta más tarde.';
  return null;
}

export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private readonly modelName: string;
  private readonly timeoutMs: number;
  private readonly forceOffline: boolean;
  private offlineReason: string | null = null;

  constructor(config: GeminiServiceConfig = {}) {
    this.modelName = (config.modelName || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
    const envTimeout = parseInt(process.env.GEMINI_TIMEOUT_MS || '', 10);
    const timeout = config.timeoutMs ?? envTimeout;
    this.timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_GEMINI_TIMEOUT_MS;
    this.forceOffline =
      config.forceOffline ??
      (process.env.FORCE_OFFLINE === 'true' || process.env.MOCK_MODE === 'true');

    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (this.forceOffline) {
      this.offlineReason = 'FORCE_OFFLINE o MOCK_MODE están activos';
    } else if (!apiKey || apiKey.trim().length === 0) {
      this.offlineReason = 'GEMINI_API_KEY no está definida o está vacía';
    } else {
      try {
        // The key is sent as-is (x-goog-api-key); both "AIza..." and the newer "AQ." keys work.
        this.genAI = new GoogleGenAI({ apiKey: apiKey.trim() });
      } catch (err) {
        this.offlineReason = `no se pudo inicializar el SDK de Gemini (${err instanceof Error ? err.message : String(err)})`;
        this.genAI = null;
      }
    }
  }

  /** Why the service is in mock mode, or null when live. Never includes the API key. */
  public getOfflineReason(): string | null {
    return this.isLiveMode() ? null : this.offlineReason;
  }

  public getTimeoutMs(): number {
    return this.timeoutMs;
  }

  /** One-line startup description of the active engine. */
  public describeMode(): string {
    if (this.isLiveMode()) return `live (modelo ${this.modelName}, timeout ${this.timeoutMs} ms)`;
    return `mock (motor de respaldo offline: ${this.offlineReason ?? 'motivo desconocido'})`;
  }

  /**
   * Returns true if live Gemini API integration is active
   */
  public isLiveMode(): boolean {
    return this.genAI !== null && !this.forceOffline;
  }

  public getMode(): 'live' | 'mock' {
    return this.isLiveMode() ? 'live' : 'mock';
  }

  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Resilient execution wrapper:
   * Races live API call against strict timeout guard.
   * Catches ANY error (401, 403, 429, 500, network, JSON parse) and instantly falls back.
   * NEVER throws an unhandled rejection.
   */
  public async safeExecute<T>(
    operationName: string,
    apiAction: (signal: AbortSignal) => Promise<T>,
    fallbackAction: () => T
  ): Promise<AIServiceResult<T>> {
    const startTime = Date.now();

    // 1. If not in live mode, immediately return deterministic heuristic result
    if (!this.isLiveMode()) {
      const fallbackData = fallbackAction();
      return {
        data: fallbackData,
        source: 'offline-heuristic',
        executionTimeMs: Date.now() - startTime,
        model: 'offline-heuristic',
      };
    }

    // 2. Race live call against timeout guard; on timeout also abort the in-flight HTTP request
    const controller = new AbortController();
    try {
      let timer: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new GeminiTimeoutError(this.timeoutMs));
          controller.abort();
        }, this.timeoutMs);
      });

      const apiResult = await Promise.race([
        apiAction(controller.signal).finally(() => {
          if (timer) clearTimeout(timer);
        }),
        timeoutPromise,
      ]);

      return {
        data: apiResult,
        source: this.modelName,
        executionTimeMs: Date.now() - startTime,
        model: this.modelName,
      };
    } catch (error: any) {
      const details = this.describeFailure(operationName, error, Date.now() - startTime);
      console.error(
        `[GeminiService] Falló Gemini en "${details.operation}": modelo=${details.model} ` +
          `http=${details.httpStatus ?? 'n/a'} tiempo=${details.elapsedMs}ms timeout=${details.timedOut} ` +
          `error="${details.message}"${details.hint ? ` pista="${details.hint}"` : ''}. Se usa el motor de respaldo offline.`
      );

      const fallbackData = fallbackAction();
      return {
        data: fallbackData,
        source: 'offline-heuristic',
        executionTimeMs: Date.now() - startTime,
        model: 'offline-heuristic',
      };
    }
  }

  /** Structured, key-free description of a failed live call, used for logging. */
  public describeFailure(operation: string, error: unknown, elapsedMs: number): GeminiFailureDetails {
    const timedOut = error instanceof GeminiTimeoutError;
    const httpStatus = timedOut ? null : extractHttpStatus(error);
    const rawMessage = error instanceof Error ? error.message : String(error);
    return {
      operation,
      model: this.modelName,
      elapsedMs,
      timedOut,
      httpStatus,
      // Single line and bounded, so one failure is one log line.
      message: rawMessage.replace(/\s+/g, ' ').slice(0, 300),
      hint: hintForGeminiFailure(httpStatus, timedOut, this.modelName),
    };
  }

  /**
   * Strips markdown fences if model outputs ```json ... ```
   */
  private parseJSONSafely<T>(rawText: string): T {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(cleaned);
  }

  /**
   * Single entry point to the Gemini API (@google/genai): JSON mode, optional response schema,
   * shared system instruction, and the abort signal from safeExecute's timeout guard.
   */
  private async generateJson<T>(
    prompt: string,
    options: { temperature: number; responseSchema?: Schema },
    signal?: AbortSignal
  ): Promise<T> {
    if (!this.genAI) throw new Error('Gemini SDK not initialized');

    const response = await this.genAI.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
        responseMimeType: 'application/json',
        ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
        temperature: options.temperature,
        ...(signal ? { abortSignal: signal } : {}),
      },
    });

    const text = response.text;
    if (!text) {
      const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? 'desconocido';
      throw new Error(`Gemini devolvió una respuesta vacía (motivo: ${reason})`);
    }
    return this.parseJSONSafely<T>(text);
  }

  /**
   * Feature 26 & 27: Decompose Epic
   */
  public async decomposeEpic(request: DecomposeEpicRequest): Promise<AIServiceResult<DecomposeEpicResponse>> {
    return this.safeExecute<DecomposeEpicResponse>(
      'decomposeEpic',
      (signal) =>
        this.generateJson<DecomposeEpicResponse>(
          buildDecomposeEpicPrompt(request.epicTitle, request.epicDescription, request.projectKey, request.targetSprintCount),
          { temperature: 0.2, responseSchema: epicDecompositionResponseSchema },
          signal
        ),
      () => OfflineFallbackEngine.decomposeEpic(request)
    );
  }

  /**
   * Feature 26 & 27: Plan Sprint
   */
  public async planSprint(request: PlanSprintRequest): Promise<AIServiceResult<PlanSprintResponse>> {
    return this.safeExecute<PlanSprintResponse>(
      'planSprint',
      (signal) =>
        this.generateJson<PlanSprintResponse>(
          buildPlanSprintPrompt(request.sprintGoal, request.teamCapacityStoryPoints, request.candidateIssues, request.velocityHistory),
          { temperature: 0.1, responseSchema: sprintPlanningResponseSchema },
          signal
        ),
      () => OfflineFallbackEngine.planSprint(request)
    );
  }

  /**
   * Feature 26 & 27: Diagnose Metrics
   */
  public async diagnoseMetrics(request: DiagnoseMetricsRequest): Promise<AIServiceResult<DiagnoseMetricsResponse>> {
    return this.safeExecute<DiagnoseMetricsResponse>(
      'diagnoseMetrics',
      (signal) =>
        this.generateJson<DiagnoseMetricsResponse>(
          buildDiagnoseMetricsPrompt(
            request.sprintId,
            request.sprintName,
            request.burndownData,
            request.blockedIssuesCount,
            request.velocityTrend,
            request.alerts
          ),
          { temperature: 0.2, responseSchema: metricsDiagnosisResponseSchema },
          signal
        ),
      () => OfflineFallbackEngine.diagnoseMetrics(request)
    );
  }

  /**
   * Feature 28: Suggest Assignees
   */
  public async suggestAssignees(request: SuggestAssigneesRequest): Promise<AIServiceResult<SuggestAssigneesResponse>> {
    return this.safeExecute<SuggestAssigneesResponse>(
      'suggestAssignees',
      async () => {
        // Fallback provides high accuracy skill match & workload balancing
        return OfflineFallbackEngine.suggestAssignees(request);
      },
      () => OfflineFallbackEngine.suggestAssignees(request)
    );
  }

  /**
   * Feature 28: Estimate Story Points
   */
  public async estimateStoryPoints(request: EstimateStoryPointsRequest): Promise<AIServiceResult<EstimateStoryPointsResponse>> {
    return this.safeExecute<EstimateStoryPointsResponse>(
      'estimateStoryPoints',
      (signal) =>
        this.generateJson<EstimateStoryPointsResponse>(
          buildEstimatePrompt(request.title, request.description, request.type),
          { temperature: 0.1 },
          signal
        ),
      () => OfflineFallbackEngine.estimateStoryPointsFull(request)
    );
  }

  /**
   * Feature 28: Generate Acceptance Criteria
   */
  public async generateAcceptanceCriteria(request: GenerateAcceptanceCriteriaRequest): Promise<AIServiceResult<GenerateAcceptanceCriteriaResponse>> {
    return this.safeExecute<GenerateAcceptanceCriteriaResponse>(
      'generateAcceptanceCriteria',
      (signal) =>
        this.generateJson<GenerateAcceptanceCriteriaResponse>(
          buildGherkinPrompt(request.title, request.description, request.userRole),
          { temperature: 0.2 },
          signal
        ),
      () => OfflineFallbackEngine.generateAcceptanceCriteriaFull(request)
    );
  }

  /**
   * Task Breakdown & Subtask Segmentation
   */
  public async breakdownTask(request: BreakdownTaskRequest): Promise<AIServiceResult<BreakdownTaskResponse>> {
    return this.safeExecute<BreakdownTaskResponse>(
      'breakdownTask',
      (signal) =>
        this.generateJson<BreakdownTaskResponse>(
          buildBreakdownTaskPrompt(request.title, request.description, request.projectKey, request.maxSubtasks),
          { temperature: 0.2, responseSchema: taskBreakdownResponseSchema },
          signal
        ),
      () => OfflineFallbackEngine.breakdownTask(request)
    );
  }
}
