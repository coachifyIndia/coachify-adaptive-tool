/**
 * AUTHENTICATION ROUTES
 *
 * This file defines all authentication-related API endpoints.
 * Routes connect URLs to controller functions with appropriate middleware.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - Routes define the API structure (URLs and HTTP methods)
 * - They wire together: validation → authentication → controller
 * - Middleware runs in the order specified (left to right)
 * - Think of it as an assembly line: request → middleware1 → middleware2 → controller → response
 *
 * ROUTE STRUCTURE:
 * router.method(path, middleware1, middleware2, ..., controller)
 *
 * MIDDLEWARE ORDER MATTERS:
 * 1. Validation (check if request data is valid)
 * 2. Authentication (check if user is logged in)
 * 3. Authorization (check if user has permission)
 * 4. Controller (process the request and send response)
 *
 * API ENDPOINTS DEFINED HERE:
 * - POST   /auth/register         - Register new user
 * - POST   /auth/login            - Login existing user
 * - POST   /auth/refresh          - Refresh access token
 * - GET    /auth/me               - Get current user profile
 * - POST   /auth/logout           - Logout user
 */

import express from 'express';
import {
  register,
  login,
  refreshAccessToken,
  getCurrentUser,
  logout,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

/**
 * CREATE EXPRESS ROUTER
 *
 * Express Router allows us to create modular route handlers.
 * We define routes here and then mount them in the main app.
 */
const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @route   POST /auth/register
 * @desc    Register a new user account
 * @access  Public
 *
 * @body {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "MyPass@123",
 *   "age": 24,
 *   "segment": "competitive_exam",
 *   "target_exam": "CAT_2025"  // optional
 * }
 *
 * @returns {
 *   "success": true,
 *   "message": "Registration successful",
 *   "data": {
 *     "user": { ... },
 *     "access_token": "...",
 *     "refresh_token": "...",
 *     "token_type": "Bearer",
 *     "expires_in": 900
 *   }
 * }
 *
 * FLOW:
 * Request → Validate with registerSchema → Register controller → Response
 */
router.post(
  '/register',
  validate(registerSchema), // Step 1: Validate request data
  register // Step 2: Process registration
);

/**
 * @route   POST /auth/login
 * @desc    Login existing user
 * @access  Public
 *
 * @body {
 *   "email": "john@example.com",
 *   "password": "MyPass@123"
 * }
 *
 * @returns {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "user": { ... },
 *     "access_token": "...",
 *     "refresh_token": "...",
 *     "token_type": "Bearer",
 *     "expires_in": 900
 *   }
 * }
 *
 * FLOW:
 * Request → Validate with loginSchema → Login controller → Response
 */
router.post(
  '/login',
  validate(loginSchema), // Step 1: Validate email and password
  login // Step 2: Authenticate and generate tokens
);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (but requires valid refresh token)
 *
 * @body {
 *   "refresh_token": "eyJhbGc..."
 * }
 *
 * @returns {
 *   "success": true,
 *   "message": "Token refreshed successfully",
 *   "data": {
 *     "access_token": "...",
 *     "refresh_token": "...",
 *     "token_type": "Bearer",
 *     "expires_in": 900
 *   }
 * }
 *
 * WHEN TO USE:
 * - When access token expires (every 15 minutes)
 * - Client should automatically call this when receiving 401 error
 * - Prevents user from having to login again
 *
 * FLOW:
 * Request → Validate refresh token → Verify and generate new tokens → Response
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema), // Step 1: Validate refresh token exists
  refreshAccessToken // Step 2: Verify and generate new tokens
);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

/**
 * @route   GET /auth/me
 * @desc    Get current authenticated user's profile
 * @access  Private (requires valid access token)
 *
 * @headers {
 *   "Authorization": "Bearer <access_token>"
 * }
 *
 * @returns {
 *   "success": true,
 *   "data": {
 *     "user": { ... user profile ... }
 *   }
 * }
 *
 * USE CASES:
 * - App initialization (check if user is still logged in)
 * - Refresh user data after updates
 * - Display user profile page
 *
 * FLOW:
 * Request → Authenticate middleware → Get current user controller → Response
 */
router.get(
  '/me',
  authenticate, // Step 1: Verify access token and load user
  getCurrentUser // Step 2: Return user profile
);

/**
 * @route   POST /auth/logout
 * @desc    Logout current user
 * @access  Private (requires valid access token)
 *
 * @headers {
 *   "Authorization": "Bearer <access_token>"
 * }
 *
 * @returns {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 *
 * NOTE:
 * - With stateless JWT, logout is primarily client-side (delete tokens)
 * - This endpoint logs the logout event
 * - In future, can be extended to invalidate refresh tokens in database
 *
 * FLOW:
 * Request → Authenticate middleware → Logout controller → Response
 */
router.post(
  '/logout',
  authenticate, // Step 1: Verify user is logged in
  logout // Step 2: Process logout
);

// ============================================================================
// PASSWORD MANAGEMENT ROUTES (To be implemented)
// ============================================================================

/**
 * TODO: Implement these routes in future
 *
 * @route   POST /auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { "email": "user@example.com" }
 *
 * FLOW:
 * 1. User requests password reset
 * 2. Generate unique reset token
 * 3. Send email with reset link
 * 4. Token expires in 1 hour
 */
// router.post('/forgot-password', validate(passwordResetRequestSchema), forgotPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @body    { "reset_token": "...", "new_password": "...", "confirm_password": "..." }
 *
 * FLOW:
 * 1. User clicks link in email
 * 2. Verify reset token
 * 3. Update password
 * 4. Invalidate reset token
 */
// router.post('/reset-password', validate(passwordResetConfirmSchema), resetPassword);

/**
 * @route   POST /auth/change-password
 * @desc    Change password (for logged-in users)
 * @access  Private
 * @body    { "current_password": "...", "new_password": "...", "confirm_password": "..." }
 *
 * FLOW:
 * 1. User enters current password
 * 2. Verify current password
 * 3. Update to new password
 * 4. Optionally invalidate all existing tokens (force re-login on all devices)
 */
// router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

/**
 * @route   POST /auth/verify-email
 * @desc    Verify email address
 * @access  Public
 * @body    { "verification_token": "..." }
 *
 * FLOW:
 * 1. User clicks link in verification email
 * 2. Verify token
 * 3. Mark email as verified
 * 4. Optionally grant access to additional features
 */
// router.post('/verify-email', validate(emailVerificationSchema), verifyEmail);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

/**
 * Export the router to be mounted in the main Express app.
 *
 * USAGE IN MAIN APP (server.ts):
 * import authRoutes from './routes/auth.routes';
 * app.use('/api/v1/auth', authRoutes);
 *
 * This makes all routes available at:
 * - /api/v1/auth/register
 * - /api/v1/auth/login
 * - /api/v1/auth/refresh
 * - /api/v1/auth/me
 * - /api/v1/auth/logout
 */
export default router;
