/**
 * Prompt Engineering Templates for Gemini 2.0 Flash
 */

import { CandidateIssue, BurndownPoint } from '../types';

export const SYSTEM_SCRUM_MASTER_INSTRUCTION = `You are Jira AI Agile Scrum Master, an expert agile coach and technical architect.
Your responsibilities:
1. Decompose complex agile Epics into granular, independent, testable User Stories with Fibonacci point estimates (1, 2, 3, 5, 8) and Gherkin acceptance criteria.
2. Plan sprints by packing candidate issues against team velocity/capacity while maximizing business value and preserving a healthy buffer.
3. Diagnose sprint burndown deviations, detecting scope creep (>20%), velocity deficits, and blocked work impediments with actionable recovery steps.

STRICT CONSTRAINTS:
- Output MUST be valid JSON adhering strictly to the provided responseSchema.
- NEVER include markdown wrappers like \`\`\`json in the raw text output.
- All acceptance criteria MUST follow standard Gherkin syntax (Feature, Scenario, Given, When, Then).
- Story point estimates MUST only use Fibonacci values: 1, 2, 3, 5, 8.`;

/**
 * Builds prompt for Epic Decomposition
 */
export function buildDecomposeEpicPrompt(
  epicTitle: string,
  epicDescription: string = '',
  projectKey: string = 'JIRA',
  targetSprintCount: number = 1
): string {
  return `Decompose the following Epic into 3 to 6 granular, actionable User Stories:

Epic Title: ${epicTitle}
Project Key: ${projectKey}
Target Sprints: ${targetSprintCount}
Epic Description:
${epicDescription}

Guidelines:
1. Divide the epic into thin, vertical, end-to-end slices (e.g. Data/Persistence, API/Service, UI/Interaction, Validation/Edge Cases).
2. Write each description in standard agile format: "As a [role], I want to [action], so that [business value]".
3. Assign Fibonacci story points (1, 2, 3, 5, or 8) based on technical complexity and uncertainty.
4. Provide acceptance criteria in complete Gherkin format with at least one happy path and one negative/validation scenario.
5. Prefix story titles with "[${projectKey}]" for traceability.`;
}

/**
 * Builds prompt for Sprint Planning
 */
export function buildPlanSprintPrompt(
  sprintGoal: string = 'Complete planned sprint backlog objectives',
  teamCapacityStoryPoints: number = 20,
  candidateIssues: CandidateIssue[] = [],
  velocityHistory?: number[]
): string {
  const avgVelocity =
    velocityHistory && velocityHistory.length > 0
      ? (velocityHistory.reduce((a, b) => a + b, 0) / velocityHistory.length).toFixed(1)
      : 'N/A';

  return `Plan the upcoming sprint by allocating candidate issues to match team capacity:

Sprint Goal: ${sprintGoal}
Team Capacity Budget: ${teamCapacityStoryPoints} story points
Historical 3-Sprint Rolling Velocity: ${avgVelocity} points
Candidate Issues:
${JSON.stringify(candidateIssues, null, 2)}

Guidelines:
1. Prioritize CRITICAL and HIGH priority issues that directly advance the sprint goal.
2. The sum of allocatedStoryPoints must not exceed ${teamCapacityStoryPoints}. Maintain an optimal utilization of 80% to 90% (leaving a 10-20% contingency buffer for unplanned bugs).
3. If capacity is near 100%, assess risk as HIGH; if between 80-90%, assess as LOW; if below 60%, assess as MEDIUM.
4. Return the list of recommendedIssueIds in recommended execution order.
5. Provide a clear rationale explaining why these issues were chosen and how the sprint goal is achieved within capacity.`;
}

/**
 * Builds prompt for Metrics Diagnosis
 */
export function buildDiagnoseMetricsPrompt(
  sprintId: string,
  sprintName: string = 'Current Sprint',
  burndownData: BurndownPoint[] = [],
  blockedIssuesCount: number = 0,
  velocityTrend?: number[],
  alerts?: string[]
): string {
  return `Analyze the following sprint metrics and burndown trajectory:

Sprint ID: ${sprintId}
Sprint Name: ${sprintName}
Blocked Issues Count: ${blockedIssuesCount}
Recorded Alerts: ${alerts && alerts.length > 0 ? alerts.join(', ') : 'None'}
Recent Velocity History: ${velocityTrend ? velocityTrend.join(', ') : 'N/A'}

Burndown Data (Day, Remaining Points, Ideal Points):
${JSON.stringify(burndownData, null, 2)}

Analysis Tasks:
1. Compare remaining points vs ideal points across sprint timeline.
2. Detect scope creep (any mid-sprint inflation where remaining points increased).
3. Evaluate velocity deficit (points remaining significantly above ideal curve).
4. Identify root causes contributing to delivery risks (e.g. blocked issues, scope changes, estimation bias).
5. Provide 2-4 concrete, actionable agile remediation recommendations (e.g. issue swarming, scope renegotiation, unblocking dependencies).
6. Classify healthStatus appropriately ('HEALTHY', 'AT_RISK', 'CRITICAL').`;
}

/**
 * Builds prompt for Story Point Estimation
 */
export function buildEstimatePrompt(title: string, description: string = '', type: string = 'STORY'): string {
  return `Estimate Fibonacci story points (1, 2, 3, 5, 8, 13) for the following agile ${type}:
Title: ${title}
Description: ${description}

Evaluate technical complexity, uncertainty, and effort. Return a JSON object with:
- storyPoints (integer from Fibonacci series)
- confidence (number from 0.0 to 1.0)
- reasoning (explanation)
- complexityFactors (array of strings)`;
}

/**
 * Builds prompt for Gherkin Acceptance Criteria Generation
 */
export function buildGherkinPrompt(title: string, description: string = '', userRole: string = 'user'): string {
  return `Generate formal Gherkin acceptance criteria (Feature, Scenario, Given, When, Then) for:
Title: ${title}
Description: ${description}
Primary User Persona: ${userRole}

Include:
1. Happy path scenario
2. Edge case / validation error scenario
Return valid Gherkin formatted text and the scenariosCount.`;
}
