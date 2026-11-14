/**
 * Type definitions for Jira AI MCP Agent
 * Conforms strictly to ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md contracts.
 */

export type StoryType = 'STORY' | 'TASK' | 'BUG' | 'EPIC';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type HealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
export type RiskAssessment =
  | 'OPTIMAL'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'LOW_CAPACITY_RISK'
  | 'MEDIUM_CAPACITY_RISK'
  | 'HIGH_CAPACITY_RISK'
  | 'OVER_CAPACITY';

export interface DecomposedStory {
  title: string;
  description: string;
  type: StoryType;
  priority: IssuePriority;
  estimatedStoryPoints: number; // Fibonacci: 1, 2, 3, 5, 8, 13
  acceptanceCriteriaGherkin: string; // Given... When... Then...
}

export type GeneratedStory = DecomposedStory;

export interface DecomposeEpicRequest {
  epicTitle: string;
  epicDescription?: string;
  projectKey?: string;
  targetSprintCount?: number;
}

export interface DecomposeEpicResponse {
  epicTitle: string;
  stories: DecomposedStory[];
}

export interface CandidateIssue {
  id: string;
  title?: string;
  description?: string;
  storyPoints?: number;
  priority?: IssuePriority;
  type?: StoryType;
}

export interface PlanSprintRequest {
  sprintGoal?: string;
  teamCapacityStoryPoints?: number;
  candidateIssues?: CandidateIssue[];
  sprintId?: string;
  velocityHistory?: number[];
}

export interface PlanSprintResponse {
  allocatedStoryPoints: number;
  capacityUtilizationPercent: number;
  recommendedIssueIds: string[];
  riskAssessment: string;
  rationale: string;
}

export interface BurndownPoint {
  day: number;
  date?: string;
  idealRemaining?: number;
  actualRemaining?: number;
  idealStoryPoints?: number;
  remainingStoryPoints?: number;
}

export interface DiagnoseMetricsRequest {
  sprintId: string;
  sprintName?: string;
  burndownData?: BurndownPoint[];
  blockedIssuesCount?: number;
  velocityTrend?: number[];
  alerts?: string[];
}

export interface DiagnoseMetricsResponse {
  healthStatus: HealthStatus;
  diagnosis: string;
  rootCauses: string[];
  actionableRecommendations: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  skills: string[];
  currentWorkloadStoryPoints?: number;
  maxCapacityStoryPoints?: number;
}

export interface AssigneeRecommendation {
  memberId: string;
  memberName: string;
  matchScore: number;
  rationale: string;
  workloadAfterAssignment: number;
}

export interface SuggestAssigneesRequest {
  issueTitle: string;
  issueDescription?: string;
  requiredSkills?: string[];
  teamMembers: TeamMember[];
}

export interface SuggestAssigneesResponse {
  recommendedAssigneeId: string;
  recommendations: AssigneeRecommendation[];
  rationale: string;
}

export interface EstimateStoryPointsRequest {
  title: string;
  description?: string;
  type?: StoryType;
}

export interface EstimateStoryPointsResponse {
  storyPoints: number; // 1, 2, 3, 5, 8, 13
  confidence: number;
  reasoning: string;
  complexityFactors: string[];
}

export interface GenerateAcceptanceCriteriaRequest {
  title: string;
  description?: string;
  userRole?: string;
}

export interface GenerateAcceptanceCriteriaResponse {
  acceptanceCriteriaGherkin: string;
  scenariosCount: number;
}

export interface SuggestedSubtask {
  title: string;
  description: string;
  type: StoryType;
  priority: IssuePriority;
  estimatedStoryPoints: number;
  acceptanceCriteriaGherkin?: string;
}

export interface BreakdownTaskRequest {
  title: string;
  description?: string;
  projectKey?: string;
  maxSubtasks?: number;
}

export interface BreakdownTaskResponse {
  parentTitle: string;
  subtasks: SuggestedSubtask[];
}

export interface HealthCheckResponse {
  status: 'ok';
  model: string;
  mode: 'live' | 'mock';
  version: string;
  timestamp: string;
}

export interface AIServiceResult<T> {
  data: T;
  /** Gemini model that produced the answer (e.g. "gemini-3.5-flash-lite"), or 'offline-heuristic'. */
  source: string;
  executionTimeMs: number;
  model: string;
}
