import { z } from 'zod';
import {
  StoryType,
  IssuePriority,
  HealthStatus,
  RiskAssessment,
  DecomposedStory,
  DecomposeEpicRequest,
  DecomposeEpicResponse,
  CandidateIssue,
  PlanSprintRequest,
  PlanSprintResponse,
  BurndownPoint,
  DiagnoseMetricsRequest,
  DiagnoseMetricsResponse,
  TeamMember,
  AssigneeRecommendation,
  SuggestAssigneesRequest,
  SuggestAssigneesResponse,
  EstimateStoryPointsRequest,
  EstimateStoryPointsResponse,
  GenerateAcceptanceCriteriaRequest,
  GenerateAcceptanceCriteriaResponse,
  SuggestedSubtask,
  BreakdownTaskRequest,
  BreakdownTaskResponse,
  HealthCheckResponse,
} from '../types';

// --- Common Agile Enums ---
export const StoryTypeSchema = z.enum(['STORY', 'TASK', 'BUG', 'EPIC']);
export const IssuePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const HealthStatusSchema = z.enum(['HEALTHY', 'AT_RISK', 'CRITICAL']);
export const RiskAssessmentSchema = z.enum([
  'OPTIMAL',
  'LOW',
  'MEDIUM',
  'HIGH',
  'LOW_CAPACITY_RISK',
  'MEDIUM_CAPACITY_RISK',
  'HIGH_CAPACITY_RISK',
  'OVER_CAPACITY',
]);

// --- 1. Epic Decomposition Schemas ---
export const DecomposeEpicInputSchema = z.object({
  epicTitle: z.string({ required_error: 'Missing mandatory epicTitle' }).trim().min(1, 'Missing mandatory epicTitle'),
  epicDescription: z.string().optional().default(''),
  projectKey: z.string().optional().default('JIRA'),
  targetSprintCount: z.number().int().positive().optional().default(1),
});

export const DecomposedStorySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  type: StoryTypeSchema.default('STORY'),
  priority: IssuePrioritySchema.default('HIGH'),
  estimatedStoryPoints: z.number().int().positive(), // Fibonacci: 1, 2, 3, 5, 8, 13
  acceptanceCriteriaGherkin: z.string().min(1),
});

export const DecomposeEpicResponseSchema = z.object({
  epicTitle: z.string(),
  stories: z.array(DecomposedStorySchema).min(1),
});

// --- 2. Sprint Planning Schemas ---
export const CandidateIssueSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  storyPoints: z.number().nonnegative().optional().default(3),
  priority: IssuePrioritySchema.optional().default('MEDIUM'),
  type: StoryTypeSchema.optional().default('STORY'),
});

export const PlanSprintInputSchema = z.object({
  sprintId: z.string().optional(),
  sprintGoal: z.string().optional().default('Complete planned sprint backlog objectives'),
  teamCapacityStoryPoints: z.number().int().nonnegative().optional().default(20),
  velocityHistory: z.array(z.number().nonnegative()).optional().default([]),
  candidateIssues: z.array(CandidateIssueSchema).optional().default([]),
});

export const PlanSprintResponseSchema = z.object({
  allocatedStoryPoints: z.number().int().nonnegative(),
  capacityUtilizationPercent: z.number().nonnegative(),
  recommendedIssueIds: z.array(z.string()),
  riskAssessment: z.string(),
  rationale: z.string(),
});

// --- 3. Metrics & Burndown Diagnosis Schemas ---
export const BurndownPointSchema = z
  .object({
    day: z.number().int().nonnegative(),
    date: z.string().optional(),
    idealRemaining: z.number().optional(),
    actualRemaining: z.number().optional(),
    idealStoryPoints: z.number().optional(),
    remainingStoryPoints: z.number().optional(),
  })
  .transform((pt) => ({
    day: pt.day,
    date: pt.date,
    idealRemaining: pt.idealRemaining ?? pt.idealStoryPoints ?? 0,
    actualRemaining: pt.actualRemaining ?? pt.remainingStoryPoints ?? 0,
    idealStoryPoints: pt.idealStoryPoints ?? pt.idealRemaining ?? 0,
    remainingStoryPoints: pt.remainingStoryPoints ?? pt.actualRemaining ?? 0,
  }));

