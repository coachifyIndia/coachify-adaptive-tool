# Admin Dashboard Architecture

## Executive Summary

This document outlines the architecture for the Coachify Admin Dashboard, focusing on question management functionality. The admin dashboard will enable administrators to upload, edit, review, and manage questions across all 21 modules and 74 micro-skills.

---

## 1. CURRENT STATE ANALYSIS

### Existing Question Schema Structure

```
Question
├── Identifiers
│   ├── question_code (unique): M{module_id}_MS{micro_skill_id}_Q{number}
│   ├── module_id: 0-20 (21 modules)
│   └── micro_skill_id: 1-74 (74 micro-skills)
│
├── Question Data
│   ├── text: String (the question)
│   ├── type: NUMERICAL_INPUT | TEXT_INPUT | MCQ | TRUE_FALSE
│   ├── options[]: For MCQ (min 2 options)
│   ├── correct_answer: String | Number | Array
│   ├── solution_steps[]: { step, action, calculation, result }
│   └── hints[]: { level: 1-3, text } (max 3)
│
├── Metadata
│   ├── difficulty_level: 1-10
│   ├── expected_time_seconds: min 10
│   ├── points: Number
│   ├── tags[]: String array
│   ├── prerequisites[]: String array
│   └── common_errors[]: { type, frequency, description }
│
├── Performance (auto-calculated)
│   ├── total_attempts
│   ├── success_rate: 0-1
│   ├── avg_hints_used
│   └── abandon_rate: 0-1
│
└── Status: ACTIVE | DRAFT | ARCHIVED
```

### Module & Micro-Skill Distribution

| Module Range | Count | Micro-Skills | Estimated Questions |
|--------------|-------|--------------|---------------------|
| Beginner (0-2, 9-12, 15-17, 20) | 11 | 32 | ~1,200 |
| Intermediate (3-5, 8, 13-14, 18) | 7 | 30 | ~1,400 |
| Advanced (6-7, 19) | 3 | 12 | ~500 |
| **Total** | **21** | **74** | **~3,100** |

---

## 2. ADMIN DASHBOARD ARCHITECTURE

### 2.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN DASHBOARD                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Question   │  │   Bulk       │  │   Analytics  │               │
│  │   Manager    │  │   Upload     │  │   Dashboard  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│  ┌──────┴─────────────────┴─────────────────┴───────┐               │
│  │              Admin API Layer (/api/v1/admin)      │               │
│  └──────────────────────┬────────────────────────────┘               │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────────────┐
│                         ▼                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Backend Services                          │    │
│  ├─────────────────┬─────────────────┬─────────────────────────┤    │
│  │  Question       │  Validation     │  Import/Export          │    │
│  │  Service        │  Service        │  Service                │    │
│  └────────┬────────┴────────┬────────┴────────┬────────────────┘    │
│           │                 │                 │                      │
│  ┌────────┴─────────────────┴─────────────────┴────────────────┐    │
│  │                     MongoDB Database                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │    │
│  │  │Questions │  │ Modules  │  │  Users   │  │ Sessions │     │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                         BACKEND                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Authentication & Authorization

```
┌─────────────────────────────────────────┐
│           Admin Role System             │
├─────────────────────────────────────────┤
│                                         │
│  SUPER_ADMIN                            │
│  ├── All permissions                    │
│  ├── Manage other admins                │
│  └── Delete questions permanently       │
│                                         │
│  CONTENT_ADMIN                          │
│  ├── Create/Edit questions              │
│  ├── Review & approve drafts            │
│  ├── Bulk upload questions              │
│  └── View analytics                     │
│                                         │
│  CONTENT_REVIEWER                       │
│  ├── Review questions (read-only)       │
│  ├── Approve/Reject drafts              │
│  └── Add comments/feedback              │
│                                         │
└─────────────────────────────────────────┘
```

---

## 3. ADMIN API ENDPOINTS

### 3.1 Question Management APIs

