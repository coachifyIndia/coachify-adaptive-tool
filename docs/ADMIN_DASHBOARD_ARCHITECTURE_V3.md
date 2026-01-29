# Admin Dashboard Architecture v3.0
## Aligned with Existing Codebase Patterns

---

## 1. EXISTING ARCHITECTURE ANALYSIS

### Current Project Structure
```
src/
├── config/
│   ├── env.config.ts          # Environment configuration
│   └── database.config.ts     # MongoDB connection
├── controllers/
│   ├── auth.controller.ts     # User authentication
│   ├── dashboard.controller.ts # Dashboard data
│   ├── practice.controller.ts  # Practice sessions
│   └── analytics.controller.ts # Analytics endpoints
├── middlewares/
│   └── auth.middleware.ts     # authenticate, requireSubscription, requireSegment
├── models/
│   ├── user.model.ts
│   ├── session.model.ts
│   ├── question.model.ts
│   ├── userProgress.model.ts
│   └── index.ts
├── routes/
│   ├── auth.routes.ts
│   ├── dashboard.routes.ts
│   ├── practice.routes.ts
│   └── analytics.routes.ts
├── services/
│   ├── questionSelection.service.ts
│   ├── confidenceScoring.service.ts
│   └── timeAnalytics.service.ts
├── validators/
│   ├── auth.validator.ts      # Joi schemas
│   └── practice.validator.ts
├── types/
│   └── index.ts               # Enums & interfaces
├── utils/
│   ├── jwt.util.ts
│   └── logger.util.ts
└── server.ts
```

### Current Patterns We Must Follow

1. **Controller Pattern**
```typescript
export async function controllerName(req: Request, res: Response): Promise<void> {
  try {
    // Business logic
    res.status(200).json({
      success: true,
      message: 'Success message',
      data: { ... }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'ERROR_CODE'
    });
  }
}
```

2. **Route Pattern**
```typescript
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { someSchema } from '../validators/some.validator';

const router = Router();
router.use(authenticate);  // Apply to all routes
router.post('/endpoint', validate(someSchema), controllerFunction);

export default router;
```

3. **Validation Pattern (Joi)**
```typescript
import Joi from 'joi';

export const createQuestionSchema = Joi.object({
  module_id: Joi.number().min(0).max(20).required(),
  // ...
});
```

4. **Model Pattern (Mongoose)**
```typescript
const SomeSchema = new Schema({
  field: { type: String, required: true }
}, { timestamps: true });

SomeSchema.methods.instanceMethod = function() { };
SomeSchema.statics.staticMethod = function() { };

export const SomeModel = mongoose.model('Some', SomeSchema);
```

5. **Authentication**
- JWT tokens (access: 15min, refresh: 7d)
- `authenticate` middleware attaches `req.userId` and `req.user`
- Stored in `Authorization: Bearer <token>` header

---

## 2. ADMIN DASHBOARD ARCHITECTURE (Aligned)

### 2.1 New Files to Create

