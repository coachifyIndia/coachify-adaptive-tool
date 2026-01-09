/**
 * AUTHENTICATION MIDDLEWARE
 *
 * This middleware protects API routes by verifying JWT tokens.
 * It ensures that only authenticated users can access protected resources.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - Middleware is code that runs BEFORE your route handler
 * - Think of it as a security checkpoint
 * - If authentication fails, the request is rejected immediately
 * - If successful, the request continues to your route handler
 *
 * HOW IT WORKS:
 * 1. Client sends request with: Authorization: Bearer <token>
 * 2. Middleware extracts the token from the header
 * 3. Verifies the token using JWT utilities
 * 4. Loads the full user object from database
 * 5. Attaches user to request object (req.user)
 * 6. Allows request to proceed
 *
 * USAGE EXAMPLE:
 * import { authenticate } from './middlewares/auth.middleware';
 * router.get('/profile', authenticate, getProfileHandler);
 * // Now getProfileHandler has access to req.user!
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../utils/jwt.util';
import { UserModel } from '../models/user.model';
import { IUser } from '../types';
import logger from '../utils/logger.util';

/**
 * EXTEND EXPRESS REQUEST TYPE
 *
 * We're adding a 'user' property to Express's Request object.
 * This allows TypeScript to know that req.user exists after authentication.
 *
 * TECHNICAL NOTE FOR JUNIOR DEVELOPERS:
 * - This is called "Declaration Merging" in TypeScript
 * - We're extending Express's built-in types
 * - Now you can use req.user in any route handler
 */
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // The authenticated user's full document
      userId?: string; // Quick access to just the user ID
    }
  }
}

/**
 * AUTHENTICATION MIDDLEWARE
 *
 * This is the main authentication function.
 * Add it to any route that requires authentication.
 *
 * FLOW:
 * Request → Extract Token → Verify Token → Load User → Attach to req → Next
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function (calls the next middleware/handler)
 *
 * @example
 * // Protect a single route:
 * router.get('/dashboard', authenticate, getDashboard);
 *
 * @example
 * // Protect all routes in a router:
 * router.use(authenticate); // All routes after this require auth
 * router.get('/profile', getProfile);
 * router.get('/settings', getSettings);
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT TOKEN FROM AUTHORIZATION HEADER
    // ========================================================================

    // The Authorization header format is: "Bearer <token>"
    // Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header provided');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide an authorization token.',
        error: 'NO_AUTH_HEADER',
      });
      return;
    }

    // Check if header starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid authorization header format');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Expected: Bearer <token>',
        error: 'INVALID_AUTH_FORMAT',
      });
      return;
    }

    // Extract the token (remove "Bearer " prefix)
    // authHeader = "Bearer eyJhbGc..." → token = "eyJhbGc..."
    const token = authHeader.substring(7); // "Bearer " is 7 characters

    // Validate token is not empty
    if (!token || token.trim() === '') {
      logger.warn('Authentication failed: Empty token provided');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
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

    let decoded: DecodedToken;

    try {
      // This will throw an error if:
      // - Token signature is invalid (tampered)
      // - Token has expired
      // - Token format is wrong
      decoded = verifyAccessToken(token);
    } catch (error: any) {
      logger.warn(`Token verification failed: ${error.message}`);

      // Handle expired tokens specifically
      if (error.message.includes('expired')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.status(401).json({
          success: false,
          message: 'Your session has expired. Please login again.',
          error: 'TOKEN_EXPIRED',
        });
        return;
      }

      // Handle other token errors
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        error: 'INVALID_TOKEN',
      });
      return;
    }

    // ========================================================================
    // STEP 3: LOAD USER FROM DATABASE
    // ========================================================================

    // Now we have a valid token, let's get the user's full data
    // We search by user_id from the token payload
    const user = await UserModel.findOne({ user_id: decoded.user_id });

    // Check if user exists
    if (!user) {
      logger.warn(`User not found for token user_id: ${decoded.user_id}`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.status(401).json({
        success: false,
        message: 'User account not found. It may have been deleted.',
        error: 'USER_NOT_FOUND',
      });
      return;
    }

    // ========================================================================
    // STEP 4: CHECK SUBSCRIPTION VALIDITY (OPTIONAL)
    // ========================================================================

    // You can add additional checks here:
    // - Is user's subscription active?
    // - Is user's account banned/suspended?
    // - Is user verified?

    // Example: Check if subscription is still valid
    const subscriptionExpiry = user.profile.subscription.valid_till;
    if (subscriptionExpiry && new Date() > subscriptionExpiry) {
      logger.info(`User ${user.user_id} has expired subscription`);
      // Note: We still allow access, but you could restrict here
      // For now, we just log it. The business logic can handle restrictions.
    }

    // ========================================================================
    // STEP 5: ATTACH USER TO REQUEST
    // ========================================================================

    // Attach the full user document to the request
    // Now any route handler can access req.user
    req.user = user;

    // Also attach just the user_id for convenience
    req.userId = user.user_id;

    logger.debug(`User authenticated: ${user.user_id} (${user.profile.email})`);

    // ========================================================================
    // STEP 6: PROCEED TO NEXT MIDDLEWARE/HANDLER
    // ========================================================================

    // Call next() to pass control to the next middleware or route handler
    next();
  } catch (error) {
    // Catch any unexpected errors
    logger.error('Unexpected error in authentication middleware:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during authentication.',
      error: 'INTERNAL_ERROR',
    });
  }
}

/**
 * OPTIONAL AUTHENTICATION MIDDLEWARE
 *
 * Similar to authenticate(), but doesn't reject if no token is provided.
 * Use this when authentication is optional but you want user info if available.
 *
 * WHEN TO USE:
 * - Public endpoints that show different content for logged-in users
 * - Example: Homepage shows personalized content if user is logged in
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * // Homepage: Show personalized content if logged in, public content if not
 * router.get('/home', optionalAuthenticate, getHomePage);
 * // In handler: if (req.user) { show personalized } else { show public }
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to authenticate, but don't fail if there's no token
    const authHeader = req.headers.authorization;

    // If no auth header, just proceed without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Proceed without setting req.user
    }

    const token = authHeader.substring(7);

    // If empty token, proceed without user
    if (!token || token.trim() === '') {
      return next();
    }

    // Try to verify token
    try {
      const decoded = verifyAccessToken(token);
      const user = await UserModel.findOne({ user_id: decoded.user_id });

      if (user) {
        req.user = user;
        req.userId = user.user_id;
        logger.debug(`Optional auth: User authenticated - ${user.user_id}`);
      }
    } catch (error) {
      // Token invalid, but that's okay for optional auth
      logger.debug('Optional auth: Invalid token provided, proceeding without user');
    }

    // Always proceed, with or without user
    next();
  } catch (error) {
    logger.error('Error in optional authentication middleware:', error);
    // Even if error, proceed without blocking the request
    next();
  }
}

/**
 * REQUIRE SUBSCRIPTION MIDDLEWARE
 *
 * Use this AFTER authenticate() to ensure user has a specific subscription level.
 * This enforces subscription-based access control.
 *
 * IMPORTANT: This must be used AFTER authenticate() middleware!
 *
 * @param allowedPlans - Array of subscription plans that can access this resource
 *
 * @example
 * // Only premium users can access this endpoint
 * router.get('/premium-features',
 *   authenticate,
 *   requireSubscription(['premium']),
 *   getPremiumFeatures
 * );
 *
 * @example
 * // Basic and Premium users can access (exclude free)
 * router.get('/advanced-practice',
 *   authenticate,
 *   requireSubscription(['basic', 'premium']),
 *   getAdvancedPractice
 * );
 */