```
BASE: /api/v1/admin

Authentication & Admin Management
├── POST   /auth/login              - Admin login
├── POST   /auth/logout             - Admin logout
├── GET    /auth/me                 - Get current admin profile
└── PUT    /auth/password           - Change password

Question CRUD Operations
├── GET    /questions               - List questions (paginated, filtered)
├── GET    /questions/:id           - Get single question details
├── POST   /questions               - Create new question
├── PUT    /questions/:id           - Update question
├── DELETE /questions/:id           - Soft delete (archive) question
└── PATCH  /questions/:id/status    - Change status (DRAFT → ACTIVE → ARCHIVED)

Bulk Operations
├── POST   /questions/bulk          - Bulk create questions (JSON)
├── POST   /questions/import/csv    - Import from CSV file
├── POST   /questions/import/excel  - Import from Excel file
├── GET    /questions/export        - Export questions (CSV/Excel/JSON)
└── POST   /questions/validate      - Validate questions without saving

Module & Micro-Skill Reference
├── GET    /modules                 - List all modules
├── GET    /modules/:id             - Get module details with micro-skills
├── GET    /modules/:id/micro-skills - Get micro-skills for a module
└── GET    /micro-skills/:id        - Get micro-skill details

Analytics & Reporting
├── GET    /analytics/questions     - Question performance stats
├── GET    /analytics/modules       - Module-level stats
├── GET    /analytics/coverage      - Question coverage gaps
└── GET    /analytics/quality       - Quality metrics (low success rate, high abandon)

Review Workflow
├── GET    /review/pending          - Questions pending review
├── POST   /review/:id/approve      - Approve draft question
├── POST   /review/:id/reject       - Reject with feedback
└── GET    /review/history          - Review activity log
```

### 3.2 Query Parameters for GET /questions

```
Pagination:
  ?page=1&limit=20

Filtering:
  ?module_id=3
  ?micro_skill_id=12
  ?difficulty_min=1&difficulty_max=5
  ?type=MCQ
  ?status=ACTIVE
  ?tags=mental_math,addition
  ?search=multiply          (text search in question)

Sorting:
  ?sort=created_at&order=desc
  ?sort=difficulty_level&order=asc
  ?sort=success_rate&order=asc   (show struggling questions first)

Combined Example:
  GET /api/v1/admin/questions?module_id=3&status=DRAFT&page=1&limit=20&sort=created_at&order=desc
```

---

## 4. FRONTEND ARCHITECTURE

### 4.1 Admin Dashboard Pages

```
/admin
├── /login                    - Admin authentication
├── /dashboard                - Overview & quick stats
│
├── /questions                - Question management
│   ├── /list                 - Browse/search questions
│   ├── /create               - Create new question
│   ├── /edit/:id             - Edit existing question
│   ├── /preview/:id          - Preview question (student view)
│   └── /bulk-upload          - Bulk upload interface
│
├── /modules                  - Module overview
│   └── /:id                  - Module detail with micro-skills
│
├── /review                   - Review workflow
│   ├── /pending              - Questions awaiting review
│   └── /history              - Past reviews
│
├── /analytics                - Analytics & reports
│   ├── /coverage             - Question coverage map
│   ├── /performance          - Question performance
│   └── /quality              - Quality issues
│
└── /settings                 - Admin settings
    └── /admins               - Manage admin users (super admin only)
```

### 4.2 Key UI Components

```
Question Form Components
├── QuestionTypeSelector      - Radio buttons for question type
├── QuestionTextEditor        - Rich text editor for question
├── OptionsEditor             - Dynamic options for MCQ
├── AnswerInput               - Context-aware answer input
├── SolutionStepsEditor       - Step-by-step solution builder
├── HintsEditor               - Up to 3 hints with levels
├── MetadataPanel             - Difficulty, time, points, tags
├── PrerequisitesSelector     - Select prerequisite questions
├── CommonErrorsEditor        - Define common mistakes
└── PreviewPanel              - Live preview of question

Bulk Upload Components
├── FileDropzone              - Drag & drop CSV/Excel
├── ColumnMapper              - Map file columns to schema
├── ValidationReport          - Show errors before import
├── ImportProgress            - Progress bar with status
└── ImportSummary             - Results after import

List & Filter Components
├── QuestionTable             - Paginated table with actions
├── FilterPanel               - Module, skill, difficulty filters
├── SearchBar                 - Full-text search
├── StatusBadge               - ACTIVE/DRAFT/ARCHIVED indicators
├── BulkActionBar             - Select & perform bulk actions
└── QuickStats                - Summary counts & charts
```

---

## 5. DATA VALIDATION RULES

### 5.1 Question Validation Schema

