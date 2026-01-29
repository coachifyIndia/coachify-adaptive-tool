# Admin Dashboard Architecture v3.1
## Pragmatic + Extensible (Best of Both Worlds)

---

## Philosophy

> **"Make it work, make it right, make it fast"** - Kent Beck

v3.1 follows this principle:
1. **Make it work** - Use existing patterns, no new infrastructure
2. **Make it right** - Add extensibility points for future scaling
3. **Make it fast** - Optimize later when needed (not premature)

---

## Key Improvements Over v3

| Area | v3 | v3.1 | Why |
|------|-----|------|-----|
| Audit Trail | Array in document | Separate `QuestionAudit` collection | Prevents document bloat, easier querying |
| Bulk Import | Fully synchronous | Chunked processing with progress | Handles 1000+ questions without timeout |
| Search | Inline regex | Service abstraction | Easy to swap MongoDB → Elasticsearch later |
| Authorization | Inline role check | Policy service | Add complex rules without changing controllers |
| File Structure | Flat in existing folders | `src/admin/` subfolder | Clear module boundary |

---

## 1. FILE STRUCTURE (Modular but Simple)

```
src/
├── admin/                              # ← NEW: Admin module folder
│   ├── controllers/
│   │   └── admin.controller.ts
│   ├── services/
│   │   ├── question.service.ts         # Question CRUD
│   │   ├── import.service.ts           # Bulk import
│   │   ├── search.service.ts           # Search abstraction
│   │   └── policy.service.ts           # Authorization policies
│   ├── routes/
│   │   └── admin.routes.ts
│   ├── validators/
│   │   └── admin.validator.ts
│   ├── middlewares/
│   │   └── admin-auth.middleware.ts
│   └── index.ts                        # Export admin router
│
├── models/                             # Shared models (existing location)
│   ├── admin.model.ts                  # NEW
│   ├── questionAudit.model.ts          # NEW: Separate audit trail
│   ├── importBatch.model.ts            # NEW
│   └── ... (existing models)
│
└── server.ts                           # Mount admin routes

client/src/
├── admin/                              # ← NEW: Admin frontend
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   ├── services/
│   └── context/
└── main-admin.tsx                      # Separate entry point
```

**Why this structure?**
- `src/admin/` is a clear module boundary
- Can be extracted to separate service later if needed
- Doesn't pollute existing folders
- Easy for new developers to find admin code

---

## 2. AUDIT TRAIL (Separate Collection)

### Problem with v3
```typescript
// v3: Array in question document
{
  _id: "...",
  question_code: "M3_MS12_Q1",
  change_history: [
    { changed_by: "ADM_1", changed_at: "...", changes: {...} },
    { changed_by: "ADM_2", changed_at: "...", changes: {...} },
    // After 100 edits, document becomes huge!
  ]
}
```

### v3.1: Separate Audit Collection
```typescript
// src/models/questionAudit.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DELETED = 'deleted',
  BULK_IMPORTED = 'bulk_imported'
}

export interface IQuestionAudit extends Document {
  question_id: string;
  question_code: string;
  action: AuditAction;
  admin_id: string;
  admin_name: string;
  changes: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    batch_id?: string;  // For bulk imports
  };
  created_at: Date;
}

const QuestionAuditSchema = new Schema<IQuestionAudit>({
  question_id: { type: String, required: true, index: true },
  question_code: { type: String, required: true },
  action: { type: String, enum: Object.values(AuditAction), required: true },
  admin_id: { type: String, required: true, index: true },
  admin_name: { type: String, required: true },
  changes: [{
    field: String,
    old_value: Schema.Types.Mixed,
    new_value: Schema.Types.Mixed
  }],
  metadata: {
    ip_address: String,
    user_agent: String,
    batch_id: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }  // No updatedAt needed
});

// Index for common queries
QuestionAuditSchema.index({ question_id: 1, created_at: -1 });
QuestionAuditSchema.index({ admin_id: 1, created_at: -1 });
QuestionAuditSchema.index({ action: 1, created_at: -1 });

export const QuestionAuditModel = mongoose.model<IQuestionAudit>('QuestionAudit', QuestionAuditSchema);
```

### Audit Service
```typescript
// src/admin/services/audit.service.ts
import { QuestionAuditModel, AuditAction } from '../../models/questionAudit.model';

export async function logQuestionChange(
  questionId: string,
  questionCode: string,
  action: AuditAction,
  admin: { admin_id: string; name: string },
  changes: { field: string; old_value: any; new_value: any }[],
  metadata?: { ip_address?: string; user_agent?: string; batch_id?: string }
): Promise<void> {
  await QuestionAuditModel.create({
    question_id: questionId,
    question_code: questionCode,
    action,
    admin_id: admin.admin_id,
    admin_name: admin.name,
    changes,
    metadata
  });
}

export async function getQuestionHistory(questionId: string, limit = 50) {
  return QuestionAuditModel.find({ question_id: questionId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
}

export async function getAdminActivity(adminId: string, limit = 100) {
  return QuestionAuditModel.find({ admin_id: adminId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
}
```

