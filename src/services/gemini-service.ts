/**
 * Gemini AI Service with Zero-Crash Fallback Architecture
 * Connects to Google Gemini 2.0 Flash SDK with seamless failover
 * to the deterministic offline heuristic rule engine.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
  AIServiceResult,
} from '../types';
import {
  epicDecompositionResponseSchema,
  sprintPlanningResponseSchema,
  metricsDiagnosisResponseSchema,
} from '../schemas/gemini-schemas';
import {
  SYSTEM_SCRUM_MASTER_INSTRUCTION,
  buildDecomposeEpicPrompt,
  buildPlanSprintPrompt,
  buildDiagnoseMetricsPrompt,
  buildEstimatePrompt,
  buildGherkinPrompt,
} from '../prompts/templates';
import { OfflineFallbackEngine } from './fallback-engine';

export interface GeminiServiceConfig {
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
  forceOffline?: boolean;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly modelName: string;
  private readonly timeoutMs: number;
  private readonly forceOffline: boolean;

  constructor(config: GeminiServiceConfig = {}) {
    this.modelName = config.modelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.timeoutMs = config.timeoutMs ?? parseInt(process.env.GEMINI_TIMEOUT_MS || '5000', 10);
    this.forceOffline =
      config.forceOffline ??
      (process.env.FORCE_OFFLINE === 'true' || process.env.MOCK_MODE === 'true');

    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && !this.forceOffline) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey.trim());
      } catch (err) {
        console.warn(`[GeminiService] Failed to initialize SDK: ${err}. Falling back to offline engine.`);
        this.genAI = null;
      }
    }
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
    apiAction: () => Promise<T>,
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

    // 2. Race live call against timeout guard
    try {
      let timer: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${this.timeoutMs}ms`)), this.timeoutMs);
      });

      const apiResult = await Promise.race([
        apiAction().finally(() => {
          if (timer) clearTimeout(timer);
        }),
        timeoutPromise,
      ]);

      return {
        data: apiResult,
        source: 'gemini-2.0-flash',
        executionTimeMs: Date.now() - startTime,
        model: this.modelName,
      };
    } catch (error: any) {
      console.warn(
        `[GeminiService] Live API failed for "${operationName}" (${error?.message || error}). Failing over to offline rule engine.`
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
   * Feature 26 & 27: Decompose Epic
   */
  public async decomposeEpic(request: DecomposeEpicRequest): Promise<AIServiceResult<DecomposeEpicResponse>> {
    return this.safeExecute<DecomposeEpicResponse>(
      'decomposeEpic',
      async () => {
        if (!this.genAI) throw new Error('Gemini SDK not initialized');

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: epicDecompositionResponseSchema,
            temperature: 0.2,
          },
        });

        const prompt = buildDecomposeEpicPrompt(
          request.epicTitle,
          request.epicDescription,
          request.projectKey,
          request.targetSprintCount
        );

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        return this.parseJSONSafely<DecomposeEpicResponse>(text);
      },
      () => OfflineFallbackEngine.decomposeEpic(request)
    );
  }

  /**
   * Feature 26 & 27: Plan Sprint
   */
  public async planSprint(request: PlanSprintRequest): Promise<AIServiceResult<PlanSprintResponse>> {
    return this.safeExecute<PlanSprintResponse>(
      'planSprint',
      async () => {
        if (!this.genAI) throw new Error('Gemini SDK not initialized');

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: sprintPlanningResponseSchema,
            temperature: 0.1,
          },
        });

        const prompt = buildPlanSprintPrompt(
          request.sprintGoal,
          request.teamCapacityStoryPoints,
          request.candidateIssues,
          request.velocityHistory
        );

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        return this.parseJSONSafely<PlanSprintResponse>(text);
      },
      () => OfflineFallbackEngine.planSprint(request)
    );
  }

  /**
   * Feature 26 & 27: Diagnose Metrics
   */
  public async diagnoseMetrics(request: DiagnoseMetricsRequest): Promise<AIServiceResult<DiagnoseMetricsResponse>> {
    return this.safeExecute<DiagnoseMetricsResponse>(
      'diagnoseMetrics',
      async () => {
        if (!this.genAI) throw new Error('Gemini SDK not initialized');

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: metricsDiagnosisResponseSchema,
            temperature: 0.2,
          },
        });

        const prompt = buildDiagnoseMetricsPrompt(
          request.sprintId,
          request.sprintName,
          request.burndownData,
          request.blockedIssuesCount,
          request.velocityTrend,
          request.alerts
        );

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        return this.parseJSONSafely<DiagnoseMetricsResponse>(text);
      },
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
      async () => {
        if (!this.genAI) throw new Error('Gemini SDK not initialized');

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const prompt = buildEstimatePrompt(request.title, request.description, request.type);
        const response = await model.generateContent(prompt);
        return this.parseJSONSafely<EstimateStoryPointsResponse>(response.response.text());
      },
      () => OfflineFallbackEngine.estimateStoryPointsFull(request)
    );
  }

  /**
   * Feature 28: Generate Acceptance Criteria
   */
  public async generateAcceptanceCriteria(request: GenerateAcceptanceCriteriaRequest): Promise<AIServiceResult<GenerateAcceptanceCriteriaResponse>> {
    return this.safeExecute<GenerateAcceptanceCriteriaResponse>(
      'generateAcceptanceCriteria',
      async () => {
        if (!this.genAI) throw new Error('Gemini SDK not initialized');

        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: SYSTEM_SCRUM_MASTER_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const prompt = buildGherkinPrompt(request.title, request.description, request.userRole);
        const response = await model.generateContent(prompt);
        return this.parseJSONSafely<GenerateAcceptanceCriteriaResponse>(response.response.text());
      },
      () => OfflineFallbackEngine.generateAcceptanceCriteriaFull(request)
    );
  }
}