```typescript
// Validation rules for question creation/update

const questionValidation = {
  // Required fields
  module_id: {
    required: true,
    type: 'number',
    min: 0,
    max: 20,
    message: 'Module ID must be between 0-20'
  },

  micro_skill_id: {
    required: true,
    type: 'number',
    min: 1,
    max: 74,
    validate: (value, data) => {
      // Must belong to the selected module
      return isValidMicroSkillForModule(value, data.module_id);
    },
    message: 'Micro-skill must belong to selected module'
  },

  'question_data.text': {
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 2000,
    message: 'Question text must be 10-2000 characters'
  },

  'question_data.type': {
    required: true,
    enum: ['NUMERICAL_INPUT', 'TEXT_INPUT', 'MCQ', 'TRUE_FALSE'],
    message: 'Invalid question type'
  },

  'question_data.options': {
    required: (data) => data.question_data.type === 'MCQ',
    minItems: 2,
    maxItems: 6,
    message: 'MCQ must have 2-6 options'
  },

  'question_data.correct_answer': {
    required: true,
    validate: (value, data) => {
      // For MCQ, answer must be one of the options
      if (data.question_data.type === 'MCQ') {
        return data.question_data.options.includes(value);
      }
      return value !== undefined && value !== '';
    },
    message: 'Valid answer is required'
  },

  'question_data.solution_steps': {
    required: true,
    minItems: 1,
    maxItems: 10,
    itemValidation: {
      step: { required: true, type: 'number', min: 1 },
      action: { required: true, type: 'string', minLength: 5 },
      calculation: { required: true, type: 'string' },
      result: { required: true }
    },
    message: 'At least one solution step is required'
  },

  'question_data.hints': {
    required: false,
    maxItems: 3,
    itemValidation: {
      level: { required: true, type: 'number', min: 1, max: 3 },
      text: { required: true, type: 'string', minLength: 10 }
    },
    message: 'Maximum 3 hints allowed'
  },

  'metadata.difficulty_level': {
    required: true,
    type: 'number',
    min: 1,
    max: 10,
    message: 'Difficulty must be 1-10'
  },

  'metadata.expected_time_seconds': {
    required: true,
    type: 'number',
    min: 10,
    max: 600,
    message: 'Expected time must be 10-600 seconds'
  },

  'metadata.points': {
    required: true,
    type: 'number',
    min: 1,
    max: 100,
    message: 'Points must be 1-100'
  },

  status: {
    default: 'DRAFT',
    enum: ['DRAFT', 'ACTIVE', 'ARCHIVED']
  }
};
```

### 5.2 Bulk Upload Validation

```typescript
// Additional validations for bulk upload

const bulkValidation = {
  // Duplicate detection
  duplicateCheck: {
    fields: ['module_id', 'micro_skill_id', 'question_data.text'],
    action: 'warn',  // 'warn' | 'skip' | 'error'
    message: 'Possible duplicate question detected'
  },

  // Question code generation
  questionCode: {
    autoGenerate: true,
    format: 'M{module_id}_MS{micro_skill_id}_Q{auto_increment}'
  },

  // Batch limits
  batchLimits: {
    maxQuestionsPerUpload: 500,
    maxFileSizeMB: 10
  }
};
```

---

## 6. BULK UPLOAD SPECIFICATIONS

### 6.1 CSV/Excel Template Format

```csv
module_id,micro_skill_id,question_text,question_type,options,correct_answer,solution_steps,hints,difficulty,expected_time,points,tags
3,12,"What is 25 × 9?",NUMERICAL_INPUT,,225,"[{""step"":1,""action"":""Use 9s trick"",""calculation"":""25×10-25"",""result"":""250-25=225""}]","[{""level"":1,""text"":""Multiply by 10 and subtract""}]",2,30,10,"multiplication,9s_trick"
3,12,"Select the result of 18 × 9",MCQ,"162|172|152|182",162,"[{""step"":1,""action"":""Apply formula"",""calculation"":""18×10-18"",""result"":""180-18=162""}]",,3,45,15,"multiplication,mcq"
```

### 6.2 Column Mapping

| CSV Column | Schema Path | Required | Notes |
|------------|-------------|----------|-------|
| module_id | module_id | Yes | 0-20 |
| micro_skill_id | micro_skill_id | Yes | 1-74, must match module |
| question_text | question_data.text | Yes | The question |
| question_type | question_data.type | Yes | NUMERICAL_INPUT, TEXT_INPUT, MCQ, TRUE_FALSE |
| options | question_data.options | If MCQ | Pipe-separated: "A\|B\|C\|D" |
| correct_answer | question_data.correct_answer | Yes | Must match option for MCQ |
| solution_steps | question_data.solution_steps | Yes | JSON array |
| hints | question_data.hints | No | JSON array, max 3 |
| difficulty | metadata.difficulty_level | Yes | 1-10 |
| expected_time | metadata.expected_time_seconds | Yes | Seconds (10-600) |
| points | metadata.points | Yes | 1-100 |
| tags | metadata.tags | No | Comma-separated |
| prerequisites | metadata.prerequisites | No | Comma-separated question codes |
| common_errors | metadata.common_errors | No | JSON array |