```
src/
├── controllers/
│   └── admin.controller.ts         # NEW: Admin question management
├── middlewares/
│   └── auth.middleware.ts          # MODIFY: Add requireAdmin
├── models/
│   ├── admin.model.ts              # NEW: Admin user model
│   └── importBatch.model.ts        # NEW: Track bulk imports
├── routes/
│   └── admin.routes.ts             # NEW: Admin API routes
├── services/
│   ├── questionAdmin.service.ts    # NEW: Question CRUD logic
│   └── importService.ts            # NEW: CSV/Excel parsing
├── validators/
│   └── admin.validator.ts          # NEW: Joi schemas for admin
└── types/
    └── index.ts                    # MODIFY: Add admin types

client/src/
├── admin/                          # NEW: Admin frontend (separate folder)
│   ├── pages/
│   │   ├── AdminLoginPage.tsx
│   │   ├── AdminDashboardPage.tsx
│   │   ├── QuestionListPage.tsx
│   │   ├── QuestionFormPage.tsx
│   │   └── BulkUploadPage.tsx
│   ├── components/
│   │   ├── QuestionForm/
│   │   ├── QuestionTable.tsx
│   │   └── BulkUpload/
│   ├── services/
│   │   └── admin.service.ts
│   └── context/
│       └── AdminAuthContext.tsx
└── AdminApp.tsx                    # NEW: Separate admin entry point
```

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN DASHBOARD                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Frontend (React + TypeScript)                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  AdminApp.tsx (Separate from main App.tsx)                   │    │
│  │  └── AdminAuthContext                                        │    │
│  │      └── Admin Pages (Login, Dashboard, Questions, Upload)  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  admin.service.ts (API calls)                                │    │
│  │  └── axios instance with admin token                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────┼───────────────────────────────────────┐
│                        BACKEND                                       │
│                              │                                       │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │  admin.routes.ts                                              │   │
│  │  └── /api/v1/admin/*                                          │   │
│  │      ├── POST   /auth/login                                   │   │
│  │      ├── GET    /questions                                    │   │
│  │      ├── POST   /questions                                    │   │
│  │      ├── PUT    /questions/:id                                │   │
│  │      ├── DELETE /questions/:id                                │   │
│  │      ├── POST   /questions/bulk                               │   │
│  │      └── GET    /analytics                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │  Middlewares                                                  │   │
│  │  ├── authenticate (existing)                                  │   │
│  │  └── requireAdmin (NEW - checks admin role)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │  admin.controller.ts                                          │   │
│  │  ├── loginAdmin()                                             │   │
│  │  ├── getQuestions()                                           │   │
│  │  ├── createQuestion()                                         │   │
│  │  ├── updateQuestion()                                         │   │
│  │  ├── deleteQuestion()                                         │   │
│  │  ├── bulkImportQuestions()                                    │   │
│  │  └── getQuestionAnalytics()                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │  Services                                                     │   │
│  │  ├── questionAdmin.service.ts (CRUD operations)               │   │
│  │  └── import.service.ts (CSV/Excel parsing)                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │  Models (MongoDB)                                             │   │
│  │  ├── admin.model.ts (admin users)                             │   │
│  │  ├── question.model.ts (existing)                             │   │
│  │  └── importBatch.model.ts (track imports)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE MODELS

### 3.1 Admin Model (NEW)

```typescript
// src/models/admin.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  CONTENT_ADMIN = 'content_admin',
  REVIEWER = 'reviewer'
}

export interface IAdmin extends Document {
  admin_id: string;
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>({
  admin_id: {
    type: String,
    required: true,
    unique: true,
    default: () => `ADM_${Math.random().toString(36).substr(2, 7).toUpperCase()}`
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false  // Don't return password by default
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(AdminRole),
    default: AdminRole.CONTENT_ADMIN
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Hash password before saving
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
AdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const AdminModel = mongoose.model<IAdmin>('Admin', AdminSchema);
```

### 3.2 Import Batch Model (NEW)

```typescript
// src/models/importBatch.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed'
}

export interface IImportBatch extends Document {
  batch_id: string;
  admin_id: string;
  file_name: string;
  file_type: 'csv' | 'excel' | 'json';
  status: ImportStatus;
  total_rows: number;
  processed_rows: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  created_question_ids: string[];
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

const ImportBatchSchema = new Schema<IImportBatch>({
  batch_id: {
    type: String,
    required: true,
    unique: true,
    default: () => `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`
  },
  admin_id: {
    type: String,
    required: true,
    index: true
  },
  file_name: {
    type: String,
    required: true
  },
  file_type: {
    type: String,
    enum: ['csv', 'excel', 'json'],
    required: true
  },
  status: {
    type: String,
    enum: Object.values(ImportStatus),
    default: ImportStatus.PENDING
  },
  total_rows: {
    type: Number,
    default: 0
  },
  processed_rows: {
    type: Number,
    default: 0
  },
  successful: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  errors: [{
    row: Number,
    field: String,
    message: String
  }],
  created_question_ids: [String],
  started_at: Date,
  completed_at: Date
}, {
  timestamps: { createdAt: 'created_at' }
});

export const ImportBatchModel = mongoose.model<IImportBatch>('ImportBatch', ImportBatchSchema);
```

### 3.3 Question Model - Add Audit Fields (MODIFY)

```typescript
// Add these fields to existing question.model.ts
{
  // ... existing fields ...

  // Audit fields (NEW)
  created_by: {
    type: String,  // admin_id
    index: true
  },
  updated_by: String,
  change_history: [{
    changed_by: String,
    changed_at: { type: Date, default: Date.now },
    changes: Schema.Types.Mixed  // { field: { old: x, new: y } }
  }]
}
```

---

## 4. API ENDPOINTS

### 4.1 Admin Routes

```typescript
// src/routes/admin.routes.ts
import { Router } from 'express';
import { authenticateAdmin, requireRole } from '../middlewares/admin-auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as adminController from '../controllers/admin.controller';
import * as adminValidator from '../validators/admin.validator';

const router = Router();

// ==================== AUTH ====================
// Public - no auth required
router.post('/auth/login',
  validate(adminValidator.loginSchema),
  adminController.loginAdmin
);

// ==================== PROTECTED ROUTES ====================
// All routes below require admin authentication
router.use(authenticateAdmin);

// Auth
router.post('/auth/logout', adminController.logoutAdmin);
router.get('/auth/me', adminController.getAdminProfile);
router.put('/auth/password',
  validate(adminValidator.changePasswordSchema),
  adminController.changePassword
);

// ==================== QUESTIONS ====================
// List & Search
router.get('/questions', adminController.getQuestions);
router.get('/questions/:id', adminController.getQuestionById);

// Create
router.post('/questions',
  validate(adminValidator.createQuestionSchema),
  adminController.createQuestion
);

// Update
router.put('/questions/:id',
  validate(adminValidator.updateQuestionSchema),
  adminController.updateQuestion
);

// Delete (soft delete - archive)
router.delete('/questions/:id', adminController.deleteQuestion);

// Status change
router.patch('/questions/:id/status',
  validate(adminValidator.changeStatusSchema),
  adminController.changeQuestionStatus
);

// ==================== BULK OPERATIONS ====================
router.post('/questions/bulk/validate',
  adminController.validateBulkQuestions
);

router.post('/questions/bulk/import',
  adminController.bulkImportQuestions
);

router.get('/imports', adminController.getImportHistory);
router.get('/imports/:batchId', adminController.getImportBatchDetails);

// ==================== REFERENCE DATA ====================
router.get('/modules', adminController.getModules);
router.get('/modules/:id/micro-skills', adminController.getMicroSkills);

// ==================== ANALYTICS ====================
router.get('/analytics/questions', adminController.getQuestionAnalytics);
router.get('/analytics/coverage', adminController.getCoverageAnalytics);

// ==================== ADMIN MANAGEMENT (Super Admin Only) ====================
router.get('/admins',
  requireRole(['super_admin']),
  adminController.getAdmins
);

router.post('/admins',
  requireRole(['super_admin']),
  validate(adminValidator.createAdminSchema),
  adminController.createAdmin
);

export default router;
```

### 4.2 API Response Format (Consistent with existing)

```typescript
// Success Response
{
  success: true,
  message: "Questions retrieved successfully",
  data: {
    questions: [...],
    pagination: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8
    }
  }
}

// Error Response
{
  success: false,
  message: "Validation failed",
  error: "VALIDATION_ERROR",
  details: [
    { field: "module_id", message: "Module ID must be between 0-20" }
  ]
}
```

---

## 5. MIDDLEWARE

### 5.1 Admin Auth Middleware (NEW)

```typescript
// src/middlewares/admin-auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env.config';
import { AdminModel, AdminRole } from '../models/admin.model';
import logger from '../utils/logger.util';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      admin?: any;
    }
  }
}

/**
 * Authenticate admin using JWT token
 */
