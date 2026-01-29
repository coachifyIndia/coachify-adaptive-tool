# Admin Dashboard Architecture v2.0
## Industry Best Practices & Extensible Design

---

## Critical Review of v1 Architecture

### What Was Good
- Clear separation of concerns
- Comprehensive question schema understanding
- Basic RBAC structure
- Bulk upload workflow

### What Needed Improvement
| Area | v1 Approach | Industry Best Practice |
|------|-------------|----------------------|
| Architecture Pattern | Tightly coupled monolith | Modular Monolith (future microservices ready) |
| Authorization | Simple role hierarchy | Policy-as-Code with ABAC support |
| Audit Logging | Basic change tracking | Event Sourcing for full traceability |
| Bulk Operations | Synchronous processing | Async job queue with progress tracking |
| API Design | REST only | REST + GraphQL for flexible querying |
| Validation | Per-request validation | Validation pipeline with pluggable rules |
| Extensibility | Hard-coded features | Plugin architecture with hooks |
| Search | Basic MongoDB queries | Elasticsearch for full-text search |
| Caching | None specified | Multi-layer caching strategy |

---

## 1. REVISED SYSTEM ARCHITECTURE

### 1.1 Modular Monolith Pattern (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DASHBOARD                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Frontend (React + TypeScript)                 │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │Question │ │ Bulk    │ │ Review  │ │Analytics│ │Settings │        │    │
│  │  │ Module  │ │ Upload  │ │Workflow │ │ Module  │ │ Module  │        │    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │    │
│  └───────┼──────────┼──────────┼──────────┼──────────┼─────────────────┘    │
│          │          │          │          │          │                       │
│  ┌───────┴──────────┴──────────┴──────────┴──────────┴─────────────────┐    │
│  │                    API Gateway Layer                                 │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │    │
│  │  │   Auth   │ │   Rate   │ │  CORS    │ │  Audit   │                │    │
│  │  │Middleware│ │ Limiter  │ │  Policy  │ │  Logger  │                │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────┐
│                     BACKEND (Modular Monolith)                              │
│  ┌──────────────────────────────┴──────────────────────────────────────┐    │
│  │                        Domain Modules                                │    │
│  │                                                                      │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │    │
│  │  │   QUESTION     │  │    ADMIN       │  │   ANALYTICS    │         │    │
│  │  │    MODULE      │  │    MODULE      │  │    MODULE      │         │    │
│  │  ├────────────────┤  ├────────────────┤  ├────────────────┤         │    │
│  │  │ • Controllers  │  │ • Controllers  │  │ • Controllers  │         │    │
│  │  │ • Services     │  │ • Services     │  │ • Services     │         │    │
│  │  │ • Repositories │  │ • Repositories │  │ • Repositories │         │    │
│  │  │ • Validators   │  │ • Validators   │  │ • Aggregations │         │    │
│  │  │ • Events       │  │ • Policies     │  │ • Reports      │         │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │    │
│  │                                                                      │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │    │
│  │  │    IMPORT      │  │    REVIEW      │  │    AUDIT       │         │    │
│  │  │    MODULE      │  │    MODULE      │  │    MODULE      │         │    │
│  │  ├────────────────┤  ├────────────────┤  ├────────────────┤         │    │
│  │  │ • Job Queue    │  │ • Workflow     │  │ • Event Store  │         │    │
│  │  │ • Parsers      │  │ • State Machine│  │ • Projections  │         │    │
│  │  │ • Validators   │  │ • Notifications│  │ • Query API    │         │    │
│  │  │ • Mappers      │  │ • Comments     │  │ • Retention    │         │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     Shared Infrastructure                            │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │  Event  │ │  Job    │ │  Cache  │ │  Search │ │  File   │        │    │
│  │  │   Bus   │ │  Queue  │ │  Layer  │ │  Index  │ │ Storage │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                        Data Layer                                    │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │    │
│  │  │    MongoDB      │ │     Redis       │ │  Elasticsearch  │        │    │
│  │  │  (Primary DB)   │ │ (Cache + Queue) │ │ (Search Index)  │        │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘        │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Why Modular Monolith?