export function requireSubscription(allowedPlans: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Make sure authenticate() was called first
    if (!req.user) {
      logger.error('requireSubscription called before authenticate middleware');
      res.status(500).json({
        success: false,
        message: 'Server configuration error.',
        error: 'MIDDLEWARE_ORDER_ERROR',
      });
      return;
    }

    // Get user's subscription plan
    const userPlan = req.user.profile.subscription.plan;

    // Check if user's plan is in the allowed list
    if (!allowedPlans.includes(userPlan)) {
      logger.info(
        `User ${req.user.user_id} with ${userPlan} plan attempted to access ${allowedPlans.join('/')} only resource`
      );

      res.status(403).json({
        success: false,
        message: `This feature requires a ${allowedPlans.join(' or ')} subscription.`,
        error: 'INSUFFICIENT_SUBSCRIPTION',
        required_plans: allowedPlans,
        current_plan: userPlan,
      });
      return;
    }

    // Subscription check passed, proceed
    next();
  };
}

/**
 * REQUIRE SEGMENT MIDDLEWARE
 *
 * Use this AFTER authenticate() to ensure user belongs to specific segment(s).
 * Useful for segment-specific features.
 *
 * IMPORTANT: This must be used AFTER authenticate() middleware!
 *
 * @param allowedSegments - Array of user segments that can access this resource
 *
 * @example
 * // Only competitive exam students can access
 * router.get('/cat-prep',
 *   authenticate,
 *   requireSegment(['competitive_exam']),
 *   getCATPrep
 * );
 *
 * @example
 * // Kids and School segments only
 * router.get('/fun-games',
 *   authenticate,
 *   requireSegment(['kids', 'school']),
 *   getFunGames
 * );
 */
export function requireSegment(allowedSegments: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Make sure authenticate() was called first
    if (!req.user) {
      logger.error('requireSegment called before authenticate middleware');
      res.status(500).json({
        success: false,
        message: 'Server configuration error.',
        error: 'MIDDLEWARE_ORDER_ERROR',
      });
      return;
    }

    // Get user's segment
    const userSegment = req.user.profile.segment;

    // Check if user's segment is in the allowed list
    if (!allowedSegments.includes(userSegment)) {
      logger.info(
        `User ${req.user.user_id} with ${userSegment} segment attempted to access ${allowedSegments.join('/')} only resource`
      );

      res.status(403).json({
        success: false,
        message: `This feature is only available for ${allowedSegments.join(' or ')} users.`,
        error: 'SEGMENT_NOT_ALLOWED',
        required_segments: allowedSegments,
        current_segment: userSegment,
      });
      return;
    }

    // Segment check passed, proceed
    next();
  };
}

/**
 * EXPORT ALL AUTH MIDDLEWARES
 *
 * Summary:
 * - authenticate: REQUIRED - Blocks request if no valid token
 * - optionalAuthenticate: OPTIONAL - Adds user if token present, continues if not
 * - requireSubscription: Checks subscription level (use after authenticate)
 * - requireSegment: Checks user segment (use after authenticate)
 */

export default {
  authenticate,
  optionalAuthenticate,
  requireSubscription,
  requireSegment,
};