export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        error: 'ADMIN_AUTH_REQUIRED'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token (using separate admin secret for better security)
    const decoded = jwt.verify(token, config.jwt.secret) as {
      admin_id: string;
      role: AdminRole;
    };

    // Check if it's an admin token (not user token)
    if (!decoded.admin_id) {
      res.status(401).json({
        success: false,
        message: 'Invalid admin token',
        error: 'INVALID_ADMIN_TOKEN'
      });
      return;
    }

    // Fetch admin from database
    const admin = await AdminModel.findOne({
      admin_id: decoded.admin_id,
      is_active: true
    });

    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Admin account not found or inactive',
        error: 'ADMIN_NOT_FOUND'
      });
      return;
    }

    // Attach admin to request
    req.adminId = admin.admin_id;
    req.admin = admin;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Admin token expired',
        error: 'TOKEN_EXPIRED'
      });
      return;
    }

    logger.error('Admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid admin token',
      error: 'INVALID_TOKEN'
    });
  }
}

/**
 * Require specific admin role(s)
 */
export function requireRole(allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        error: 'ADMIN_AUTH_REQUIRED'
      });
      return;
    }

    if (!allowedRoles.includes(req.admin.role)) {
      res.status(403).json({
        success: false,
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        error: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
}
```

---

## 6. VALIDATION SCHEMAS

### 6.1 Admin Validators (Joi)

```typescript
// src/validators/admin.validator.ts
import Joi from 'joi';
import { QuestionType } from '../types';

// ==================== AUTH ====================
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
    })
});