| Consideration | Decision |
|--------------|----------|
| Team Size | Small team → Modular Monolith (avoids microservices overhead) |
| Deployment Complexity | Single deployment unit → Simpler DevOps |
| Development Speed | Faster initial development with clear module boundaries |
| Future Scaling | Module boundaries enable future extraction to microservices |
| Debugging | Easier than distributed systems |
| Data Consistency | Transactional consistency within single database |

---

## 2. EVENT-DRIVEN ARCHITECTURE (CQRS-Lite)

### 2.1 Event Sourcing for Audit Trail

Instead of traditional audit logging, we implement **Event Sourcing** for questions:

```typescript
// Every change is stored as an immutable event
interface QuestionEvent {
  event_id: string;
  event_type: QuestionEventType;
  aggregate_id: string;       // question_id
  timestamp: Date;
  actor_id: string;           // admin who performed action
  payload: object;            // event-specific data
  metadata: {
    ip_address: string;
    user_agent: string;
    correlation_id: string;   // trace across operations
  };
}

enum QuestionEventType {
  // Lifecycle Events
  QUESTION_CREATED = 'question.created',
  QUESTION_UPDATED = 'question.updated',
  QUESTION_DELETED = 'question.deleted',

  // Status Events
  QUESTION_SUBMITTED_FOR_REVIEW = 'question.submitted_for_review',
  QUESTION_APPROVED = 'question.approved',
  QUESTION_REJECTED = 'question.rejected',
  QUESTION_PUBLISHED = 'question.published',
  QUESTION_ARCHIVED = 'question.archived',

  // Bulk Events
  QUESTION_BULK_IMPORTED = 'question.bulk_imported',
  QUESTION_BULK_UPDATED = 'question.bulk_updated',

  // Review Events
  REVIEW_COMMENT_ADDED = 'question.review.comment_added',
  REVIEW_FEEDBACK_REQUESTED = 'question.review.feedback_requested',
}
```

### 2.2 Benefits of Event Sourcing

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT SOURCING BENEFITS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. COMPLETE AUDIT TRAIL                                         │
│     └── Every change is recorded permanently                     │
│     └── "Who changed what, when, and why"                        │
│     └── Compliance ready (SOC 2, GDPR)                           │
│                                                                  │
│  2. TIME TRAVEL / TEMPORAL QUERIES                               │
│     └── "Show me the question as it was on Jan 15th"             │
│     └── Debug production issues by replaying events              │
│                                                                  │
│  3. UNDO / REDO CAPABILITY                                       │
│     └── Revert to any previous version                           │
│     └── No data loss from accidental changes                     │
│                                                                  │
│  4. ANALYTICS FROM HISTORY                                       │
│     └── "How many questions were edited after review?"           │
│     └── "Average time from creation to approval"                 │
│                                                                  │
│  5. DEBUGGING & SUPPORT                                          │
│     └── Reproduce exact state when issue occurred                │
│     └── Understand change history for support tickets            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 CQRS-Lite Pattern

We implement a simplified CQRS where:
- **Write Side**: Events stored in append-only event store
- **Read Side**: Materialized views for efficient querying

```
┌─────────────────┐         ┌─────────────────┐
│   Admin UI      │         │   Admin UI      │
│  (Write Ops)    │         │  (Read Ops)     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  Command API    │         │   Query API     │
│  POST/PUT/DELETE│         │   GET           │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  Event Store    │────────▶│  Read Models    │
│  (MongoDB)      │  Sync   │  (MongoDB +     │
│                 │         │   Elasticsearch)│
└─────────────────┘         └─────────────────┘
```

---

## 3. AUTHORIZATION: POLICY-AS-CODE (ABAC + RBAC)

### 3.1 Why Policy-as-Code?

Traditional RBAC limitations:
- Hard to express complex rules ("can only edit questions in their assigned modules")
- Role explosion with specific permissions
- Changes require code deployment