**Benefits:**
- Question documents stay small
- Fast audit queries with proper indexes
- Can add retention policy (delete audits older than X months)
- Easy to export for compliance

---

## 3. BULK IMPORT (Chunked Processing)

### Problem with v3
```typescript
// v3: Process all rows in single request
// 1000 questions × 50ms each = 50 seconds → REQUEST TIMEOUT!
```

### v3.1: Chunked Processing with Progress

```typescript
// src/admin/services/import.service.ts
import { QuestionModel } from '../../models/question.model';
import { ImportBatchModel, ImportStatus } from '../../models/importBatch.model';
import { logQuestionChange } from './audit.service';
import Papa from 'papaparse';

const CHUNK_SIZE = 50;  // Process 50 questions at a time

export interface ImportProgress {
  batch_id: string;
  status: ImportStatus;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
}

/**
 * Start import and return batch ID immediately
 * Client polls for progress
 */
export async function startImport(
  content: string,
  fileType: 'csv' | 'json',
  fileName: string,
  adminId: string
): Promise<string> {
  // Parse file
  const rows = fileType === 'csv'
    ? parseCSV(content)
    : JSON.parse(content);

  // Create batch record
  const batch = await ImportBatchModel.create({
    admin_id: adminId,
    file_name: fileName,
    file_type: fileType,
    status: ImportStatus.PROCESSING,
    total_rows: rows.length,
    processed_rows: 0,
    successful: 0,
    failed: 0,
    started_at: new Date()
  });

  // Process in background (non-blocking)
  processImportAsync(batch.batch_id, rows, adminId).catch(err => {
    console.error(`Import ${batch.batch_id} failed:`, err);
  });

  return batch.batch_id;
}

/**
 * Async processing with chunking
 */
async function processImportAsync(
  batchId: string,
  rows: any[],
  adminId: string
): Promise<void> {
  const batch = await ImportBatchModel.findOne({ batch_id: batchId });
  if (!batch) throw new Error('Batch not found');

  const errors: any[] = [];
  const createdIds: string[] = [];
  let successful = 0;
  let failed = 0;

  // Process in chunks
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    // Process chunk
    for (let j = 0; j < chunk.length; j++) {
      const rowIndex = i + j;
      const result = await processRow(chunk[j], rowIndex, adminId, batchId);

      if (result.success) {
        successful++;
        createdIds.push(result.questionId!);
      } else {
        failed++;
        errors.push({ row: rowIndex + 1, ...result.error });
      }
    }

    // Update progress after each chunk
    await ImportBatchModel.updateOne(
      { batch_id: batchId },
      {
        processed_rows: Math.min(i + CHUNK_SIZE, rows.length),
        successful,
        failed
      }
    );

    // Small delay to prevent overwhelming DB
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Mark complete
  await ImportBatchModel.updateOne(
    { batch_id: batchId },
    {
      status: failed > 0 ? ImportStatus.COMPLETED_WITH_ERRORS : ImportStatus.COMPLETED,
      successful,
      failed,
      errors,
      created_question_ids: createdIds,
      completed_at: new Date()
    }
  );
}

/**
 * Get import progress (for polling)
 */
export async function getImportProgress(batchId: string): Promise<ImportProgress | null> {
  const batch = await ImportBatchModel.findOne({ batch_id: batchId }).lean();
  if (!batch) return null;

  return {
    batch_id: batch.batch_id,
    status: batch.status,
    total: batch.total_rows,
    processed: batch.processed_rows,
    successful: batch.successful,
    failed: batch.failed,
    percentage: batch.total_rows > 0
      ? Math.round((batch.processed_rows / batch.total_rows) * 100)
      : 0
  };
}
```

### Frontend Progress Polling
```typescript
// client/src/admin/hooks/useImportProgress.ts
import { useState, useEffect } from 'react';
import { adminService } from '../services/admin.service';

export function useImportProgress(batchId: string | null) {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    const poll = async () => {
      const data = await adminService.getImportProgress(batchId);
      setProgress(data);

      if (data?.status === 'completed' || data?.status === 'completed_with_errors' || data?.status === 'failed') {
        setIsComplete(true);
      }
    };

    poll(); // Initial fetch

    const interval = setInterval(() => {
      if (!isComplete) poll();
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [batchId, isComplete]);

  return { progress, isComplete };
}
```