// ==================== QUESTIONS ====================
export const createQuestionSchema = Joi.object({
  module_id: Joi.number().integer().min(0).max(20).required(),
  micro_skill_id: Joi.number().integer().min(1).max(74).required(),

  question_data: Joi.object({
    text: Joi.string().min(10).max(2000).required(),
    type: Joi.string().valid(...Object.values(QuestionType)).required(),
    options: Joi.when('type', {
      is: 'mcq',
      then: Joi.array().items(Joi.string()).min(2).max(6).required(),
      otherwise: Joi.forbidden()
    }),
    correct_answer: Joi.alternatives()
      .try(Joi.string(), Joi.number(), Joi.array().items(Joi.string()))
      .required(),
    solution_steps: Joi.array().items(
      Joi.object({
        step: Joi.number().required(),
        action: Joi.string().required(),
        calculation: Joi.string().required(),
        result: Joi.alternatives().try(Joi.string(), Joi.number()).required()
      })
    ).min(1).max(10).required(),
    hints: Joi.array().items(
      Joi.object({
        level: Joi.number().min(1).max(3).required(),
        text: Joi.string().min(5).required()
      })
    ).max(3).optional()
  }).required(),

  metadata: Joi.object({
    difficulty_level: Joi.number().integer().min(1).max(10).required(),
    expected_time_seconds: Joi.number().integer().min(10).max(600).required(),
    points: Joi.number().integer().min(1).max(100).required(),
    tags: Joi.array().items(Joi.string()).optional(),
    prerequisites: Joi.array().items(Joi.string()).optional(),
    common_errors: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        frequency: Joi.number().min(0).max(1).required(),
        description: Joi.string().required()
      })
    ).optional()
  }).required(),

  status: Joi.string().valid('draft', 'active', 'archived').default('draft')
});

export const updateQuestionSchema = createQuestionSchema.fork(
  ['module_id', 'micro_skill_id', 'question_data', 'metadata'],
  (schema) => schema.optional()
);

export const changeStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'active', 'archived').required()
});

// ==================== ADMIN MANAGEMENT ====================
export const createAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('super_admin', 'content_admin', 'reviewer').required()
});
```

---

## 7. SERVICES

### 7.1 Question Admin Service

```typescript
// src/services/questionAdmin.service.ts
import { QuestionModel } from '../models/question.model';
import { getModuleById, getMicroSkillById } from '../data/modules.data';
import logger from '../utils/logger.util';