Policy-as-Code benefits:
- Rules expressed declaratively
- Dynamic evaluation at runtime
- Easy to audit and version control
- Supports ABAC (Attribute-Based Access Control)

### 3.2 Permission Architecture

```typescript
// Policy Definition Language (inspired by OPA/Rego)
interface Policy {
  resource: string;        // 'question', 'import_batch', 'admin'
  action: string;          // 'create', 'read', 'update', 'delete', 'approve'
  conditions: Condition[]; // Dynamic conditions
}

interface Condition {
  field: string;           // 'subject.role', 'resource.module_id', 'context.time'
  operator: 'eq' | 'in' | 'contains' | 'gte' | 'lte' | 'custom';
  value: any;
}

// Example Policies
const policies: Policy[] = [
  // CONTENT_ADMIN can create questions in any module
  {
    resource: 'question',
    action: 'create',
    conditions: [
      { field: 'subject.role', operator: 'eq', value: 'CONTENT_ADMIN' }
    ]
  },

  // MODULE_EXPERT can only edit questions in their assigned modules
  {
    resource: 'question',
    action: 'update',
    conditions: [
      { field: 'subject.role', operator: 'eq', value: 'MODULE_EXPERT' },
      { field: 'resource.module_id', operator: 'in', value: 'subject.assigned_modules' }
    ]
  },

  // REVIEWER can only approve questions NOT created by themselves
  {
    resource: 'question',
    action: 'approve',
    conditions: [
      { field: 'subject.role', operator: 'in', value: ['CONTENT_ADMIN', 'REVIEWER'] },
      { field: 'resource.created_by', operator: 'neq', value: 'subject.admin_id' }
    ]
  },

  // Bulk import requires special permission
  {
    resource: 'import_batch',
    action: 'create',
    conditions: [
      { field: 'subject.permissions', operator: 'contains', value: 'bulk_import' }
    ]
  }
];
```

### 3.3 Revised Role Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN ROLE HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUPER_ADMIN                                                                 │
│  ├── All permissions                                                         │
│  ├── Manage admin accounts                                                   │
│  ├── Configure system settings                                               │
│  ├── Access all modules                                                      │
│  └── Override workflow approvals                                             │
│                                                                              │
│  CONTENT_ADMIN                                                               │
│  ├── Create/Edit/Delete questions (all modules)                              │
│  ├── Bulk import questions                                                   │
│  ├── Approve/Reject reviews (not own questions)                              │
│  ├── Publish questions (bypass review if needed)                             │
│  └── View analytics                                                          │
│                                                                              │
│  MODULE_EXPERT (NEW - Scalable for large teams)                              │
│  ├── Create/Edit questions (assigned modules only)                           │
│  ├── Submit for review                                                       │
│  ├── View own questions' analytics                                           │
│  └── Cannot publish directly                                                 │
│                                                                              │
│  REVIEWER                                                                    │
│  ├── View all questions                                                      │
│  ├── Approve/Reject pending reviews                                          │
│  ├── Add review comments                                                     │
│  └── Cannot create/edit questions                                            │
│                                                                              │
│  ANALYTICS_VIEWER (NEW - For stakeholders)                                   │
│  ├── View analytics dashboards                                               │
│  ├── Export reports                                                          │
│  └── Read-only access to questions                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ASYNC JOB QUEUE FOR BULK OPERATIONS

### 4.1 Why Async Processing?

Synchronous bulk operations cause:
- Request timeouts (500+ questions)
- Poor user experience (blocking UI)
- No progress visibility
- Difficult error recovery