**Benefits:**
- No request timeout (returns immediately)
- Real-time progress updates
- Can handle 10,000+ questions
- Easy to add cancel functionality later
- No Redis needed (uses MongoDB for state)

---

## 4. SEARCH SERVICE (Abstraction for Future)

### v3.1: Search Service Abstraction

```typescript
// src/admin/services/search.service.ts

export interface SearchOptions {
  query?: string;
  filters: {
    module_id?: number;
    micro_skill_id?: number;
    difficulty_min?: number;
    difficulty_max?: number;
    type?: string;
    status?: string;
    created_by?: string;
  };
  pagination: {
    page: number;
    limit: number;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Interface for search provider (allows swapping implementations)
export interface ISearchProvider {
  search(options: SearchOptions): Promise<SearchResult<any>>;
}

// MongoDB Implementation (default)
import { QuestionModel } from '../../models/question.model';

class MongoSearchProvider implements ISearchProvider {
  async search(options: SearchOptions): Promise<SearchResult<any>> {
    const query: any = {};

    // Build MongoDB query from filters
    if (options.filters.module_id !== undefined) {
      query.module_id = options.filters.module_id;
    }
    if (options.filters.micro_skill_id !== undefined) {
      query.micro_skill_id = options.filters.micro_skill_id;
    }
    if (options.filters.type) {
      query['question_data.type'] = options.filters.type;
    }
    if (options.filters.status) {
      query.status = options.filters.status;
    }
    if (options.filters.created_by) {
      query.created_by = options.filters.created_by;
    }

    // Difficulty range
    if (options.filters.difficulty_min || options.filters.difficulty_max) {
      query['metadata.difficulty_level'] = {};
      if (options.filters.difficulty_min) {
        query['metadata.difficulty_level'].$gte = options.filters.difficulty_min;
      }
      if (options.filters.difficulty_max) {
        query['metadata.difficulty_level'].$lte = options.filters.difficulty_max;
      }
    }

    // Text search (basic regex for now)
    if (options.query) {
      query['question_data.text'] = {
        $regex: options.query,
        $options: 'i'
      };
    }

    // Count total
    const total = await QuestionModel.countDocuments(query);

    // Sort
    const sortField = options.sort?.field || 'createdAt';
    const sortOrder = options.sort?.order === 'asc' ? 1 : -1;

    // Fetch
    const items = await QuestionModel.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((options.pagination.page - 1) * options.pagination.limit)
      .limit(options.pagination.limit)
      .lean();

    return {
      items,
      total,
      page: options.pagination.page,
      limit: options.pagination.limit,
      totalPages: Math.ceil(total / options.pagination.limit)
    };
  }
}

// Future: Elasticsearch Implementation
// class ElasticsearchProvider implements ISearchProvider {
//   async search(options: SearchOptions): Promise<SearchResult<any>> {
//     // Elasticsearch implementation
//   }
// }

// Export singleton (easy to swap later)
export const searchService: ISearchProvider = new MongoSearchProvider();

// To switch to Elasticsearch later:
// export const searchService: ISearchProvider = new ElasticsearchProvider();
```

**Benefits:**
- Controller doesn't know about MongoDB vs Elasticsearch
- Can swap search provider with one line change
- No code changes in controllers when upgrading
- Can A/B test different providers

---

## 5. POLICY SERVICE (Simple but Extensible)

### v3.1: Policy Service