export const DiagnoseMetricsInputSchema = z.object({
  sprintId: z.string({ required_error: 'sprintId is mandatory' }).trim().min(1, 'sprintId is mandatory'),
  sprintName: z.string().optional(),
  burndownData: z.array(BurndownPointSchema).optional().default([]),
  blockedIssuesCount: z.number().int().nonnegative().optional().default(0),
  velocityTrend: z.array(z.number()).optional().default([]),
  alerts: z.array(z.string()).optional().default([]),
});

export const DiagnoseMetricsResponseSchema = z.object({
  healthStatus: HealthStatusSchema,
  diagnosis: z.string(),
  rootCauses: z.array(z.string()),
  actionableRecommendations: z.array(z.string()).min(1),
});

// --- 4. Assignee Suggestion Schemas ---
export const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  skills: z.array(z.string()).optional().default([]),
  currentWorkloadStoryPoints: z.number().nonnegative().optional().default(0),
  maxCapacityStoryPoints: z.number().positive().optional().default(20),
});

export const SuggestAssigneesInputSchema = z.object({
  issueTitle: z.string({ required_error: 'issueTitle is required' }).trim().min(1, 'issueTitle is required'),
  issueDescription: z.string().optional().default(''),
  requiredSkills: z.array(z.string()).optional().default([]),
  teamMembers: z.array(TeamMemberSchema).min(1, 'At least one team member must be provided'),
});

export const AssigneeRecommendationSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  matchScore: z.number().min(0).max(100),
  rationale: z.string(),
  workloadAfterAssignment: z.number(),
});

export const SuggestAssigneesResponseSchema = z.object({
  recommendedAssigneeId: z.string(),
  recommendations: z.array(AssigneeRecommendationSchema),
  rationale: z.string(),
});

// --- 5. Story Point Estimation Schemas ---
export const EstimateStoryPointsInputSchema = z.object({
  title: z.string({ required_error: 'title is required' }).trim().min(1, 'title is required'),
  description: z.string().optional().default(''),
  type: StoryTypeSchema.optional().default('STORY'),
});

export const EstimateStoryPointsResponseSchema = z.object({
  storyPoints: z.number().int().positive(), // 1, 2, 3, 5, 8, 13
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  complexityFactors: z.array(z.string()),
});

// --- 6. Acceptance Criteria Generator Schemas ---
export const GenerateAcceptanceCriteriaInputSchema = z.object({
  title: z.string({ required_error: 'title is required' }).trim().min(1, 'title is required'),
  description: z.string().optional().default(''),
  userRole: z.string().optional().default('user'),
});

export const GenerateAcceptanceCriteriaResponseSchema = z.object({
  acceptanceCriteriaGherkin: z.string(),
  scenariosCount: z.number().int().positive(),
});

// --- 7. Capacity Balancing Schema (Feature 28) ---
export const BalanceCapacityInputSchema = z.object({
  sprintGoal: z.string().optional().default('Balance team sprint commitment'),
  teamCapacityStoryPoints: z.number().int().nonnegative().optional().default(20),
  candidateIssues: z.array(CandidateIssueSchema).optional().default([]),
});

// --- 8. Task Breakdown & Subtask Segmentation Schemas ---
export const SuggestedSubtaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  type: StoryTypeSchema.default('TASK'),
  priority: IssuePrioritySchema.default('MEDIUM'),
  estimatedStoryPoints: z.number().int().positive().default(3),
  acceptanceCriteriaGherkin: z.string().optional().default(''),
});

export const BreakdownTaskInputSchema = z.object({
  title: z.string({ required_error: 'title is required' }).trim().min(1, 'title is required'),
  description: z.string().optional().default(''),
  projectKey: z.string().optional().default('JIRA'),
  maxSubtasks: z.number().int().positive().max(10).optional().default(5),
});

export const BreakdownTaskResponseSchema = z.object({
  parentTitle: z.string(),
  subtasks: z.array(SuggestedSubtaskSchema).min(1),
});

// --- 9. Health Check Schema ---
export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  model: z.string(),
  mode: z.enum(['live', 'mock']),
  version: z.string(),
  timestamp: z.string(),
});