### 4.2 Job Queue Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BULK IMPORT JOB FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. UPLOAD                  2. QUEUE                    3. PROCESS          │
│   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│   │   Admin     │──────────▶│   Job       │──────────▶│   Worker    │       │
│   │  Uploads    │  Create   │   Queue     │  Pick up  │   Process   │       │
│   │   File      │   Job     │  (Redis)    │   Job     │   Rows      │       │
│   └─────────────┘           └─────────────┘           └──────┬──────┘       │
│         │                         ▲                          │              │
│         │                         │                          │              │
│         ▼                         │ Status Updates           ▼              │
│   ┌─────────────┐           ┌─────┴───────┐           ┌─────────────┐       │
│   │  Return     │           │   Progress  │◀──────────│  Validate   │       │
│   │  Job ID     │           │   Tracker   │  Report   │  & Insert   │       │
│   │  Immediate  │           │  (Redis)    │  Progress │  Questions  │       │
│   └─────────────┘           └─────────────┘           └─────────────┘       │
│         │                         │                          │              │
│         ▼                         ▼                          ▼              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                     REAL-TIME PROGRESS UI                        │       │
│   │  ┌──────────────────────────────────────────────────────────┐   │       │
│   │  │  Import Progress: 847 / 1000 questions                    │   │       │
│   │  │  ████████████████████████░░░░░░░░░░  84.7%                │   │       │
│   │  │  ✓ Valid: 823  ⚠ Warnings: 15  ✗ Errors: 9               │   │       │
│   │  │  Estimated time remaining: 45 seconds                     │   │       │
│   │  └──────────────────────────────────────────────────────────┘   │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Job States

```typescript
enum JobStatus {
  PENDING = 'pending',           // Queued, waiting for worker
  VALIDATING = 'validating',     // Parsing and validating file
  PROCESSING = 'processing',     // Inserting records
  COMPLETED = 'completed',       // Successfully finished
  COMPLETED_WITH_ERRORS = 'completed_with_errors',  // Partial success
  FAILED = 'failed',             // Critical failure
  CANCELLED = 'cancelled',       // User cancelled
}

interface ImportJob {
  job_id: string;
  admin_id: string;
  file_name: string;
  status: JobStatus;
  progress: {
    total_rows: number;
    processed: number;
    successful: number;
    warnings: number;
    errors: number;
  };
  validation_report: ValidationError[];
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  result_question_ids?: string[];
}
```

---

## 5. VALIDATION PIPELINE (Pluggable Architecture)

### 5.1 Validation Chain Pattern

Instead of monolithic validation, use composable validators:

```typescript
// Validation Pipeline
interface Validator {
  name: string;
  priority: number;        // Execution order
  type: 'sync' | 'async';
  validate(question: QuestionInput, context: ValidationContext): ValidationResult;
}

// Built-in Validators
const validators: Validator[] = [
  // Priority 1: Schema Validation (fast, sync)
  {
    name: 'schema',
    priority: 1,
    type: 'sync',
    validate: (q) => validateSchema(q)  // Joi/Zod schema check
  },

  // Priority 2: Business Rules (sync)
  {
    name: 'business_rules',
    priority: 2,
    type: 'sync',
    validate: (q) => {
      // MCQ must have correct answer in options
      // Micro-skill must belong to module
      // Difficulty must be 1-10
    }
  },

  // Priority 3: Duplicate Detection (async - DB lookup)
  {
    name: 'duplicate_check',
    priority: 3,
    type: 'async',
    validate: async (q) => {
      // Check for similar question text (fuzzy match)
      // Check for exact question_code collision
    }
  },

  // Priority 4: Content Quality (async - AI check)
  {
    name: 'content_quality',
    priority: 4,
    type: 'async',
    validate: async (q) => {
      // Check for profanity
      // Check for minimum quality (optional AI analysis)
    }
  },

  // Priority 5: Cross-Reference (async)
  {
    name: 'cross_reference',
    priority: 5,
    type: 'async',
    validate: async (q) => {
      // Validate prerequisites exist
      // Check module/micro-skill IDs are valid
    }
  }
];

// Extensibility: Add custom validators
validationPipeline.register({
  name: 'custom_exam_rules',
  priority: 6,
  type: 'sync',
  validate: (q) => customExamValidation(q)
});
```

### 5.2 Validation Result Structure

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];      // Must fix
  warnings: ValidationIssue[];    // Can proceed with caution
  suggestions: ValidationIssue[]; // Optional improvements
}

