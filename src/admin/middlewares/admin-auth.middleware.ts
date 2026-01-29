/**
 * ADMIN AUTHENTICATION MIDDLEWARE
 *
 * Protects admin API routes by verifying JWT tokens.
 * Separate from user auth for security isolation.
 *
 * KEY DIFFERENCES FROM USER AUTH:
 * - Uses AdminModel instead of UserModel
 * - Checks admin roles for authorization
 * - Uses separate JWT payload structure for admins
 * - More strict security requirements
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config/env.config';
import { AdminModel, IAdmin, AdminRole } from '../../models/admin.model';
import logger from '../../utils/logger.util';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Admin JWT Payload
 * What's stored inside admin tokens
 */
export interface AdminJwtPayload {
  admin_id: string;
  email: string;
  role: AdminRole;
}

/**
 * Decoded Admin Token
 * Includes JWT standard fields
 */
export interface DecodedAdminToken extends AdminJwtPayload {
  iat: number;
  exp: number;
}

/**
 * Extend Express Request for admin routes
 */
declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
      adminId?: string;
    }
  }
}

// ============================================================================
// JWT FUNCTIONS FOR ADMIN
// ============================================================================

/**
 * Generate admin access token
 * Short-lived token for API requests
 */
export function generateAdminAccessToken(payload: AdminJwtPayload): string {
  try {
    const secret = config.jwt.secret;
    const token = jwt.sign(
      { ...payload, type: 'admin' }, // Add type to distinguish from user tokens
      secret,
      {
        expiresIn: '4h', // Admin tokens valid for 4 hours
        algorithm: 'HS256',
      }
    );
    logger.debug(`Admin access token generated for: ${payload.admin_id}`);
    return token;
  } catch (error) {
    logger.error('Error generating admin access token:', error);
    throw new Error('Failed to generate admin access token');
  }
}

/**
 * Generate admin refresh token
 * Long-lived token for session refresh
 */
export function generateAdminRefreshToken(payload: AdminJwtPayload): string {
  try {
    const secret = config.jwt.refreshSecret;
    const token = jwt.sign(
      { ...payload, type: 'admin' },
      secret,
      {
        expiresIn: '7d', // Refresh token valid for 7 days
        algorithm: 'HS256',
      }
    );
    logger.debug(`Admin refresh token generated for: ${payload.admin_id}`);
    return token;
  } catch (error) {
    logger.error('Error generating admin refresh token:', error);
    throw new Error('Failed to generate admin refresh token');
  }
}

/**
 * Verify admin access token
 */