### 6.3 Import Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BULK IMPORT WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. FILE UPLOAD                                                  │
│     └── User uploads CSV/Excel file                              │
│         └── Client validates file type & size                    │
│                                                                  │
│  2. PARSING                                                      │
│     └── Server parses file                                       │
│         └── Extract rows & headers                               │
│                                                                  │
│  3. COLUMN MAPPING                                               │
│     └── Auto-detect or manual mapping                            │
│         └── User confirms column → field mapping                 │
│                                                                  │
│  4. VALIDATION (Row by Row)                                      │
│     ├── Required field checks                                    │
│     ├── Data type validation                                     │
│     ├── Range validation (module 0-20, difficulty 1-10)          │
│     ├── Cross-field validation (micro-skill belongs to module)  │
│     ├── Duplicate detection                                      │
│     └── Generate validation report                               │
│                                                                  │
│  5. PREVIEW                                                      │
│     └── Show validation results                                  │
│         ├── Valid rows: Ready to import                          │
│         ├── Warnings: Can proceed with caution                   │
│         └── Errors: Must fix before import                       │
│                                                                  │
│  6. IMPORT                                                       │
│     └── User confirms import                                     │
│         ├── Insert valid rows as DRAFT status                    │
│         ├── Generate question_code automatically                 │
│         └── Track import batch for rollback                      │
│                                                                  │
│  7. SUMMARY                                                      │
│     └── Show results                                             │
│         ├── Successfully imported: X                             │
│         ├── Skipped (duplicates): Y                              │
│         └── Failed (errors): Z                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. DATABASE SCHEMA ADDITIONS

### 7.1 Admin User Schema

```typescript
// New model: src/models/admin.model.ts

interface IAdmin {
  admin_id: string;           // ADM_XXXXXX
  email: string;              // Unique
  password: string;           // Hashed
  name: string;
  role: 'SUPER_ADMIN' | 'CONTENT_ADMIN' | 'CONTENT_REVIEWER';
  permissions: string[];      // Granular permissions
  status: 'ACTIVE' | 'INACTIVE';
  last_login: Date;
  created_by: string;         // admin_id of creator
  created_at: Date;
  updated_at: Date;
}
```

### 7.2 Import Batch Schema

```typescript
// New model: src/models/importBatch.model.ts

interface IImportBatch {
  batch_id: string;           // BATCH_XXXXXX
  admin_id: string;           // Who performed the import
  file_name: string;
  file_type: 'CSV' | 'EXCEL' | 'JSON';
  total_rows: number;
  successful: number;
  failed: number;
  skipped: number;
  question_ids: string[];     // IDs of created questions
  error_log: Array<{
    row: number;
    errors: string[];
  }>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  created_at: Date;
  completed_at: Date;
}
```

### 7.3 Question Audit Log

```typescript
// New model: src/models/questionAudit.model.ts

interface IQuestionAudit {
  audit_id: string;
  question_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'REVIEW';
  admin_id: string;
  previous_state: object;     // Before change
  new_state: object;          // After change
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  comment: string;            // Optional note
  created_at: Date;
}
```

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Authentication

```
┌─────────────────────────────────────────┐
│         Admin Authentication            │
├─────────────────────────────────────────┤
│                                         │
│  • Separate JWT tokens for admin        │
│  • Token expiry: 1 hour (shorter)       │
│  • Refresh token: 24 hours              │
│  • Rate limiting: 5 login attempts/min  │
│  • Account lockout after 5 failures     │
│  • Password requirements:               │
│    - Minimum 12 characters              │
│    - Must include: upper, lower,        │
│      number, special character          │
│  • Session tracking & forced logout     │
│                                         │
└─────────────────────────────────────────┘
```

### 8.2 Authorization Middleware

```typescript
// Middleware chain for admin routes

adminRoutes.use(
  authenticateAdmin,          // Verify JWT
  checkAdminStatus,           // Ensure account is ACTIVE
  checkPermission('resource:action'),  // RBAC check
  auditLog                    // Log all actions
);
```

### 8.3 Input Sanitization

```
• All text inputs sanitized (XSS prevention)
• File uploads scanned & validated
• SQL/NoSQL injection prevention
• Rate limiting on all endpoints
• Request size limits (10MB max)
```

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Foundation (MVP)
- [ ] Admin authentication (login/logout)
- [ ] Basic question CRUD (create, read, update, delete)
- [ ] Single question form with validation
- [ ] Question listing with basic filters
- [ ] Status management (DRAFT/ACTIVE/ARCHIVED)