interface ValidationIssue {
  code: string;              // 'DUPLICATE_DETECTED', 'INVALID_MODULE'
  field: string;             // 'question_data.correct_answer'
  message: string;           // Human-readable message
  severity: 'error' | 'warning' | 'suggestion';
  row?: number;              // For bulk imports
  suggestion?: string;       // Auto-fix suggestion
}
```

---

## 6. SEARCH ARCHITECTURE (Elasticsearch)

### 6.1 Why Elasticsearch?

MongoDB text search limitations:
- No fuzzy matching
- Limited relevance scoring
- Poor performance on large datasets
- No stemming or synonyms

Elasticsearch provides:
- Full-text search with relevance scoring
- Fuzzy matching ("mutliplication" → "multiplication")
- Faceted search (filter by module, difficulty, type)
- Auto-complete suggestions
- Search analytics

### 6.2 Search Index Design

```typescript
// Elasticsearch Index Mapping
const questionIndex = {
  settings: {
    analysis: {
      analyzer: {
        question_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'stemmer', 'synonym']
        }
      },
      filter: {
        synonym: {
          type: 'synonym',
          synonyms: [
            'multiply, times, product',
            'divide, division, quotient',
            'add, sum, plus',
            'subtract, minus, difference'
          ]
        }
      }
    }
  },
  mappings: {
    properties: {
      question_code: { type: 'keyword' },
      question_text: {
        type: 'text',
        analyzer: 'question_analyzer',
        fields: {
          keyword: { type: 'keyword' }  // For exact match
        }
      },
      module_id: { type: 'integer' },
      module_name: { type: 'keyword' },
      micro_skill_id: { type: 'integer' },
      micro_skill_name: { type: 'keyword' },
      question_type: { type: 'keyword' },
      difficulty_level: { type: 'integer' },
      tags: { type: 'keyword' },
      status: { type: 'keyword' },
      created_at: { type: 'date' },
      created_by: { type: 'keyword' },
      success_rate: { type: 'float' },    // For quality filtering
      total_attempts: { type: 'integer' }
    }
  }
};
```

### 6.3 Search Features

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEARCH CAPABILITIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FULL-TEXT SEARCH                                                │
│  ├── "multiplication 9s trick" → Finds relevant questions       │
│  ├── Typo tolerance: "mulitplication" → "multiplication"        │
│  └── Synonym matching: "times" → "multiply"                     │
│                                                                  │
│  FACETED FILTERING                                               │
│  ├── Module: [Speed Multiplication] [Percentage]                 │
│  ├── Difficulty: [1-3 Easy] [4-6 Medium] [7-10 Hard]            │
│  ├── Type: [MCQ] [Numerical] [Text]                             │
│  ├── Status: [Active] [Draft] [Archived]                        │
│  └── Quality: [High Success Rate] [Needs Review]                │
│                                                                  │
│  AUTO-COMPLETE                                                   │
│  ├── As-you-type suggestions                                     │
│  └── Popular search terms                                        │
│                                                                  │
│  ADVANCED QUERIES                                                │
│  ├── "module:3 AND difficulty:>5 AND status:active"             │
│  └── "created_by:admin123 AND created_at:[2024-01-01 TO now]"   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CACHING STRATEGY

### 7.1 Multi-Layer Cache

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CACHING ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: BROWSER CACHE (Static Assets)                                      │
│  ├── JS/CSS bundles with content hash                                        │
│  ├── Images and icons                                                        │
│  └── TTL: Indefinite (cache-busting via hash)                               │
│                                                                              │
│  Layer 2: CDN CACHE (Optional for production)                                │
│  ├── Static assets                                                           │
│  ├── Public API responses                                                    │
│  └── TTL: Hours to days                                                      │
│                                                                              │
│  Layer 3: APPLICATION CACHE (Redis)                                          │
│  ├── Session tokens                                                          │
│  ├── Module/Micro-skill reference data (rarely changes)                      │
│  ├── Search results (short TTL)                                              │
│  ├── Permission policies (medium TTL)                                        │
│  └── TTL: Seconds to hours (varies by data type)                            │
│                                                                              │
│  Layer 4: DATABASE CACHE (MongoDB)                                           │
│  ├── Frequently accessed questions                                           │
│  ├── Query result caching                                                    │
│  └── Connection pooling                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Cache Invalidation Strategy

```typescript
// Event-driven cache invalidation
eventBus.on('question.updated', async (event) => {
  await cache.delete(`question:${event.aggregate_id}`);
  await cache.delete(`questions:module:${event.payload.module_id}`);
  await searchIndex.update(event.aggregate_id, event.payload);
});