interface QuestionFilters {
  module_id?: number;
  micro_skill_id?: number;
  difficulty_min?: number;
  difficulty_max?: number;
  type?: string;
  status?: string;
  search?: string;
  created_by?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Get questions with filtering and pagination
 */
export async function getQuestions(
  filters: QuestionFilters,
  pagination: PaginationOptions
) {
  const query: any = {};

  // Build query from filters
  if (filters.module_id !== undefined) query.module_id = filters.module_id;
  if (filters.micro_skill_id !== undefined) query.micro_skill_id = filters.micro_skill_id;
  if (filters.type) query['question_data.type'] = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.created_by) query.created_by = filters.created_by;

  // Difficulty range
  if (filters.difficulty_min || filters.difficulty_max) {
    query['metadata.difficulty_level'] = {};
    if (filters.difficulty_min) query['metadata.difficulty_level'].$gte = filters.difficulty_min;
    if (filters.difficulty_max) query['metadata.difficulty_level'].$lte = filters.difficulty_max;
  }

  // Text search
  if (filters.search) {
    query['question_data.text'] = { $regex: filters.search, $options: 'i' };
  }

  // Count total
  const total = await QuestionModel.countDocuments(query);

  // Build sort
  const sortField = pagination.sort || 'createdAt';
  const sortOrder = pagination.order === 'asc' ? 1 : -1;

  // Fetch questions
  const questions = await QuestionModel.find(query)
    .sort({ [sortField]: sortOrder })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit)
    .lean();

  return {
    questions,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
}

/**
 * Create a new question
 */
export async function createQuestion(data: any, adminId: string) {
  // Validate module and micro-skill exist
  const module = getModuleById(data.module_id);
  if (!module) {
    throw new Error(`Invalid module_id: ${data.module_id}`);
  }

  const microSkill = getMicroSkillById(data.micro_skill_id);
  if (!microSkill) {
    throw new Error(`Invalid micro_skill_id: ${data.micro_skill_id}`);
  }

  // Check micro-skill belongs to module
  const moduleSkills = module.micro_skills.map(ms => ms.micro_skill_id);
  if (!moduleSkills.includes(data.micro_skill_id)) {
    throw new Error(`Micro-skill ${data.micro_skill_id} does not belong to module ${data.module_id}`);
  }

  // Generate question code
  const count = await QuestionModel.countDocuments({
    module_id: data.module_id,
    micro_skill_id: data.micro_skill_id
  });
  const questionCode = `M${data.module_id}_MS${data.micro_skill_id}_Q${count + 1}`;

  // Create question
  const question = new QuestionModel({
    question_code: questionCode,
    module_id: data.module_id,
    micro_skill_id: data.micro_skill_id,
    question_data: data.question_data,
    metadata: data.metadata,
    status: data.status || 'draft',
    created_by: adminId,
    performance: {
      total_attempts: 0,
      success_rate: 0,
      avg_hints_used: 0,
      abandon_rate: 0
    }
  });

  await question.save();
  logger.info(`Question ${questionCode} created by admin ${adminId}`);

  return question;
}

/**
 * Update a question
 */
export async function updateQuestion(questionId: string, data: any, adminId: string) {
  const question = await QuestionModel.findById(questionId);

  if (!question) {
    throw new Error('Question not found');
  }

  // Track changes for audit
  const changes: any = {};
  const updateData: any = { updated_by: adminId };

  // Compare and track changes
  for (const [key, value] of Object.entries(data)) {
    const oldValue = (question as any)[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      changes[key] = { old: oldValue, new: value };
      updateData[key] = value;
    }
  }

  if (Object.keys(changes).length === 0) {
    return question; // No changes
  }

  // Add to change history
  updateData.$push = {
    change_history: {
      changed_by: adminId,
      changed_at: new Date(),
      changes
    }
  };

  const updatedQuestion = await QuestionModel.findByIdAndUpdate(
    questionId,
    updateData,
    { new: true }
  );

  logger.info(`Question ${question.question_code} updated by admin ${adminId}`);

  return updatedQuestion;
}

/**
 * Soft delete (archive) a question
 */
