/**
 * AUTHENTICATION CONTROLLER
 *
 * This file contains all authentication-related business logic.
 * It handles user registration, login, token refresh, and password management.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - Controllers contain the business logic for handling requests
 * - They sit between routes (which receive requests) and models (which interact with database)
 * - A controller function receives req and res objects from Express
 * - It processes the request, interacts with database, and sends a response
 *
 * AUTHENTICATION FLOW:
 * 1. Registration: User sends data → Validate → Hash password → Save to DB → Return tokens
 * 2. Login: User sends credentials → Validate → Check password → Generate tokens → Return
 * 3. Token Refresh: User sends refresh token → Verify → Generate new access token → Return
 *
 * SECURITY BEST PRACTICES IMPLEMENTED:
 * - Passwords are hashed with bcrypt (12 rounds) - NEVER store plain text passwords!
 * - JWT tokens expire (access: 15min, refresh: 7 days)
 * - Duplicate email check before registration
 * - Password comparison uses timing-safe comparison
 * - Sensitive errors don't reveal system details
 */

import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt.util';
import { UserSegment, SubscriptionPlan } from '../types';
import logger from '../utils/logger.util';

/**
 * REGISTER NEW USER
 *
 * Creates a new user account with the provided information.
 *
 * PROCESS FLOW:
 * 1. Check if email already exists (prevent duplicates)
 * 2. Generate unique user_id
 * 3. Calculate subscription expiry date
 * 4. Create user document (password will be auto-hashed by model pre-save hook)
 * 5. Generate JWT tokens
 * 6. Return success with tokens
 *
 * REQUEST BODY:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "MyPass@123",
 *   "age": 24,
 *   "segment": "competitive_exam",
 *   "target_exam": "CAT_2025",  // optional
 *   "subscription_plan": "free"  // optional, defaults to free
 * }
 *
 * SUCCESS RESPONSE (201):
 * {
 *   "success": true,
 *   "message": "Registration successful",
 *   "data": {
 *     "user": { ... user object without password ... },
 *     "access_token": "eyJhbGc...",
 *     "refresh_token": "eyJhbGc...",
 *     "token_type": "Bearer",
 *     "expires_in": 900  // seconds (15 minutes)
 *   }
 * }
 *
 * ERROR RESPONSES:
 * - 400: Validation error or email already exists
 * - 500: Server error
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT AND VALIDATE DATA
    // ========================================================================
    // At this point, data is already validated by Joi middleware
    // But we extract it here for clarity and type safety

    const { name, email, password, age, segment, target_exam, subscription_plan } = req.body;

    logger.info(`Registration attempt for email: ${email}`);

    // ========================================================================
    // STEP 2: CHECK IF EMAIL ALREADY EXISTS
    // ========================================================================
    // We must ensure email is unique before creating account
    // Using findOne() is more efficient than find() for single result

    const existingUser = await UserModel.findOne({ 'profile.email': email });

    if (existingUser) {
      logger.warn(`Registration failed: Email already exists - ${email}`);
      res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
        error: 'EMAIL_EXISTS',
      });
      return;
    }

    // ========================================================================
    // STEP 3: GENERATE UNIQUE USER ID
    // ========================================================================
    // Our custom format: USR_0000001, USR_0000002, etc.
    // This is handled by the static method in User model

    const userId = await UserModel.generateUserId();
    logger.debug(`Generated user ID: ${userId}`);

    // ========================================================================
    // STEP 4: CALCULATE SUBSCRIPTION EXPIRY
    // ========================================================================
    // Free plan: 30 days trial
    // Basic plan: 1 year
    // Premium plan: 1 year

    const subscriptionValidTill = new Date();
    const plan = subscription_plan || SubscriptionPlan.FREE;

    if (plan === SubscriptionPlan.PREMIUM || plan === SubscriptionPlan.BASIC) {
      // Add 1 year to current date
      subscriptionValidTill.setFullYear(subscriptionValidTill.getFullYear() + 1);
    } else {
      // Free plan: 30 days
      subscriptionValidTill.setDate(subscriptionValidTill.getDate() + 30);
    }

    // ========================================================================
    // STEP 5: CREATE USER DOCUMENT
    // ========================================================================
    // The password will be automatically hashed by the pre-save hook in the model
    // We don't need to hash it manually here!

    const user = new UserModel({
      user_id: userId,
      profile: {
        name,
        email,
        age,
        segment,
        target_exam: target_exam || undefined, // Only for competitive_exam segment
        registration_date: new Date(),
        subscription: {
          plan,
          valid_till: subscriptionValidTill,
        },
      },
      password, // Will be hashed automatically by pre-save hook
      preferences: {
        // Set intelligent defaults based on user segment
        daily_goal_minutes: segment === UserSegment.KIDS ? 20 : segment === UserSegment.SCHOOL ? 25 : 30,
        difficulty_preference: 'adaptive', // Start with adaptive for everyone
        interface_theme:
          segment === UserSegment.KIDS
            ? 'colorful' // Kids get fun, colorful theme
            : segment === UserSegment.COMPETITIVE_EXAM
            ? 'minimal' // Competitive exam students get distraction-free theme
            : 'gamified', // School and professional get gamified theme
      },
      // Initialize empty progress
      progress_summary: {
        total_questions_attempted: 0,
        total_time_spent_minutes: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        modules_completed: [],
        skill_levels: new Map(),
      },
      // Initialize gamification at level 1
      gamification: {
        total_points: 0,
        current_level: 1,
        badges_earned: [],
        achievements: [],
        leaderboard_opt_in: segment !== UserSegment.KIDS, // Kids opt-out by default for safety
      },
    });

    // Save the user to database
    await user.save();

    logger.info(`User registered successfully: ${userId} (${email})`);

    // ========================================================================
    // STEP 6: GENERATE JWT TOKENS
    // ========================================================================
    // Create payload with essential user information
    // Keep payload small - don't include sensitive data!

    const tokenPayload: JwtPayload = {
      user_id: user.user_id,
      email: user.profile.email,
      segment: user.profile.segment,
      subscription_plan: user.profile.subscription.plan,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // ========================================================================
    // STEP 7: PREPARE USER OBJECT FOR RESPONSE
    // ========================================================================
    // Remove password from user object before sending to client
    // NEVER send password hashes to the client!

    const { password: _, ...userObject } = user.toObject();

    // ========================================================================
    // STEP 8: SEND SUCCESS RESPONSE
    // ========================================================================

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Coachify.',
      data: {
        user: userObject,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes in seconds
      },
    });

    logger.info(`Registration complete for user: ${userId}`);
  } catch (error: any) {
    // Catch any unexpected errors
    logger.error('Error during registration:', error);

    // Don't expose internal error details to client
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.',
      error: 'REGISTRATION_ERROR',
    });
  }
}

/**
 * USER LOGIN
 *
 * Authenticates a user and returns JWT tokens.
 *
 * PROCESS FLOW:
 * 1. Find user by email
 * 2. Check if user exists
 * 3. Verify password using bcrypt
 * 4. Generate JWT tokens
 * 5. Return tokens
 *
 * REQUEST BODY:
 * {
 *   "email": "john@example.com",
 *   "password": "MyPass@123"
 * }
 *
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "user": { ... user object without password ... },
 *     "access_token": "eyJhbGc...",
 *     "refresh_token": "eyJhbGc...",
 *     "token_type": "Bearer",
 *     "expires_in": 900
 *   }
 * }
 *
 * ERROR RESPONSES:
 * - 400: Validation error
 * - 401: Invalid credentials (wrong email or password)
 * - 500: Server error
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT CREDENTIALS
    // ========================================================================

    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);

    // ========================================================================
    // STEP 2: FIND USER BY EMAIL
    // ========================================================================
    // We need to explicitly select the password field
    // By default, password is excluded from queries (we set select: false in schema)

    const user = await UserModel.findOne({ 'profile.email': email }).select('+password');

    // Security Note: We use the same error message for "user not found" and "wrong password"
    // This prevents attackers from knowing which emails are registered
    if (!user) {
      logger.warn(`Login failed: User not found - ${email}`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // ========================================================================
    // STEP 3: VERIFY PASSWORD
    // ========================================================================
    // Use the comparePassword method from the User model
    // This uses bcrypt.compare() which is timing-safe

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for user - ${email}`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // ========================================================================
    // STEP 4: CHECK SUBSCRIPTION STATUS
    // ========================================================================
    // Optionally inform user if subscription has expired
    // We still allow login, but can add a warning

    let subscriptionWarning: string | undefined;
    const subscriptionExpiry = user.profile.subscription.valid_till;

    if (subscriptionExpiry && new Date() > subscriptionExpiry) {
      subscriptionWarning = 'Your subscription has expired. Please renew to access premium features.';
      logger.info(`User ${user.user_id} logged in with expired subscription`);
    }

    // ========================================================================
    // STEP 5: GENERATE JWT TOKENS
    // ========================================================================

    const tokenPayload: JwtPayload = {
      user_id: user.user_id,
      email: user.profile.email,
      segment: user.profile.segment,
      subscription_plan: user.profile.subscription.plan,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // ========================================================================
    // STEP 6: UPDATE LAST LOGIN (OPTIONAL)
    // ========================================================================
    // You can track when user last logged in
    // Uncomment if you add a last_login field to your schema

    // user.profile.last_login = new Date();
    // await user.save();

    // ========================================================================
    // STEP 7: PREPARE RESPONSE
    // ========================================================================
    // Remove password from response

    const { password: _, ...userObject } = user.toObject();

    // ========================================================================
    // STEP 8: SEND SUCCESS RESPONSE
    // ========================================================================

    const responseData: any = {
      user: userObject,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
    };

    // Add subscription warning if applicable
    if (subscriptionWarning) {
      responseData.warning = subscriptionWarning;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful! Welcome back.',
      data: responseData,
    });

    logger.info(`User logged in successfully: ${user.user_id} (${email})`);
  } catch (error: any) {
    logger.error('Error during login:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.',
      error: 'LOGIN_ERROR',
    });
  }
}

/**
 * REFRESH ACCESS TOKEN
 *
 * Generates a new access token using a valid refresh token.
 * This allows users to stay logged in without entering credentials repeatedly.
 *
 * PROCESS FLOW:
 * 1. Extract refresh token from request
 * 2. Verify refresh token
 * 3. Load user from database (check if still exists)
 * 4. Generate new access token
 * 5. Optionally generate new refresh token (refresh token rotation)
 * 6. Return new tokens
 *
 * REQUEST BODY:
 * {
 *   "refresh_token": "eyJhbGc..."
 * }
 *
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Token refreshed successfully",
 *   "data": {
 *     "access_token": "eyJhbGc...",
 *     "refresh_token": "eyJhbGc...",  // New refresh token (optional)
 *     "token_type": "Bearer",
 *     "expires_in": 900
 *   }
 * }
 *
 * ERROR RESPONSES:
 * - 401: Invalid or expired refresh token
 * - 404: User not found (account deleted)
 * - 500: Server error
 */