eventBus.on('question.status_changed', async (event) => {
  await cache.deletePattern(`questions:list:*`);  // Invalidate list caches
});
```

---

## 8. EXTENSIBILITY: PLUGIN ARCHITECTURE

### 8.1 Hook System

```typescript
// Define extension points (hooks)
interface AdminHooks {
  // Question Lifecycle Hooks
  'question:beforeCreate': (data: QuestionInput) => QuestionInput | void;
  'question:afterCreate': (question: Question) => void;
  'question:beforeUpdate': (id: string, data: Partial<QuestionInput>) => Partial<QuestionInput> | void;
  'question:afterUpdate': (question: Question) => void;
  'question:beforeDelete': (id: string) => boolean;  // Return false to prevent
  'question:afterDelete': (id: string) => void;

  // Import Hooks
  'import:beforeValidation': (rows: any[]) => any[];
  'import:afterValidation': (results: ValidationResult[]) => void;
  'import:beforeInsert': (questions: QuestionInput[]) => QuestionInput[];
  'import:afterComplete': (job: ImportJob) => void;

  // Review Hooks
  'review:beforeApprove': (questionId: string, reviewerId: string) => boolean;
  'review:afterApprove': (question: Question) => void;

  // Custom Validators
  'validation:register': () => Validator;
}

// Plugin Registration
class PluginManager {
  private hooks: Map<string, Function[]> = new Map();

  register(hookName: keyof AdminHooks, callback: Function) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(callback);
  }

  async execute(hookName: keyof AdminHooks, ...args: any[]) {
    const callbacks = this.hooks.get(hookName) || [];
    let result = args[0];
    for (const callback of callbacks) {
      const hookResult = await callback(...args);
      if (hookResult !== undefined) {
        result = hookResult;
      }
    }
    return result;
  }
}

// Example Plugin: Auto-Tag Generator
pluginManager.register('question:beforeCreate', (data) => {
  // Auto-generate tags from question text
  const autoTags = extractKeywords(data.question_data.text);
  return {
    ...data,
    metadata: {
      ...data.metadata,
      tags: [...(data.metadata.tags || []), ...autoTags]
    }
  };
});

// Example Plugin: External Notification
pluginManager.register('review:afterApprove', async (question) => {
  await slackNotify(`Question ${question.question_code} approved!`);
});
```

---

## 9. API DESIGN: REST + GraphQL

### 9.1 Hybrid API Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                     API ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  REST API (/api/v1/admin/*)                                      │
│  ├── CRUD operations                                             │
│  ├── File uploads                                                │
│  ├── Simple queries                                              │
│  └── Webhook integrations                                        │
│                                                                  │
│  GraphQL API (/api/v1/admin/graphql)                             │
│  ├── Complex queries (flexible field selection)                  │
│  ├── Nested data fetching (question + module + reviews)          │
│  ├── Real-time subscriptions (job progress)                      │
│  └── Admin dashboard data aggregation                            │
│                                                                  │
│  Why Both?                                                       │
│  ├── REST: Simpler for standard operations, better caching       │
│  ├── GraphQL: Flexible for complex admin UI needs                │
│  └── Gradual adoption: Start with REST, add GraphQL later        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 GraphQL Schema (Future Enhancement)

```graphql
type Query {
  questions(
    filter: QuestionFilter
    pagination: Pagination
    sort: QuestionSort
  ): QuestionConnection!

  question(id: ID!): Question

  questionAnalytics(
    moduleId: Int
    dateRange: DateRange
  ): QuestionAnalytics!

  importJob(id: ID!): ImportJob

  reviewQueue(status: ReviewStatus): [Question!]!
}