### Phase 2: Bulk Operations
- [ ] CSV import functionality
- [ ] Excel import functionality
- [ ] Bulk validation engine
- [ ] Import progress tracking
- [ ] Export functionality

### Phase 3: Review Workflow
- [ ] Review queue for drafts
- [ ] Approve/Reject workflow
- [ ] Comments & feedback
- [ ] Audit logging

### Phase 4: Analytics & Reporting
- [ ] Question coverage dashboard
- [ ] Performance analytics
- [ ] Quality metrics
- [ ] Gap analysis reports

### Phase 5: Advanced Features
- [ ] Question versioning
- [ ] A/B testing for questions
- [ ] AI-assisted question generation
- [ ] Advanced duplicate detection

---

## 10. TECHNOLOGY STACK

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (separate from user auth)
- **File Processing**:
  - CSV: `papaparse`
  - Excel: `xlsx` or `exceljs`
- **Validation**: `joi` or `zod`

### Frontend
- **Framework**: React + TypeScript
- **Routing**: React Router
- **State Management**: React Query (for server state)
- **UI Components**: Tailwind CSS + Headless UI
- **Form Handling**: React Hook Form
- **Rich Text**: TipTap or Lexical
- **File Upload**: react-dropzone
- **Tables**: TanStack Table

### Infrastructure
- **File Storage**: Local (dev) / S3 (production)
- **Caching**: Redis (for import progress)
- **Logging**: Winston + audit trail

---

## 11. QUESTIONS FOR DISCUSSION

Before proceeding with implementation, please confirm:

1. **Admin Roles**: Do we need all three roles (SUPER_ADMIN, CONTENT_ADMIN, CONTENT_REVIEWER) or a simpler structure?

2. **Review Workflow**: Should questions require approval before becoming ACTIVE, or can admins directly publish?

3. **Bulk Upload Priority**: Should we prioritize CSV or Excel import first?

4. **Separate Admin UI**: Should the admin dashboard be a completely separate React app (different port/subdomain) or integrated into the existing client?

5. **Question Versioning**: Do we need to track version history of questions, or is audit logging sufficient?

6. **Common Errors Field**: Should admins define common_errors upfront, or should this be auto-populated from user data?

7. **Prerequisites**: How strictly should we enforce prerequisites during question creation?

---

## 12. FILE STRUCTURE (PROPOSED)

```
src/
├── admin/                          # Admin-specific code
│   ├── controllers/
│   │   ├── admin-auth.controller.ts
│   │   ├── question-admin.controller.ts
│   │   ├── import.controller.ts
│   │   └── analytics-admin.controller.ts
│   ├── routes/
│   │   ├── admin.routes.ts         # Main admin router
│   │   ├── question-admin.routes.ts
│   │   └── import.routes.ts
│   ├── services/
│   │   ├── question-admin.service.ts
│   │   ├── import.service.ts
│   │   ├── validation.service.ts
│   │   └── export.service.ts
│   ├── middlewares/
│   │   ├── admin-auth.middleware.ts
│   │   └── audit.middleware.ts
│   └── validators/
│       └── question.validator.ts
├── models/
│   ├── admin.model.ts              # New
│   ├── importBatch.model.ts        # New
│   └── questionAudit.model.ts      # New
└── ...

client/
├── src/
│   ├── admin/                      # Admin dashboard
│   │   ├── pages/
│   │   │   ├── AdminLoginPage.tsx
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── QuestionListPage.tsx
│   │   │   ├── QuestionFormPage.tsx
│   │   │   ├── BulkUploadPage.tsx
│   │   │   └── AnalyticsPage.tsx
│   │   ├── components/
│   │   │   ├── QuestionForm/
│   │   │   ├── BulkUpload/
│   │   │   ├── QuestionTable/
│   │   │   └── common/
│   │   ├── services/
│   │   │   └── admin.service.ts
│   │   └── context/
│   │       └── AdminAuthContext.tsx
│   └── ...
└── ...
```

---

## NEXT STEPS

Once architecture is approved:

1. Create admin models (Admin, ImportBatch, QuestionAudit)
2. Implement admin authentication
3. Build question CRUD APIs
4. Create admin frontend scaffolding
5. Implement question form UI
6. Add bulk upload functionality

---

*Document Version: 1.0*
*Created: January 2026*
*Author: Development Team*