```typescript
// src/admin/services/policy.service.ts
import { AdminRole } from '../../models/admin.model';

export interface PolicyContext {
  admin: {
    admin_id: string;
    role: AdminRole;
    assigned_modules?: number[];  // For MODULE_EXPERT role (future)
  };
  resource?: {
    type: string;
    id?: string;
    module_id?: number;
    created_by?: string;
  };
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

type PolicyRule = (context: PolicyContext) => PolicyResult;

// Policy definitions
const policies: Record<string, PolicyRule[]> = {
  // Question policies
  'question:create': [
    (ctx) => {
      if (['super_admin', 'content_admin'].includes(ctx.admin.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only content admins can create questions' };
    }
  ],

  'question:update': [
    (ctx) => {
      if (ctx.admin.role === 'super_admin') {
        return { allowed: true };
      }
      if (ctx.admin.role === 'content_admin') {
        return { allowed: true };
      }
      // Reviewers can only add comments, not edit
      if (ctx.admin.role === 'reviewer') {
        return { allowed: false, reason: 'Reviewers cannot edit questions' };
      }
      return { allowed: false, reason: 'Insufficient permissions' };
    }
  ],

  'question:delete': [
    (ctx) => {
      if (ctx.admin.role === 'super_admin') {
        return { allowed: true };
      }
      // Content admin can only delete their own drafts
      if (ctx.admin.role === 'content_admin') {
        if (ctx.resource?.created_by === ctx.admin.admin_id) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Can only delete your own questions' };
      }
      return { allowed: false, reason: 'Insufficient permissions' };
    }
  ],

  'question:publish': [
    (ctx) => {
      if (['super_admin', 'content_admin'].includes(ctx.admin.role)) {
        // Cannot publish own questions (need review)
        if (ctx.resource?.created_by === ctx.admin.admin_id && ctx.admin.role !== 'super_admin') {
          return { allowed: false, reason: 'Cannot publish your own questions' };
        }
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only admins can publish questions' };
    }
  ],

  // Admin management
  'admin:create': [
    (ctx) => {
      if (ctx.admin.role === 'super_admin') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only super admins can create admin accounts' };
    }
  ],

  // Bulk operations
  'import:create': [
    (ctx) => {
      if (['super_admin', 'content_admin'].includes(ctx.admin.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only content admins can bulk import' };
    }
  ]
};

/**
 * Check if action is allowed
 */
export function checkPolicy(action: string, context: PolicyContext): PolicyResult {
  const rules = policies[action];

  if (!rules || rules.length === 0) {
    // No policy defined = denied by default
    return { allowed: false, reason: `No policy defined for: ${action}` };
  }

  // All rules must pass
  for (const rule of rules) {
    const result = rule(context);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Middleware factory
 */
export function requirePolicy(action: string) {
  return async (req: any, res: any, next: any) => {
    const context: PolicyContext = {
      admin: {
        admin_id: req.admin.admin_id,
        role: req.admin.role
      }
    };

    // Add resource context if available
    if (req.params.id) {
      // Fetch resource to get metadata
      const question = await QuestionModel.findById(req.params.id).lean();
      if (question) {
        context.resource = {
          type: 'question',
          id: req.params.id,
          module_id: question.module_id,
          created_by: question.created_by
        };
      }
    }

    const result = checkPolicy(action, context);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        message: result.reason || 'Action not permitted',
        error: 'FORBIDDEN'
      });
    }

    next();
  };
}
```

### Usage in Routes
```typescript
// src/admin/routes/admin.routes.ts
import { requirePolicy } from '../services/policy.service';

// Simple role check (existing pattern)
router.delete('/questions/:id',
  authenticateAdmin,
  requirePolicy('question:delete'),  // ← Policy check
  adminController.deleteQuestion
);

// Publish requires checking ownership
router.patch('/questions/:id/publish',
  authenticateAdmin,
  requirePolicy('question:publish'),  // ← Cannot publish own questions
  adminController.publishQuestion
);
```

**Benefits:**
- Policies in one place (easy to audit)
- Complex rules without changing controllers
- Can add new rules without code changes
- Easy to test policies in isolation
- Future: Can load policies from database

---

## 6. API ENDPOINTS (Complete)

```typescript
// src/admin/routes/admin.routes.ts

// ==================== AUTH ====================
POST   /api/v1/admin/auth/login           // Login
POST   /api/v1/admin/auth/logout          // Logout
GET    /api/v1/admin/auth/me              // Get profile
PUT    /api/v1/admin/auth/password        // Change password

// ==================== QUESTIONS ====================
GET    /api/v1/admin/questions            // List with filters & pagination
GET    /api/v1/admin/questions/:id        // Get single question
POST   /api/v1/admin/questions            // Create question
PUT    /api/v1/admin/questions/:id        // Update question
DELETE /api/v1/admin/questions/:id        // Archive question
PATCH  /api/v1/admin/questions/:id/status // Change status

// Question history (audit trail)
GET    /api/v1/admin/questions/:id/history // Get change history

// ==================== BULK IMPORT ====================
POST   /api/v1/admin/import/validate      // Validate without importing
POST   /api/v1/admin/import/start         // Start import (returns batch_id)
GET    /api/v1/admin/import/:batchId      // Get import progress
GET    /api/v1/admin/import/history       // List past imports

// ==================== REFERENCE DATA ====================
GET    /api/v1/admin/modules              // List all modules
GET    /api/v1/admin/modules/:id          // Get module with micro-skills

// ==================== ANALYTICS ====================
GET    /api/v1/admin/analytics/overview   // Dashboard stats
GET    /api/v1/admin/analytics/coverage   // Question coverage gaps
GET    /api/v1/admin/analytics/quality    // Low-performing questions

// ==================== ADMIN MANAGEMENT (Super Admin) ====================
GET    /api/v1/admin/admins               // List admins
POST   /api/v1/admin/admins               // Create admin
PUT    /api/v1/admin/admins/:id           // Update admin
DELETE /api/v1/admin/admins/:id           // Deactivate admin
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Core Foundation (Week 1)
```
Priority: MUST HAVE