export async function deleteQuestion(questionId: string, adminId: string) {
  const question = await QuestionModel.findByIdAndUpdate(
    questionId,
    {
      status: 'archived',
      updated_by: adminId,
      $push: {
        change_history: {
          changed_by: adminId,
          changed_at: new Date(),
          changes: { status: { old: 'active', new: 'archived' } }
        }
      }
    },
    { new: true }
  );

  if (!question) {
    throw new Error('Question not found');
  }

  logger.info(`Question ${question.question_code} archived by admin ${adminId}`);

  return question;
}
```

### 7.2 Import Service

```typescript
// src/services/import.service.ts
import Papa from 'papaparse';
import { QuestionModel } from '../models/question.model';
import { ImportBatchModel, ImportStatus } from '../models/importBatch.model';
import { createQuestionSchema } from '../validators/admin.validator';
import { getModuleById } from '../data/modules.data';
import logger from '../utils/logger.util';

interface ParsedRow {
  module_id: number;
  micro_skill_id: number;
  question_text: string;
  question_type: string;
  options?: string;
  correct_answer: string;
  solution_steps: string;
  hints?: string;
  difficulty: number;
  expected_time: number;
  points: number;
  tags?: string;
}

interface ValidationResult {
  valid: boolean;
  row: number;
  data?: any;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Parse CSV content
 */
export function parseCSV(content: string): ParsedRow[] {
  const result = Papa.parse<ParsedRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_'),
    transform: (value) => value.trim()
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  return result.data;
}

/**
 * Validate a single row
 */
export function validateRow(row: ParsedRow, rowIndex: number): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  try {
    // Parse JSON fields
    let solutionSteps, hints, options;

    try {
      solutionSteps = JSON.parse(row.solution_steps);
    } catch {
      errors.push({ field: 'solution_steps', message: 'Invalid JSON format' });
    }

    if (row.hints) {
      try {
        hints = JSON.parse(row.hints);
      } catch {
        errors.push({ field: 'hints', message: 'Invalid JSON format' });
      }
    }

    if (row.options) {
      options = row.options.split('|').map(o => o.trim());
    }

    // Build question object
    const questionData = {
      module_id: Number(row.module_id),
      micro_skill_id: Number(row.micro_skill_id),
      question_data: {
        text: row.question_text,
        type: row.question_type.toLowerCase(),
        options,
        correct_answer: isNaN(Number(row.correct_answer))
          ? row.correct_answer
          : Number(row.correct_answer),
        solution_steps: solutionSteps,
        hints
      },
      metadata: {
        difficulty_level: Number(row.difficulty),
        expected_time_seconds: Number(row.expected_time),
        points: Number(row.points),
        tags: row.tags ? row.tags.split(',').map(t => t.trim()) : []
      },
      status: 'draft'
    };

    // Validate with Joi schema
    const { error, value } = createQuestionSchema.validate(questionData, {
      abortEarly: false
    });

    if (error) {
      for (const detail of error.details) {
        errors.push({
          field: detail.path.join('.'),
          message: detail.message
        });
      }
    }

    // Check module exists
    const module = getModuleById(questionData.module_id);
    if (!module) {
      errors.push({ field: 'module_id', message: `Module ${questionData.module_id} does not exist` });
    }

    return {
      valid: errors.length === 0,
      row: rowIndex + 1,
      data: errors.length === 0 ? value : undefined,
      errors
    };
  } catch (err: any) {
    return {
      valid: false,
      row: rowIndex + 1,
      errors: [{ field: 'general', message: err.message }]
    };
  }
}

/**
 * Validate all rows without importing
 */
export async function validateBulkImport(
  content: string,
  fileType: 'csv' | 'json'
): Promise<{
  total: number;
  valid: number;
  invalid: number;
  results: ValidationResult[];
}> {
  let rows: ParsedRow[];

  if (fileType === 'csv') {
    rows = parseCSV(content);
  } else {
    rows = JSON.parse(content);
  }

  const results: ValidationResult[] = [];
  let valid = 0;
  let invalid = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i);
    results.push(result);
    if (result.valid) valid++;
    else invalid++;
  }

  return { total: rows.length, valid, invalid, results };
}

/**
 * Import questions from CSV/JSON
 */