type Mutation {
  createQuestion(input: CreateQuestionInput!): Question!
  updateQuestion(id: ID!, input: UpdateQuestionInput!): Question!
  deleteQuestion(id: ID!): Boolean!

  submitForReview(id: ID!): Question!
  approveQuestion(id: ID!, comment: String): Question!
  rejectQuestion(id: ID!, reason: String!): Question!

  startImportJob(file: Upload!): ImportJob!
  cancelImportJob(id: ID!): ImportJob!
}

type Subscription {
  importJobProgress(jobId: ID!): ImportJobProgress!
  questionUpdated(moduleId: Int): Question!
}
```

---

## 10. REVISED FILE STRUCTURE

```
src/
├── admin/                              # Admin Module (Modular Monolith)
│   │
│   ├── modules/                        # Domain Modules
│   │   ├── question/
│   │   │   ├── question.controller.ts
│   │   │   ├── question.service.ts
│   │   │   ├── question.repository.ts
│   │   │   ├── question.validator.ts
│   │   │   ├── question.events.ts
│   │   │   └── dto/
│   │   │       ├── create-question.dto.ts
│   │   │       └── update-question.dto.ts
│   │   │
│   │   ├── import/
│   │   │   ├── import.controller.ts
│   │   │   ├── import.service.ts
│   │   │   ├── import.worker.ts         # Background job processor
│   │   │   ├── parsers/
│   │   │   │   ├── csv.parser.ts
│   │   │   │   ├── excel.parser.ts
│   │   │   │   └── json.parser.ts
│   │   │   └── mappers/
│   │   │       └── column.mapper.ts
│   │   │
│   │   ├── review/
│   │   │   ├── review.controller.ts
│   │   │   ├── review.service.ts
│   │   │   ├── review.workflow.ts       # State machine
│   │   │   └── review.events.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── aggregations/
│   │   │
│   │   └── auth/
│   │       ├── admin-auth.controller.ts
│   │       ├── admin-auth.service.ts
│   │       └── policies/
│   │           └── permission.policies.ts
│   │
│   ├── shared/                          # Shared Infrastructure
│   │   ├── events/
│   │   │   ├── event-bus.ts
│   │   │   ├── event-store.ts
│   │   │   └── projections/
│   │   │
│   │   ├── jobs/
│   │   │   ├── job-queue.ts
│   │   │   └── job-scheduler.ts
│   │   │
│   │   ├── cache/
│   │   │   └── cache.service.ts
│   │   │
│   │   ├── search/
│   │   │   ├── search.service.ts
│   │   │   └── indexer.ts
│   │   │
│   │   ├── validation/
│   │   │   ├── validation-pipeline.ts
│   │   │   └── validators/
│   │   │
│   │   └── plugins/
│   │       └── plugin-manager.ts
│   │
│   ├── middleware/
│   │   ├── admin-auth.middleware.ts
│   │   ├── permission.middleware.ts
│   │   └── audit.middleware.ts
│   │
│   └── routes/
│       └── admin.routes.ts              # Aggregates all admin routes
│
├── models/
│   ├── admin.model.ts                   # Admin user
│   ├── question-event.model.ts          # Event sourcing
│   ├── import-job.model.ts              # Import tracking
│   └── ... (existing models)
│
└── ...