export async function refreshAccessToken(req: Request, res: Response): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: EXTRACT REFRESH TOKEN
    // ========================================================================

    const { refresh_token } = req.body;

    logger.debug('Token refresh attempt');

    // ========================================================================
    // STEP 2: VERIFY REFRESH TOKEN
    // ========================================================================

    let decoded;
    try {
      decoded = verifyRefreshToken(refresh_token);
    } catch (error: any) {
      logger.warn(`Token refresh failed: ${error.message}`);
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid refresh token.',
        error: 'INVALID_REFRESH_TOKEN',
      });
      return;
    }

    // ========================================================================
    // STEP 3: LOAD USER FROM DATABASE
    // ========================================================================
    // Verify user still exists (account might have been deleted)

    const user = await UserModel.findOne({ user_id: decoded.user_id });

    if (!user) {
      logger.warn(`Token refresh failed: User not found - ${decoded.user_id}`);
      res.status(404).json({
        success: false,
        message: 'User account not found. Please login again.',
        error: 'USER_NOT_FOUND',
      });
      return;
    }

    // ========================================================================
    // STEP 4: GENERATE NEW TOKENS
    // ========================================================================
    // Create fresh token payload with current user data
    // This ensures any subscription/segment changes are reflected

    const tokenPayload: JwtPayload = {
      user_id: user.user_id,
      email: user.profile.email,
      segment: user.profile.segment,
      subscription_plan: user.profile.subscription.plan,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    // OPTIONAL: Refresh Token Rotation
    // Generate a new refresh token and invalidate the old one
    // This is a security best practice
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // TODO: In production, you should:
    // 1. Store refresh tokens in database or Redis
    // 2. Invalidate old refresh token when issuing new one
    // 3. Track token usage to detect suspicious activity

    // ========================================================================
    // STEP 5: SEND RESPONSE
    // ========================================================================

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken, // Send new refresh token
        token_type: 'Bearer',
        expires_in: 900,
      },
    });

    logger.debug(`Token refreshed for user: ${user.user_id}`);
  } catch (error: any) {
    logger.error('Error during token refresh:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred while refreshing token.',
      error: 'TOKEN_REFRESH_ERROR',
    });
  }
}