export async function importQuestions(
  content: string,
  fileType: 'csv' | 'json',
  fileName: string,
  adminId: string
): Promise<{
  batchId: string;
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; field?: string; message: string }>;
}> {
  // Create batch record
  const batch = new ImportBatchModel({
    admin_id: adminId,
    file_name: fileName,
    file_type: fileType,
    status: ImportStatus.PROCESSING,
    started_at: new Date()
  });
  await batch.save();

  try {
    // Parse content
    let rows: ParsedRow[];
    if (fileType === 'csv') {
      rows = parseCSV(content);
    } else {
      rows = JSON.parse(content);
    }

    batch.total_rows = rows.length;
    await batch.save();

    const errors: Array<{ row: number; field?: string; message: string }> = [];
    const createdQuestionIds: string[] = [];
    let successful = 0;
    let failed = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const validation = validateRow(rows[i], i);

      if (!validation.valid) {
        failed++;
        for (const error of validation.errors) {
          errors.push({ row: i + 1, field: error.field, message: error.message });
        }
        continue;
      }

      try {
        // Generate question code
        const count = await QuestionModel.countDocuments({
          module_id: validation.data.module_id,
          micro_skill_id: validation.data.micro_skill_id
        });

        const questionCode = `M${validation.data.module_id}_MS${validation.data.micro_skill_id}_Q${count + 1}`;

        // Create question
        const question = new QuestionModel({
          question_code: questionCode,
          ...validation.data,
          created_by: adminId,
          performance: {
            total_attempts: 0,
            success_rate: 0,
            avg_hints_used: 0,
            abandon_rate: 0
          }
        });

        await question.save();
        createdQuestionIds.push(question._id.toString());
        successful++;
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 1, message: err.message });
      }

      // Update progress
      batch.processed_rows = i + 1;
      await batch.save();
    }

    // Update batch status
    batch.status = failed > 0 ? ImportStatus.COMPLETED_WITH_ERRORS : ImportStatus.COMPLETED;
    batch.successful = successful;
    batch.failed = failed;
    batch.errors = errors;
    batch.created_question_ids = createdQuestionIds;
    batch.completed_at = new Date();
    await batch.save();

    logger.info(`Import batch ${batch.batch_id} completed: ${successful} success, ${failed} failed`);

    return {
      batchId: batch.batch_id,
      total: rows.length,
      successful,
      failed,
      errors
    };
  } catch (err: any) {
    batch.status = ImportStatus.FAILED;
    batch.completed_at = new Date();
    await batch.save();

    logger.error(`Import batch ${batch.batch_id} failed: ${err.message}`);
    throw err;
  }
}
```

---

## 8. FRONTEND STRUCTURE

### 8.1 Admin App Entry Point

```typescript
// client/src/AdminApp.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './admin/context/AdminAuthContext';
import AdminLoginPage from './admin/pages/AdminLoginPage';
import AdminDashboardPage from './admin/pages/AdminDashboardPage';
import QuestionListPage from './admin/pages/QuestionListPage';
import QuestionFormPage from './admin/pages/QuestionFormPage';
import BulkUploadPage from './admin/pages/BulkUploadPage';
import AdminLayout from './admin/components/AdminLayout';

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" />;

  return <AdminLayout>{children}</AdminLayout>;
};

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLoginPage />} />

      <Route path="/dashboard" element={
        <ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>
      } />

      <Route path="/questions" element={
        <ProtectedAdminRoute><QuestionListPage /></ProtectedAdminRoute>
      } />

      <Route path="/questions/new" element={
        <ProtectedAdminRoute><QuestionFormPage /></ProtectedAdminRoute>
      } />

      <Route path="/questions/:id/edit" element={
        <ProtectedAdminRoute><QuestionFormPage /></ProtectedAdminRoute>
      } />

      <Route path="/upload" element={
        <ProtectedAdminRoute><BulkUploadPage /></ProtectedAdminRoute>
      } />

      <Route path="/" element={<Navigate to="/admin/dashboard" />} />
    </Routes>
  );
}