□ Create src/admin/ folder structure
□ Create Admin model (admin.model.ts)
□ Create QuestionAudit model (questionAudit.model.ts)
□ Create admin-auth.middleware.ts
□ Create admin.validator.ts (Joi schemas)
□ Create admin.routes.ts (basic structure)
□ Create admin.controller.ts (login, CRUD stubs)
□ Mount routes in server.ts
□ Test login with Postman
```

### Phase 2: Question CRUD (Week 1-2)
```
Priority: MUST HAVE

□ Create question.service.ts (CRUD operations)
□ Create audit.service.ts (logging changes)
□ Create search.service.ts (with abstraction)
□ Implement all question endpoints
□ Add audit logging to all mutations
□ Test all CRUD operations
```

### Phase 3: Frontend - Auth & Layout (Week 2)
```
Priority: MUST HAVE

□ Create client/src/admin/ structure
□ Create AdminApp.tsx entry point
□ Create AdminAuthContext
□ Create AdminLoginPage
□ Create AdminLayout with sidebar
□ Create admin.service.ts (API client)
□ Configure Vite for /admin route
```

### Phase 4: Frontend - Question Management (Week 2-3)
```
Priority: MUST HAVE

□ Create QuestionListPage with table
□ Create filter panel component
□ Create QuestionFormPage
□ Create form components (options, hints, steps)
□ Create question preview component
□ Implement status change UI
```

### Phase 5: Bulk Import (Week 3)
```
Priority: MUST HAVE

□ Create ImportBatch model
□ Create import.service.ts with chunking
□ Create BulkUploadPage
□ Create file dropzone component
□ Create validation report component
□ Create progress tracking component
□ Create useImportProgress hook
```

### Phase 6: Polish & Analytics (Week 4)
```
Priority: NICE TO HAVE

□ Create policy.service.ts
□ Add policy checks to routes
□ Create analytics endpoints
□ Create analytics dashboard
□ Add error handling improvements
□ Add loading states
□ UI polish
```

---

## 8. DATABASE INDEXES

```typescript
// Add these indexes for performance

// QuestionAudit indexes
QuestionAuditSchema.index({ question_id: 1, created_at: -1 });
QuestionAuditSchema.index({ admin_id: 1, created_at: -1 });
QuestionAuditSchema.index({ created_at: -1 }); // For recent activity

// ImportBatch indexes
ImportBatchSchema.index({ admin_id: 1, created_at: -1 });
ImportBatchSchema.index({ status: 1, created_at: -1 });

// Question indexes (add if not exists)
QuestionSchema.index({ status: 1, module_id: 1 });
QuestionSchema.index({ created_by: 1, created_at: -1 });
QuestionSchema.index({ 'question_data.text': 'text' }); // Text search
```

---

## 9. SUMMARY: v3.1 vs v3 vs v2

| Feature | v2 (Over-engineered) | v3 (Too Simple) | v3.1 (Balanced) |
|---------|---------------------|-----------------|-----------------|
| Audit Trail | Event Sourcing | Array in document | Separate collection ✓ |
| Bulk Import | Redis + Bull queue | Synchronous | Chunked + polling ✓ |
| Search | Elasticsearch | Inline regex | Service abstraction ✓ |
| Authorization | Policy-as-Code (ABAC) | Inline role check | Simple policy service ✓ |
| Structure | Modular monolith | Flat folders | Admin subfolder ✓ |
| New Infrastructure | Redis, ES, etc. | None | None ✓ |
| Extensibility | High | Low | Medium-High ✓ |
| Implementation Time | 6-8 weeks | 2-3 weeks | 3-4 weeks ✓ |

---

## 10. FUTURE UPGRADES (When Needed)

When you scale, these are easy upgrades:

| Current (v3.1) | Future Upgrade | Effort |
|----------------|----------------|--------|
| MongoDB regex search | Elasticsearch | Swap `searchService` provider |
| Chunked processing | Redis + Bull queue | Replace `processImportAsync` |
| Simple policy service | OPA/Casbin | Replace `checkPolicy` function |
| Polling for progress | WebSocket/SSE | Add socket in `getImportProgress` |

---

*Document Version: 3.1*
*Pragmatic + Extensible*
*Created: January 2026*
