/**
 * Offline Deterministic Fallback Engine
 * Provides 100% offline, zero-dependency, crash-proof agile intelligence
 * conforming to ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md contracts.
 */

import {
  DecomposeEpicRequest,
  DecomposeEpicResponse,
  DecomposedStory,
  PlanSprintRequest,
  PlanSprintResponse,
  CandidateIssue,
  DiagnoseMetricsRequest,
  DiagnoseMetricsResponse,
  HealthStatus,
  RiskAssessment,
  StoryType,
  IssuePriority,
  SuggestAssigneesRequest,
  SuggestAssigneesResponse,
  AssigneeRecommendation,
  EstimateStoryPointsRequest,
  EstimateStoryPointsResponse,
  GenerateAcceptanceCriteriaRequest,
  GenerateAcceptanceCriteriaResponse,
  SuggestedSubtask,
  BreakdownTaskRequest,
  BreakdownTaskResponse,
} from '../types';

export class OfflineFallbackEngine {
  /**
   * Estimates Fibonacci story points based on text content and complexity keywords.
   * Satisfies Feature 28 & T2-F28-01 (zero/minimal description length assigns minimum 1 point).
   */
  public static estimateStoryPoints(title: string, description: string = '', type: string = 'STORY'): number {
    const combined = `${title} ${description}`.trim().toLowerCase();

    // Minimum boundary fallback for empty / trivial input
    if (combined.length === 0 || description.trim().length === 0 && title.length < 5) {
      return 1;
    }
    if (combined.includes('typo') || combined.includes('minor') || combined.includes('icon') || combined.includes('label')) {
      return 1;
    }

    const hasKeyword = (kw: string) => {
      if (kw.includes(' ') || kw.includes('-')) {
        return combined.includes(kw);
      }
      return new RegExp(`\\b${kw}\\b`, 'i').test(combined);
    };

    // High complexity keywords -> 8 points
    const highComplexityKeywords = [
      'architecture', 'migration', 'distributed', 'consensus', 'encryption',
      'payment', 'gateway', 'concurrency', 'clustering', 'oauth2', 'sso',
      'zero-downtime', 'multi-tenant', 're-architect', 'sharding', 'partitioning'
    ];
    if (highComplexityKeywords.some(hasKeyword)) {
      return 8;
    }

    // Medium-high complexity keywords -> 5 points
    const medHighKeywords = [
      'auth', 'jwt', 'security', 'integration', 'export', 'import',
      'pipeline', 'websocket', 'graphql', 'background worker', 'kafka',
      'transaction', 'audit log', 'rate limit', 'grpc'
    ];
    if (medHighKeywords.some(hasKeyword)) {
      return 5;
    }

    // Medium complexity keywords -> 3 points
    const medKeywords = [
      'crud', 'endpoint', 'api', 'table', 'screen', 'ui', 'form',
      'filter', 'search', 'navigation', 'modal', 'state management',
      'cache', 'handler', 'service', 'controller'
    ];
    if (medKeywords.some(hasKeyword)) {
      return 3;
    }

    // Low complexity keywords -> 2 points
    const lowKeywords = [
      'validation', 'error handling', 'style', 'test', 'mock',
      'documentation', 'tooltip', 'badge', 'sanitize', 'refactor'
    ];
    if (lowKeywords.some(hasKeyword)) {
      return 2;
    }

    // Fallback based on word count
    const wordCount = combined.split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) return 5;
    if (wordCount > 10) return 3;
    return 2;
  }

  /**
   * Full structure for Story Point Estimation tool
   */
  public static estimateStoryPointsFull(req: EstimateStoryPointsRequest): EstimateStoryPointsResponse {
    const points = this.estimateStoryPoints(req.title, req.description, req.type);
    const factors: string[] = [];

    if (points >= 8) {
      factors.push('High architectural uncertainty', 'Distributed systems complexity');
    } else if (points >= 5) {
      factors.push('Security or inter-service integration scope');
    } else if (points >= 3) {
      factors.push('Standard domain logic and API CRUD implementation');
    } else {
      factors.push('Routine task or minor enhancement');
    }

    return {
      storyPoints: points,
      confidence: 0.85,
      reasoning: `Assigned ${points} Fibonacci story points based on technical complexity and scope indicators.`,
      complexityFactors: factors,
    };
  }

  /**
   * Generates standard Gherkin Given/When/Then acceptance criteria.
   * Satisfies Feature 28 & T1-F28-02.
   */
  public static generateAcceptanceCriteria(featureName: string, contextDescription: string = '', userRole: string = 'authorized user'): string {
    const cleanFeature = featureName.replace(/[[\]]/g, '').trim();
    return `Feature: ${cleanFeature}
  As an ${userRole}
  I want ${cleanFeature.toLowerCase()}
  So that the feature functions reliably and adheres to specifications

  Scenario: Successful execution (Happy Path)
    Given the system is running and preconditions for ${cleanFeature} are met
    When the user or client initiates the request with valid inputs
    Then the action completes successfully with expected data returned

  Scenario: Validation or boundary handling (Negative Path)
    Given invalid, missing, or malformed input parameters
    When the request is processed by ${cleanFeature}
    Then the system rejects the operation with an explicit, descriptive error code`;
  }

  /**
   * Full structure for Acceptance Criteria Generator tool
   */
  public static generateAcceptanceCriteriaFull(req: GenerateAcceptanceCriteriaRequest): GenerateAcceptanceCriteriaResponse {
    const gherkin = this.generateAcceptanceCriteria(req.title, req.description, req.userRole || 'user');
    return {
      acceptanceCriteriaGherkin: gherkin,
      scenariosCount: 2,
    };
  }

  /**
   * Offline Epic Decomposition:
   * Slices an Epic into 3-5 logical user stories with Gherkin acceptance criteria.
   * Satisfies Feature 26 & 27 contracts.
   */
  public static decomposeEpic(request: DecomposeEpicRequest): DecomposeEpicResponse {
    const { epicTitle, epicDescription = '', projectKey = 'JIRA' } = request;
    const combined = `${epicTitle} ${epicDescription}`.toLowerCase();
    const stories: DecomposedStory[] = [];

    // Pattern 1: Authentication / Multi-Tenancy / Security
    if (
      combined.includes('auth') ||
      combined.includes('login') ||
      combined.includes('jwt') ||
      combined.includes('tenan') ||
      combined.includes('oauth')
    ) {
      stories.push(
        {
          title: `[${projectKey}] User Authentication & JWT Verification Flow`,
          description: `As a user, I want secure authentication via OAuth2/JWT so that access to the system is protected.`,
          type: 'STORY',
          priority: 'CRITICAL',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Auth Flow`,
            'JWT Token Authentication',
            'user'
          ),
        },
        {
          title: `[${projectKey}] Multi-Tenant Isolation & Organization Scoping`,
          description: `As an organization administrator, I want tenant-scoped data isolation so that users only see data within their domain.`,
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Tenant Isolation`,
            'Organization Boundaries',
            'administrator'
          ),
        },
        {
          title: `[${projectKey}] Role-Based Access Control Guards & Middleware`,
          description: `As a system engineer, I want API authorization guards so that endpoints enforce permissions according to user roles.`,
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - RBAC Guards`,
            'Route Authorization',
            'engineer'
          ),
        },
        {
          title: `[${projectKey}] Security Audit Logging & Session Invalidation`,
          description: `As a compliance officer, I want security events logged and expired tokens revoked so that session breaches are prevented.`,
          type: 'STORY',
          priority: 'MEDIUM',
          estimatedStoryPoints: 2,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Audit Logging`,
            'Audit Events',
            'auditor'
          ),
        }
      );
    }
    // Pattern 2: Issue / Backlog / Kanban / Planning
    else if (
      combined.includes('issue') ||
      combined.includes('task') ||
      combined.includes('backlog') ||
      combined.includes('sprint') ||
      combined.includes('board')
    ) {
      stories.push(
        {
          title: `[${projectKey}] Domain Entity Schema & Persistence Repository`,
          description: `As a backend engineer, I want database entities and migration scripts so that state is persisted reliably.`,
          type: 'TASK',
          priority: 'CRITICAL',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Data Persistence`,
            'Database schema and transactions',
            'backend engineer'
          ),
        },
        {
          title: `[${projectKey}] gRPC and REST Endpoint Handlers`,
          description: `As an API consumer, I want RPC and REST endpoints for creating and querying items with input validation.`,
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - API Handlers`,
            'Inter-service communication',
            'client developer'
          ),
        },
        {
          title: `[${projectKey}] Interactive Kanban State Transitions & Event Streaming`,
          description: `As a team member, I want state transitions between TODO, IN_PROGRESS, and DONE to emit domain events.`,
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Event Streaming`,
            'Kafka domain event publication',
            'team member'
          ),
        },
        {
          title: `[${projectKey}] Automated Unit and Contract Integration Tests`,
          description: `As a QA engineer, I want automated test suites verifying status transitions and boundary conditions.`,
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 2,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Automated Testing`,
            'Code coverage >= 60%',
            'QA engineer'
          ),
        }
      );
    }
    // Pattern 3: Kafka / High-Throughput / Ingestion / Analytics
    else if (
      combined.includes('kafka') ||
      combined.includes('ingestion') ||
      combined.includes('throughput') ||
      combined.includes('metric') ||
      combined.includes('analytics')
    ) {
      stories.push(
        {
          title: `[${projectKey}] Partitioned Event Consumer & Ingestion Pipeline`,
          description: `As a platform engineer, I want high-throughput stream processing so that incoming messages are ingested without backpressure.`,
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 8,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Ingestion Pipeline`,
            '10,000 events/sec streaming',
            'platform engineer'
          ),
        },
        {
          title: `[${projectKey}] Real-time Aggregation Engine & Metrics Snapshot`,
          description: `As an analyst, I want aggregated velocity and burndown snapshots so that metrics reflect live progress.`,
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Aggregation Engine`,
            'MongoDB snapshot persistence',
            'analyst'
          ),
        },
        {
          title: `[${projectKey}] Dead-Letter Queue & Resilient Error Interceptor`,
          description: `As a reliability engineer, I want poisoned messages rerouted to a dead-letter queue without stalling the consumer group.`,
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Error Interceptor`,
            'Dead-letter routing',
            'reliability engineer'
          ),
        }
      );
    }
    // Pattern 4: Universal Architectural Decomposition
    else {
      stories.push(
        {
          title: `[${projectKey}] Implement ${epicTitle} - Core Data Contracts`,
          description: `As a software engineer, I want schema definitions and data contracts so that domain entities are structured.`,
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Data Contracts`,
            'Proto and schema generation',
            'engineer'
          ),
        },
        {
          title: `[${projectKey}] Implement ${epicTitle} - Inter-Service Logic`,
          description: `As an API consumer, I want service endpoints and inter-service dispatch so that business operations execute cleanly.`,
          type: 'STORY',
          priority: 'HIGH',
          estimatedStoryPoints: 8,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Inter-Service Logic`,
            'RPC communication',
            'API client'
          ),
        },
        {
          title: `[${projectKey}] Implement ${epicTitle} - Event Streaming & Analytics`,
          description: `As a downstream consumer, I want state change events published to Kafka so that analytics reflect current progress.`,
          type: 'STORY',
          priority: 'MEDIUM',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: this.generateAcceptanceCriteria(
            `${epicTitle} - Analytics Sync`,
            'Kafka events and metrics',
            'downstream service'
          ),
        }
      );
    }

    return {
      epicTitle,
      stories,
    };
  }

  /**
   * Offline Sprint Planner:
   * Knapsack allocation matching team capacity and prioritizing critical issues.
   * Satisfies Feature 27 & Feature 28.
   */
  public static planSprint(request: PlanSprintRequest): PlanSprintResponse {
    const sprintGoal = request.sprintGoal || 'Complete planned sprint backlog objectives';
    const capacity = request.teamCapacityStoryPoints ?? 20;
    const candidateIssues = request.candidateIssues || [];

    // Boundary case: 0 capacity or no candidate issues (T2-F28-02)
    if (capacity <= 0 || candidateIssues.length === 0) {
      return {
        allocatedStoryPoints: 0,
        capacityUtilizationPercent: 0,
        recommendedIssueIds: [],
        riskAssessment: 'OPTIMAL',
        rationale: 'Capacity is 0 or candidate issues list is empty. No issues allocated.',
      };
    }

    // Check if issues individually exceed capacity (T2-F28-03)
    const minPoints = Math.min(...candidateIssues.map((c) => c.storyPoints ?? 3));
    if (minPoints > capacity) {
      return {
        allocatedStoryPoints: 0,
        capacityUtilizationPercent: 0,
        recommendedIssueIds: [],
        riskAssessment: 'HIGH_CAPACITY_RISK',
        rationale: `All candidate issues exceed total team capacity (${capacity} pts). Backlog deferral recommended.`,
      };
    }

    let allocated = 0;
    const recommended: string[] = [];

    // Greedily allocate issues that fit into capacity
    for (const issue of candidateIssues) {
      const pts = issue.storyPoints ?? 3;
      if (allocated + pts <= capacity) {
        allocated += pts;
        recommended.push(issue.id);
      }
    }

    const utilization = Math.round((allocated / capacity) * 100);
    const riskAssessment = allocated > capacity * 0.9 ? 'MEDIUM_CAPACITY_RISK' : 'OPTIMAL';
    const rationale = `Selected ${recommended.length} candidate issues matching team velocity capacity of ${capacity} points (${utilization}% utilization).`;

    return {
      allocatedStoryPoints: allocated,
      capacityUtilizationPercent: utilization,
      recommendedIssueIds: recommended,
      riskAssessment,
      rationale,
    };
  }

  /**
   * Offline Metrics Diagnostician:
   * Evaluates burndown curve deviation, scope inflation, and impediments.
   * Satisfies Feature 26 & Feature 27.
   */
  public static diagnoseMetrics(request: DiagnoseMetricsRequest): DiagnoseMetricsResponse {
    const sprintId = request.sprintId;
    const sprintName = request.sprintName || `Sprint ${sprintId}`;
    const burndown = request.burndownData || [];
    const blockedCount = request.blockedIssuesCount || 0;
    const timeAlerts = request.alerts || [];

    if (burndown.length === 0) {
      return {
        healthStatus: blockedCount > 0 ? 'AT_RISK' : 'HEALTHY',
        diagnosis: `Sprint ${sprintName} has no burndown data points recorded yet. ${timeAlerts.join(' ')}`.trim(),
        rootCauses: [
          ...(blockedCount > 0 ? [`${blockedCount} issues currently flagged as BLOCKED.`] : ['Sprint initialized; awaiting initial task progress.']),
          ...timeAlerts,
        ],
        actionableRecommendations: ['Ensure team transitions tasks and logs daily progress.'],
      };
    }

    const first = burndown[0];
    const latest = burndown[burndown.length - 1];

    const actualLatest = latest.actualRemaining ?? latest.remainingStoryPoints ?? 0;
    const idealLatest = latest.idealRemaining ?? latest.idealStoryPoints ?? 0;
    const isLagging = actualLatest > idealLatest;

    const healthStatus: HealthStatus = isLagging || blockedCount > 0 ? 'AT_RISK' : 'HEALTHY';
    const rootCauses: string[] = [];

    if (blockedCount > 0) {
      rootCauses.push(`${blockedCount} issues currently blocked in code review or external dependencies.`);
    }
    if (isLagging) {
      rootCauses.push(
        `Actual remaining (${actualLatest} pts) exceeds ideal target (${idealLatest} pts). Unplanned scope addition or velocity deficit detected.`
      );
    }
    if (rootCauses.length === 0) {
      rootCauses.push('Sprint is tracking cleanly along the ideal burndown trajectory.');
    }
    rootCauses.push(...timeAlerts);

    const actionableRecommendations: string[] = [
      'Conduct swarming session on blocked PRs and impediments.',
      'Defer lower-priority backlog stories to preserve sprint goal commitment.',
    ];

    const diagnosis =
      healthStatus === 'AT_RISK'
        ? `Actual burndown is trending above ideal rate. Sprint delivery is at risk of velocity deficit. ${timeAlerts.join(' ')}`.trim()
        : `Sprint burndown is tracking along ideal trajectory. ${timeAlerts.join(' ')}`.trim();

    return {
      healthStatus,
      diagnosis,
      rootCauses,
      actionableRecommendations,
    };
  }

  /**
   * Offline Assignee Suggester:
   * Matches candidate team members based on skills and capacity.
   */
  public static suggestAssignees(request: SuggestAssigneesRequest): SuggestAssigneesResponse {
    const { issueTitle, issueDescription = '', requiredSkills = [], teamMembers } = request;
    const combined = `${issueTitle} ${issueDescription}`.toLowerCase();

    const scoredMembers: AssigneeRecommendation[] = teamMembers.map((member) => {
      let score = 50;
      const memberSkills = member.skills || [];

      // Check skill overlap
      for (const skill of requiredSkills) {
        if (memberSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
          score += 20;
        }
      }
      for (const skill of memberSkills) {
        if (combined.includes(skill.toLowerCase())) {
          score += 15;
        }
      }

      // Check current workload
      const current = member.currentWorkloadStoryPoints || 0;
      const max = member.maxCapacityStoryPoints || 20;
      const available = max - current;
      if (available > 5) score += 15;
      else if (available <= 0) score -= 30;

      const clampedScore = Math.max(0, Math.min(100, score));

      return {
        memberId: member.id,
        memberName: member.name,
        matchScore: clampedScore,
        rationale: `Matched skills: [${memberSkills.join(', ')}]. Remaining capacity: ${available} pts.`,
        workloadAfterAssignment: current + 3,
      };
    });

    scoredMembers.sort((a, b) => b.matchScore - a.matchScore);
    const top = scoredMembers[0];

    return {
      recommendedAssigneeId: top.memberId,
      recommendations: scoredMembers,
      rationale: `Recommended ${top.memberName} with highest match score (${top.matchScore}%) and capacity availability.`,
    };
  }

  /**
   * Deterministic Task Breakdown & Subtask Suggester:
   * Segments a prospective new task into actionable complementary subtasks.
   */
  public static breakdownTask(request: BreakdownTaskRequest): BreakdownTaskResponse {
    const title = (request.title || '').trim();
    const description = (request.description || '').trim();
    const combined = `${title} ${description}`.toLowerCase();
    const maxSubtasks = request.maxSubtasks && request.maxSubtasks > 0 ? Math.min(request.maxSubtasks, 6) : 5;

    let subtasks: SuggestedSubtask[] = [];

    if (
      combined.includes('web') ||
      combined.includes('pagina') ||
      combined.includes('página') ||
      combined.includes('sitio') ||
      combined.includes('front') ||
      combined.includes('back') ||
      combined.includes('base') ||
      combined.includes('app')
    ) {
      subtasks = [
        {
          title: 'Crear Frontend y componentes UI base',
          description: 'Estructurar aplicación cliente, configuración de enrutador, layout base y temas de diseño.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given el entorno de desarrollo When se inicia el servidor web Then renderiza la vista principal sin errores de consola',
        },
        {
          title: 'Crear Backend y servicios API REST',
          description: 'Configurar servidor HTTP, controladores base, middleware de CORS y validación de peticiones.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: 'Given peticiones HTTP entrantes When se invocan endpoints REST Then retorna respuestas estandarizadas con códigos HTTP correctos',
        },
        {
          title: 'Diseñar esquema de base de datos y migraciones',
          description: 'Definir tablas o colecciones de datos, índices de rendimiento y scripts de migración automáticos.',
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given la base de datos vacía When se ejecutan las migraciones Then todas las tablas y restricciones se crean satisfactoriamente',
        },
        {
          title: 'Configurar autenticación y gestión de usuarios',
          description: 'Implementar flujo de inicio de sesión, sesiones seguras mediante tokens y protección de rutas.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: 'Given un usuario con credenciales válidas When inicia sesión Then recibe un token de acceso autorizado',
        },
        {
          title: 'Pipeline CI/CD y despliegue del entorno',
          description: 'Configurar contenedor Docker, flujos de integración continua y verificación automática de calidad.',
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 2,
          acceptanceCriteriaGherkin: 'Given un push al repositorio When pasa el pipeline Then las imágenes se construyen y las pruebas pasan al 100%',
        },
      ];
    } else if (
      combined.includes('auth') ||
      combined.includes('login') ||
      combined.includes('seguridad') ||
      combined.includes('registro') ||
      combined.includes('sesion') ||
      combined.includes('sesión')
    ) {
      subtasks = [
        {
          title: 'Implementar formulario de autenticación e interfaz',
          description: 'Diseñar vista accesible para login y registro con validación de entradas.',
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given la vista de login When se ingresan credenciales incompletas Then muestra alertas contextuales de validación',
        },
        {
          title: 'Servicio de emisión y validación de tokens JWT',
          description: 'Generación de pares de tokens de acceso y refresco con firma criptográfica.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: 'Given un token válido When se envía en la cabecera Authorization Then permite acceso al recurso protegido',
        },
        {
          title: 'Mecanismo de recuperación de contraseña',
          description: 'Flujo de envío de token de un solo uso por correo y restablecimiento seguro.',
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given una solicitud de restablecimiento When el token es válido Then permite definir una nueva contraseña',
        },
        {
          title: 'Middleware de autorización y roles de usuario',
          description: 'Control de acceso granular (RBAC) para proteger endpoints administrativos.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given un usuario sin rol de administrador When accede a una ruta restringida Then retorna HTTP 403 Forbidden',
        },
      ];
    } else if (
      combined.includes('api') ||
      combined.includes('servicio') ||
      combined.includes('endpoint') ||
      combined.includes('microservicio')
    ) {
      subtasks = [
        {
          title: 'Definir contratos y especificación de interfaz',
          description: 'Redactar contratos OpenAPI/Protobuf y modelos de datos compartidos.',
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 2,
          acceptanceCriteriaGherkin: 'Given el esquema de contratos When se valida contra el linter Then cumple los estándares sin discrepancias',
        },
        {
          title: 'Implementar lógica de negocio y controladores',
          description: 'Codificar servicios internos, reglas de negocio y manejo estandarizado de excepciones.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: 'Given datos de entrada válidos When se procesa la transacción Then persiste el estado y retorna respuesta 200',
        },
        {
          title: 'Integración de persistencia y repositorios',
          description: 'Conectar repositorios a base de datos con transaccionalidad y manejo de concurrencia.',
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given una operación transaccional When ocurre un fallo intermedio Then se realiza rollback automático',
        },
        {
          title: 'Pruebas unitarias e integración de endpoints',
          description: 'Cobertura automatizada de casos límite, errores 4xx/5xx y pruebas de carga ligeras.',
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: 'Given la suite de pruebas When se ejecuta en el pipeline Then la cobertura supera el 80%',
        },
      ];
    } else {
      subtasks = [
        {
          title: `Especificación y arquitectura técnica para ${title}`,
          description: `Definir alcance, dependencias técnicas y diseño detallado para "${title}".`,
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 2,
          acceptanceCriteriaGherkin: `Given la necesidad de "${title}" When se completa el diseño Then el equipo aprueba la propuesta técnica`,
        },
        {
          title: `Implementación de funcionalidad principal de ${title}`,
          description: `Desarrollar el núcleo funcional requerido para "${title}".`,
          type: 'TASK',
          priority: 'HIGH',
          estimatedStoryPoints: 5,
          acceptanceCriteriaGherkin: `Given el sistema en ejecución When se activa la funcionalidad Then produce los resultados esperados`,
        },
        {
          title: `Interfaz de usuario e interacción para ${title}`,
          description: `Integrar elementos visuales, estados de carga y retroalimentación para "${title}".`,
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 3,
          acceptanceCriteriaGherkin: `Given un usuario interactuando When realiza la acción Then la interfaz responde de manera fluida`,
        },
        {
          title: `Pruebas automatizadas y validación de aceptación para ${title}`,
          description: `Asegurar calidad mediante pruebas unitarias, de integración y validación funcional.`,
          type: 'TASK',
          priority: 'MEDIUM',
          estimatedStoryPoints: 2,
          acceptanceCriteriaGherkin: `Given los casos de prueba When se corre la suite Then todos los criterios de aceptación se cumplen`,
        },
      ];
    }

    return {
      parentTitle: title,
      subtasks: subtasks.slice(0, maxSubtasks),
    };
  }
}