/**
 * GET CURRENT USER PROFILE
 *
 * Returns the profile of the currently authenticated user.
 * This endpoint is protected by authenticate middleware.
 *
 * REQUEST:
 * Headers: Authorization: Bearer <access_token>
 *
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... user object without password ... }
 *   }
 * }
 *
 * ERROR RESPONSES:
 * - 401: Not authenticated
 * - 404: User not found
 * - 500: Server error
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // req.user is set by authenticate middleware
    // If we reach here, user is already authenticated

    if (!req.user) {
      // This shouldn't happen if middleware is set up correctly
      logger.error('getCurrentUser called without authentication');
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        error: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Remove password from response
    const userObject = req.user.toObject();
    delete userObject.password;

    res.status(200).json({
      success: true,
      data: {
        user: userObject,
      },
    });
  } catch (error: any) {
    logger.error('Error getting current user:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user profile.',
      error: 'PROFILE_FETCH_ERROR',
    });
  }
}

/**
 * LOGOUT (OPTIONAL)
 *
 * Logs out the current user.
 * Since we're using stateless JWT, logout is handled client-side by deleting tokens.
 * However, this endpoint can be used for:
 * 1. Logging logout events
 * 2. Invalidating refresh tokens (if stored in database/Redis)
 * 3. Analytics
 *
 * REQUEST:
 * Headers: Authorization: Bearer <access_token>
 *
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    // Log the logout event
    if (req.user) {
      logger.info(`User logged out: ${req.user.user_id}`);
    }

    // TODO: If you store refresh tokens in database/Redis:
    // 1. Extract user_id from req.user
    // 2. Delete/invalidate their refresh tokens
    // 3. Optionally blacklist the current access token until it expires

    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please delete tokens on client side.',
    });
  } catch (error: any) {
    logger.error('Error during logout:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred during logout.',
      error: 'LOGOUT_ERROR',
    });
  }
}

/**
 * EXPORT ALL AUTHENTICATION CONTROLLERS
 *
 * Summary:
 * - register: Create new user account
 * - login: Authenticate user and get tokens
 * - refreshAccessToken: Get new access token using refresh token
 * - getCurrentUser: Get authenticated user's profile
 * - logout: Log out user (invalidate tokens)
 */

export default {
  register,
  login,
  refreshAccessToken,
  getCurrentUser,
  logout,
};