export default function AdminApp() {
  return (
    <BrowserRouter basename="/admin">
      <AdminAuthProvider>
        <AdminRoutes />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
```

### 8.2 Admin Service

```typescript
// client/src/admin/services/admin.service.ts
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/admin';

const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add admin token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const adminService = {
  // Auth
  login: (email: string, password: string) =>
    adminApi.post('/auth/login', { email, password }),

  logout: () =>
    adminApi.post('/auth/logout'),

  getProfile: () =>
    adminApi.get('/auth/me'),

  // Questions
  getQuestions: (params: any) =>
    adminApi.get('/questions', { params }),

  getQuestion: (id: string) =>
    adminApi.get(`/questions/${id}`),

  createQuestion: (data: any) =>
    adminApi.post('/questions', data),

  updateQuestion: (id: string, data: any) =>
    adminApi.put(`/questions/${id}`, data),

  deleteQuestion: (id: string) =>
    adminApi.delete(`/questions/${id}`),

  changeQuestionStatus: (id: string, status: string) =>
    adminApi.patch(`/questions/${id}/status`, { status }),

  // Bulk Operations
  validateBulkImport: (content: string, fileType: string) =>
    adminApi.post('/questions/bulk/validate', { content, file_type: fileType }),

  bulkImport: (content: string, fileType: string, fileName: string) =>
    adminApi.post('/questions/bulk/import', { content, file_type: fileType, file_name: fileName }),

  // Reference Data
  getModules: () =>
    adminApi.get('/modules'),

  getMicroSkills: (moduleId: number) =>
    adminApi.get(`/modules/${moduleId}/micro-skills`),

  // Analytics
  getQuestionAnalytics: () =>
    adminApi.get('/analytics/questions'),

  getCoverageAnalytics: () =>
    adminApi.get('/analytics/coverage')
};
```

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Foundation (Core CRUD)
- [ ] Create Admin model
- [ ] Create admin-auth.middleware.ts
- [ ] Create admin.routes.ts with basic structure
- [ ] Create admin.controller.ts (login, CRUD operations)
- [ ] Create admin.validator.ts (Joi schemas)
- [ ] Create questionAdmin.service.ts
- [ ] Add admin routes to server.ts
- [ ] Test with Postman/curl

### Phase 2: Frontend Setup
- [ ] Create AdminApp.tsx entry point
- [ ] Create AdminAuthContext
- [ ] Create AdminLoginPage
- [ ] Create AdminLayout with navigation
- [ ] Create admin.service.ts
- [ ] Configure Vite for /admin route

### Phase 3: Question Management UI
- [ ] Create QuestionListPage with table & filters
- [ ] Create QuestionFormPage (create/edit)
- [ ] Create question form components
- [ ] Implement status change functionality

### Phase 4: Bulk Upload
- [ ] Create ImportBatch model
- [ ] Create import.service.ts (CSV parsing)
- [ ] Create BulkUploadPage
- [ ] Create file upload component
- [ ] Create validation report display
- [ ] Create import progress tracking

### Phase 5: Analytics & Polish
- [ ] Add question analytics endpoint
- [ ] Add coverage gap analysis
- [ ] Create analytics dashboard
- [ ] Add search functionality
- [ ] Polish UI/UX

---

## 10. SUMMARY: WHAT WE'RE BUILDING

| Component | Technology | Pattern |
|-----------|------------|---------|
| Backend | Express + TypeScript | Same as existing |
| Database | MongoDB + Mongoose | Same as existing |
| Auth | JWT tokens | Same as existing (separate admin tokens) |
| Validation | Joi schemas | Same as existing |
| Frontend | React + TypeScript | Same as existing |
| Styling | Tailwind CSS | Same as existing |
| API Format | REST JSON | Same as existing |

**No new infrastructure:**
- No Redis
- No Elasticsearch
- No job queues (synchronous processing for MVP)
- No GraphQL
- No event sourcing

**Future enhancements (if needed):**
- Add Redis for caching
- Add async job processing for large imports
- Add Elasticsearch for advanced search
- Add more granular permissions

---

*Document Version: 3.0*
*Aligned with existing codebase patterns*
*Created: January 2026*
