/**
 * Canonical test fixtures for Unit and REST integration tests
 */

import { CandidateIssue, BurndownPoint, TeamMember } from '../../src/types';

export const TEST_FIXTURES = {
  sampleEpic: {
    projectKey: 'JIRA',
    epicTitle: 'Automated CI/CD Verification & Polyglot Orchestration',
    epicDescription:
      'Establish microservices communication across Go, NestJS, and .NET using gRPC and Kafka with automated quality gates.',
  },
  authEpic: {
    projectKey: 'AUTH',
    epicTitle: 'User Authentication & Multi-Tenancy',
    epicDescription: 'Support OAuth2, JWT verification, and organization tenant isolation',
  },
  kafkaEpic: {
    projectKey: 'STREAM',
    epicTitle: 'High-Throughput Ingestion Engine',
    epicDescription: 'Process 10,000 Kafka messages per second without backpressure with real-time analytics aggregation',
  },
  issueEpic: {
    projectKey: 'BACKLOG',
    epicTitle: 'Issue Management & Agile Scrum Board',
    epicDescription: 'Manage issues, backlog priority, state transitions, and sprint assignments',
  },
  candidateIssues: [
    { id: 'iss-1', title: 'Implement gRPC IssueService', storyPoints: 5, priority: 'HIGH' },
    { id: 'iss-2', title: 'Kafka Request-Reply Integration', storyPoints: 8, priority: 'CRITICAL' },
    { id: 'iss-3', title: 'Burndown Calculation Worker', storyPoints: 5, priority: 'MEDIUM' },
  ] as CandidateIssue[],
  oversizedIssues: [
    { id: 'iss-huge-1', title: 'Re-architect entire monolith', storyPoints: 50, priority: 'CRITICAL' },
    { id: 'iss-huge-2', title: 'Migrate multi-cloud datacenter', storyPoints: 80, priority: 'HIGH' },
  ] as CandidateIssue[],
  healthyBurndown: [
    { day: 1, idealRemaining: 30, actualRemaining: 30 },
    { day: 5, idealRemaining: 20, actualRemaining: 19 },
    { day: 10, idealRemaining: 10, actualRemaining: 8 },
    { day: 14, idealRemaining: 0, actualRemaining: 0 },
  ] as BurndownPoint[],
  laggingBurndown: [
    { day: 1, idealRemaining: 20, actualRemaining: 20 },
    { day: 5, idealRemaining: 12, actualRemaining: 18 },
  ] as BurndownPoint[],
  sampleTeamMembers: [
    {
      id: 'dev-1',
      name: 'Alice Backend',
      skills: ['go', 'grpc', 'postgresql', 'distributed'],
      currentWorkloadStoryPoints: 5,
      maxCapacityStoryPoints: 20,
    },
    {
      id: 'dev-2',
      name: 'Bob Frontend',
      skills: ['react-native', 'typescript', 'graphql', 'apollo'],
      currentWorkloadStoryPoints: 8,
      maxCapacityStoryPoints: 20,
    },
    {
      id: 'dev-3',
      name: 'Charlie Data',
      skills: ['dotnet', 'kafka', 'mongodb', 'analytics'],
      currentWorkloadStoryPoints: 18,
      maxCapacityStoryPoints: 20,
    },
  ] as TeamMember[],
};
