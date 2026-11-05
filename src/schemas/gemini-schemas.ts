/**
 * Gemini 2.0 Flash Structured Response Schemas
 * Compatible with @google/generative-ai (v0.21.0+) ResponseSchema
 */

import { ResponseSchema, SchemaType } from '@google/generative-ai';

/**
 * Structured schema for Epic Decomposition
 */
export const epicDecompositionResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    epicTitle: {
      type: SchemaType.STRING,
      description: 'The title of the epic being decomposed',
    },
    stories: {
      type: SchemaType.ARRAY,
      description: 'Granular user stories decomposed from the epic',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'Action-oriented story title',
          },
          description: {
            type: SchemaType.STRING,
            description: 'Agile user story in "As a... I want to... So that..." format',
          },
          type: {
            type: SchemaType.STRING,
            description: 'Issue type: STORY, TASK, or BUG',
            format: 'enum',
            enum: ['STORY', 'TASK', 'BUG'],
          },
          priority: {
            type: SchemaType.STRING,
            description: 'Issue priority level',
            format: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          },
          estimatedStoryPoints: {
            type: SchemaType.INTEGER,
            description: 'Fibonacci story point estimate: 1, 2, 3, 5, or 8',
          },
          acceptanceCriteriaGherkin: {
            type: SchemaType.STRING,
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
export const sprintPlanningResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    allocatedStoryPoints: {
      type: SchemaType.INTEGER,
      description: 'Total story points of selected candidate issues',
    },
    capacityUtilizationPercent: {
      type: SchemaType.NUMBER,
      description: 'Percentage of team capacity utilized (0 to 100+)',
    },
    recommendedIssueIds: {
      type: SchemaType.ARRAY,
      description: 'Ordered list of selected issue IDs matching sprint goal and capacity',
      items: {
        type: SchemaType.STRING,
      },
    },
    riskAssessment: {
      type: SchemaType.STRING,
      description: 'Overall sprint risk assessment based on capacity buffer and complexity',
      format: 'enum',
      enum: ['LOW', 'MEDIUM', 'HIGH'],
    },
    rationale: {
      type: SchemaType.STRING,
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
export const metricsDiagnosisResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    healthStatus: {
      type: SchemaType.STRING,
      description: 'Sprint health assessment',
      format: 'enum',
      enum: ['HEALTHY', 'AT_RISK', 'CRITICAL'],
    },
    diagnosis: {
      type: SchemaType.STRING,
      description: 'Executive diagnostic summary of sprint trajectory',
    },
    rootCauses: {
      type: SchemaType.ARRAY,
      description: 'Identified root causes of burndown deviations or bottlenecks',
      items: {
        type: SchemaType.STRING,
      },
    },
    actionableRecommendations: {
      type: SchemaType.ARRAY,
      description: 'Prescriptive agile recommendations to recover or maintain sprint health',
      items: {
        type: SchemaType.STRING,
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