client/src/
├── admin/                               # Admin Frontend
│   ├── App.tsx                          # Admin app entry
│   ├── routes.tsx
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── questions/
│   │   │   ├── QuestionListPage.tsx
│   │   │   ├── QuestionFormPage.tsx
│   │   │   └── QuestionPreviewPage.tsx
│   │   ├── import/
│   │   │   └── BulkUploadPage.tsx
│   │   ├── review/
│   │   │   └── ReviewQueuePage.tsx
│   │   └── analytics/
│   │       └── AnalyticsDashboardPage.tsx
│   │
│   ├── components/
│   │   ├── question-form/
│   │   │   ├── QuestionForm.tsx
│   │   │   ├── OptionsEditor.tsx
│   │   │   ├── SolutionStepsEditor.tsx
│   │   │   └── HintsEditor.tsx
│   │   ├── import/
│   │   │   ├── FileDropzone.tsx
│   │   │   ├── ColumnMapper.tsx
│   │   │   ├── ValidationReport.tsx
│   │   │   └── ImportProgress.tsx
│   │   └── common/
│   │       ├── DataTable.tsx
│   │       ├── FilterPanel.tsx
│   │       └── SearchBar.tsx
│   │
│   ├── hooks/
│   │   ├── useQuestions.ts
│   │   ├── useImportJob.ts
│   │   └── usePermissions.ts
│   │
│   ├── services/
│   │   └── admin-api.service.ts
│   │
│   └── context/
│       └── AdminAuthContext.tsx
│
└── ...
```

---

## 11. IMPLEMENTATION PHASES (Revised)

### Phase 1: Foundation (MVP) - Core CRUD
- [ ] Admin model & authentication (separate from user auth)
- [ ] Question CRUD with validation pipeline
- [ ] Event sourcing for audit trail
- [ ] Basic question listing with filters
- [ ] Single question form UI

### Phase 2: Bulk Operations
- [ ] Async job queue (Redis + Bull)
- [ ] CSV/Excel parsers
- [ ] Column mapping UI
- [ ] Validation report UI
- [ ] Real-time progress tracking

### Phase 3: Search & Performance
- [ ] Elasticsearch integration
- [ ] Full-text search with facets
- [ ] Redis caching layer
- [ ] Performance optimization

### Phase 4: Review Workflow
- [ ] State machine for question lifecycle
- [ ] Review queue UI
- [ ] Comments & feedback system
- [ ] Email/Slack notifications (plugin)

### Phase 5: Analytics & Extensibility
- [ ] Analytics dashboard
- [ ] Coverage gap analysis
- [ ] Plugin architecture (hooks)
- [ ] GraphQL API (optional)

---

## 12. DECISION MATRIX

| Decision | Options | Recommendation | Rationale |
|----------|---------|----------------|-----------|
| Architecture | Monolith vs Microservices | **Modular Monolith** | Small team, faster development, future extraction possible |
| Authorization | Simple RBAC vs Policy-as-Code | **Policy-as-Code** | Extensible, audit-friendly, supports complex rules |
| Bulk Processing | Sync vs Async | **Async Job Queue** | Better UX, handles large files, progress tracking |
| Audit Logging | Basic logs vs Event Sourcing | **Event Sourcing** | Full traceability, time-travel, compliance ready |
| Search | MongoDB text vs Elasticsearch | **Elasticsearch** | Full-text, fuzzy, faceted search |
| API | REST vs GraphQL | **REST + GraphQL** | REST for simplicity, GraphQL for complex queries |
| Admin UI | Integrated vs Separate App | **Separate App** | Clean separation, independent deployment |

---

## 13. QUESTIONS RESOLVED

Based on industry best practices:

1. **Admin Roles**: Use 5 roles (SUPER_ADMIN, CONTENT_ADMIN, MODULE_EXPERT, REVIEWER, ANALYTICS_VIEWER) for scalability
2. **Review Workflow**: Yes, implement state machine with approval workflow
3. **Bulk Upload**: Start with CSV (simpler), add Excel later
4. **Separate App**: Yes, separate React app for clean architecture
5. **Question Versioning**: Event Sourcing provides full history without explicit versioning
6. **Common Errors**: Initially admin-defined, later auto-populated from analytics
7. **Prerequisites**: Soft validation (warning) during creation, not blocking

---

*Document Version: 2.0*
*Created: January 2026*
*Based on: Industry Best Practices Research 2024-2025*
