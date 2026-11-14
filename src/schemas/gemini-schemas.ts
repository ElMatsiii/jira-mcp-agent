/**
 * Gemini Structured Response Schemas
 * Typed with the Schema/Type definitions of @google/genai (responseSchema in JSON mode)
 */

import { Schema, Type } from '@google/genai';

/**
 * Structured schema for Epic Decomposition
 */
export const epicDecompositionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    epicTitle: {
      type: Type.STRING,
      description: 'The title of the epic being decomposed',
    },
    stories: {
      type: Type.ARRAY,
      description: 'Granular user stories decomposed from the epic',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Action-oriented story title',
          },
          description: {
            type: Type.STRING,
            description: 'Agile user story in "As a... I want to... So that..." format',
          },
          type: {
            type: Type.STRING,
            description: 'Issue type: STORY, TASK, or BUG',
            format: 'enum',
            enum: ['STORY', 'TASK', 'BUG'],
          },
          priority: {
            type: Type.STRING,
            description: 'Issue priority level',
            format: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          },
          estimatedStoryPoints: {
            type: Type.INTEGER,
            description: 'Fibonacci story point estimate: 1, 2, 3, 5, or 8',
          },
          acceptanceCriteriaGherkin: {
            type: Type.STRING,
            description: 'Valid Gherkin scenarios (Feature, Scenario, Given, When, Then)',
          },
        },
        required: [
          'title',
          'description',
          'type',
          'priority',
          'estimatedStoryPoints',
          'acceptanceCriteriaGherkin',
        ],
      },
    },
  },
  required: ['epicTitle', 'stories'],
};

/**
 * Structured schema for Sprint Planning
 */
export const sprintPlanningResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    allocatedStoryPoints: {
      type: Type.INTEGER,
      description: 'Total story points of selected candidate issues',
    },
    capacityUtilizationPercent: {
      type: Type.NUMBER,
      description: 'Percentage of team capacity utilized (0 to 100+)',
    },
    recommendedIssueIds: {
      type: Type.ARRAY,
      description: 'Ordered list of selected issue IDs matching sprint goal and capacity',
      items: {
        type: Type.STRING,
      },
    },
    riskAssessment: {
      type: Type.STRING,
      description: 'Overall sprint risk assessment based on capacity buffer and complexity',
      format: 'enum',
      enum: ['LOW', 'MEDIUM', 'HIGH'],
    },
    rationale: {
      type: Type.STRING,
      description: 'Scrum Master rationale explaining selection trade-offs and capacity buffer',
    },
  },
  required: [
    'allocatedStoryPoints',
    'capacityUtilizationPercent',
    'recommendedIssueIds',
    'riskAssessment',
    'rationale',
  ],
};

/**
 * Structured schema for Metrics Diagnosis
 */
export const metricsDiagnosisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    healthStatus: {
      type: Type.STRING,
      description: 'Sprint health assessment',
      format: 'enum',
      enum: ['HEALTHY', 'AT_RISK', 'CRITICAL'],
    },
    diagnosis: {
      type: Type.STRING,
      description: 'Executive diagnostic summary of sprint trajectory',
    },
    rootCauses: {
      type: Type.ARRAY,
      description: 'Identified root causes of burndown deviations or bottlenecks',
      items: {
        type: Type.STRING,
      },
    },
    actionableRecommendations: {
      type: Type.ARRAY,
      description: 'Prescriptive agile recommendations to recover or maintain sprint health',
      items: {
        type: Type.STRING,
      },
    },
  },
  required: [
    'healthStatus',
    'diagnosis',
    'rootCauses',
    'actionableRecommendations',
  ],
};

/**
 * Structured schema for Task Breakdown & Subtask Segmentation
 */
export const taskBreakdownResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    parentTitle: {
      type: Type.STRING,
      description: 'The parent issue or task title being segmented',
    },
    subtasks: {
      type: Type.ARRAY,
      description: 'Segmented subtasks that complement the prospective task',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Concise subtask title',
          },
          description: {
            type: Type.STRING,
            description: 'Functional or technical explanation of this subtask',
          },
          type: {
            type: Type.STRING,
            description: 'Issue type: TASK, STORY, or BUG',
            format: 'enum',
            enum: ['TASK', 'STORY', 'BUG'],
          },
          priority: {
            type: Type.STRING,
            description: 'Issue priority: LOW, MEDIUM, HIGH, or CRITICAL',
            format: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          },
          estimatedStoryPoints: {
            type: Type.INTEGER,
            description: 'Fibonacci story points (1, 2, 3, 5, 8)',
          },
          acceptanceCriteriaGherkin: {
            type: Type.STRING,
            description: 'Gherkin acceptance criteria for this subtask',
          },
        },
        required: ['title', 'description', 'type', 'priority', 'estimatedStoryPoints'],
      },
    },
  },
  required: ['parentTitle', 'subtasks'],
};