export function verifyAdminAccessToken(token: string): DecodedAdminToken & { type: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as DecodedAdminToken & { type: string };

    // Ensure this is an admin token
    if (decoded.type !== 'admin') {
      throw new Error('Not an admin token');
    }

    logger.debug(`Admin access token verified for: ${decoded.admin_id}`);
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Admin access token expired');
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid admin access token');
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying admin access token:', error);
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Verify admin refresh token
 */
export function verifyAdminRefreshToken(token: string): DecodedAdminToken & { type: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as DecodedAdminToken & { type: string };

    if (decoded.type !== 'admin') {
      throw new Error('Not an admin token');
    }

    logger.debug(`Admin refresh token verified for: ${decoded.admin_id}`);
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Admin refresh token expired');
      throw new Error('Refresh token has expired. Please login again.');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid admin refresh token');
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Error verifying admin refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Authenticate Admin Middleware
 *
 * Verifies JWT token and attaches admin to request.
 * Use this on all protected admin routes.
 *
 * @example
 * router.get('/dashboard', authenticateAdmin, getDashboard);
 */
export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT TOKEN FROM AUTHORIZATION HEADER
    // ========================================================================

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Admin auth failed: No authorization header');
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide an authorization token.',
        error: 'NO_AUTH_HEADER',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Admin auth failed: Invalid header format');
      res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Expected: Bearer <token>',
        error: 'INVALID_AUTH_FORMAT',
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!token || token.trim() === '') {
      logger.warn('Admin auth failed: Empty token');
      res.status(401).json({
        success: false,
        message: 'Authentication token is missing.',
        error: 'EMPTY_TOKEN',
      });
      return;
    }

    // ========================================================================
    // STEP 2: VERIFY THE JWT TOKEN
    // ========================================================================

    let decoded: DecodedAdminToken & { type: string };

    try {
      decoded = verifyAdminAccessToken(token);
    } catch (error: any) {
      logger.warn(`Admin token verification failed: ${error.message}`);

      if (error.message.includes('expired')) {
        res.status(401).json({
          success: false,
          message: 'Your session has expired. Please login again.',
          error: 'TOKEN_EXPIRED',
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        error: 'INVALID_TOKEN',
      });
      return;
    }

    // ========================================================================
    // STEP 3: LOAD ADMIN FROM DATABASE
    // ========================================================================

    const admin = await AdminModel.findOne({ admin_id: decoded.admin_id });

    if (!admin) {
      logger.warn(`Admin not found for token admin_id: ${decoded.admin_id}`);
      res.status(401).json({
        success: false,
        message: 'Admin account not found. It may have been deactivated.',
        error: 'ADMIN_NOT_FOUND',
      });
      return;
    }

    // ========================================================================
    // STEP 4: CHECK IF ADMIN IS ACTIVE
    // ========================================================================

    if (!admin.is_active) {
      logger.warn(`Inactive admin attempted access: ${admin.admin_id}`);
      res.status(403).json({
        success: false,
        message: 'Your admin account has been deactivated. Contact a super admin.',
        error: 'ADMIN_INACTIVE',
      });
      return;
    }

    // ========================================================================
    // STEP 5: ATTACH ADMIN TO REQUEST
    // ========================================================================

    req.admin = admin;
    req.adminId = admin.admin_id;

    logger.debug(`Admin authenticated: ${admin.admin_id} (${admin.email})`);

    next();
  } catch (error) {
    logger.error('Unexpected error in admin authentication middleware:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during authentication.',
      error: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Require Role Middleware
 *
 * Checks if admin has one of the allowed roles.
 * Must be used AFTER authenticateAdmin middleware.
 *
 * @param allowedRoles - Array of roles that can access this resource
 *
 * @example
 * // Only super admins can manage other admins
 * router.post('/admins', authenticateAdmin, requireRole([AdminRole.SUPER_ADMIN]), createAdmin);
 *
 * @example
 * // Content admins and super admins can create questions
 * router.post('/questions', authenticateAdmin, requireRole([AdminRole.SUPER_ADMIN, AdminRole.CONTENT_ADMIN]), createQuestion);
 */
export function requireRole(allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure authenticateAdmin was called first
    if (!req.admin) {
      logger.error('requireRole called before authenticateAdmin middleware');
      res.status(500).json({
        success: false,
        message: 'Server configuration error.',
        error: 'MIDDLEWARE_ORDER_ERROR',
      });
      return;
    }

    const adminRole = req.admin.role;

    // Check if admin's role is in the allowed list
    if (!allowedRoles.includes(adminRole)) {
      logger.info(
        `Admin ${req.admin.admin_id} with role ${adminRole} attempted to access ${allowedRoles.join('/')}-only resource`
      );

      res.status(403).json({
        success: false,
        message: `This action requires ${allowedRoles.join(' or ')} privileges.`,
        error: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        current_role: adminRole,
      });
      return;
    }

    // Role check passed
    next();
  };
}

/**
 * Require Content Admin or Higher
 *
 * Convenience middleware for routes that require content management permissions.
 * Allows SUPER_ADMIN and CONTENT_ADMIN roles.
 *
 * @example
 * router.post('/questions', authenticateAdmin, requireContentAdmin, createQuestion);
 */
export function requireContentAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole([AdminRole.SUPER_ADMIN, AdminRole.CONTENT_ADMIN])(req, res, next);
}

/**
 * Require Super Admin
 *
 * Convenience middleware for routes that require super admin privileges.
 * Only allows SUPER_ADMIN role.
 *
 * @example
 * router.delete('/admins/:id', authenticateAdmin, requireSuperAdmin, deleteAdmin);
 */
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole([AdminRole.SUPER_ADMIN])(req, res, next);
}

/**
 * Require Reviewer or Higher
 *
 * Convenience middleware for routes that require at least reviewer permissions.
 * Allows all admin roles.
 *
 * @example
 * router.get('/questions', authenticateAdmin, requireReviewer, listQuestions);
 */
export function requireReviewer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole([AdminRole.SUPER_ADMIN, AdminRole.CONTENT_ADMIN, AdminRole.REVIEWER])(req, res, next);
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  authenticateAdmin,
  requireRole,
  requireContentAdmin,
  requireSuperAdmin,
  requireReviewer,
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
};
