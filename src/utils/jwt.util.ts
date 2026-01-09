/**
 * JWT UTILITY FUNCTIONS
 *
 * This file contains helper functions for JSON Web Token (JWT) operations.
 * JWTs are used to securely transmit information between parties and for authentication.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - JWT (JSON Web Token) is a secure way to verify user identity
 * - It consists of 3 parts: Header, Payload, Signature
 * - The token is signed with a secret key that only the server knows
 * - We use TWO types of tokens:
 *   1. ACCESS TOKEN: Short-lived (15 minutes), used for API requests
 *   2. REFRESH TOKEN: Long-lived (7 days), used to get new access tokens
 *
 * WHY TWO TOKENS?
 * - If someone steals an access token, it expires quickly (15 min)
 * - Refresh token is stored more securely and rarely transmitted
 * - This is called "Refresh Token Rotation" - a security best practice
 *
 * SECURITY NOTES:
 * - NEVER share your JWT_SECRET or JWT_REFRESH_SECRET
 * - Access tokens should be stored in memory (not localStorage)
 * - Refresh tokens can be stored in httpOnly cookies
 * - Always use HTTPS in production to prevent token interception
 */

import jwt from 'jsonwebtoken';
import config from '../config/env.config';
import logger from './logger.util';

/**
 * PAYLOAD INTERFACE
 *
 * This defines what information we store inside the JWT token.
 * Keep payloads small - don't store sensitive data like passwords!
 */
export interface JwtPayload {
  user_id: string; // Our custom user ID (e.g., "USR_0000001")
  email: string; // User's email for quick reference
  segment: string; // User segment (competitive_exam, school, kids, professional)
  subscription_plan: string; // User's subscription level (free, basic, premium)
}

/**
 * DECODED TOKEN INTERFACE
 *
 * This is what we get back after verifying a JWT token.
 * It includes our payload plus JWT standard fields.
 */
export interface DecodedToken extends JwtPayload {
  iat: number; // "Issued At" - timestamp when token was created
  exp: number; // "Expiration" - timestamp when token expires
}

/**
 * GENERATE ACCESS TOKEN
 *
 * Creates a short-lived access token (15 minutes) for API authentication.
 * This token is sent with every API request in the Authorization header.
 *
 * HOW IT WORKS:
 * 1. Takes user information (payload)
 * 2. Signs it with our secret key
 * 3. Sets expiration to 15 minutes
 * 4. Returns the signed token string
 *
 * @param payload - User information to encode in the token
 * @returns Signed JWT access token string
 *
 * @example
 * const token = generateAccessToken({
 *   user_id: 'USR_0000001',
 *   email: 'user@example.com',
 *   segment: 'competitive_exam',
 *   subscription_plan: 'premium'
 * });
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function generateAccessToken(payload: JwtPayload): string {
  try {
    // STEP 1: Get the secret key from environment configuration
    const secret = config.jwt.secret;

    // STEP 2: Sign the token with payload and set expiration
    // The 'expiresIn' option automatically adds 'exp' field to the token
    const token = jwt.sign(payload, secret, {
      expiresIn: config.jwt.accessTokenExpiry as string, // '15m' (15 minutes)
      algorithm: 'HS256' as const, // HMAC with SHA-256 - industry standard
    } as jwt.SignOptions);

    logger.debug(`Access token generated for user: ${payload.user_id}`);
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * GENERATE REFRESH TOKEN
 *
 * Creates a long-lived refresh token (7 days) for getting new access tokens.
 * This token is stored securely and used only to obtain new access tokens.
 *
 * WHY SEPARATE REFRESH TOKEN?
 * - Access tokens expire quickly (15 min) for security
 * - Without refresh token, users would need to login every 15 minutes
 * - Refresh token allows seamless re-authentication
 *
 * SECURITY BEST PRACTICE:
 * - Store in httpOnly cookie (can't be accessed by JavaScript)
 * - Only send to /auth/refresh endpoint
 * - Implement refresh token rotation (invalidate after use)
 *
 * @param payload - User information to encode in the token
 * @returns Signed JWT refresh token string
 *
 * @example
 * const refreshToken = generateRefreshToken({
 *   user_id: 'USR_0000001',
 *   email: 'user@example.com',
 *   segment: 'competitive_exam',
 *   subscription_plan: 'premium'
 * });
 */
export function generateRefreshToken(payload: JwtPayload): string {
  try {
    // STEP 1: Get the refresh secret (DIFFERENT from access token secret!)
    // Using different secrets adds an extra layer of security
    const secret = config.jwt.refreshSecret;

    // STEP 2: Sign the token with longer expiration
    const token = jwt.sign(payload, secret, {
      expiresIn: config.jwt.refreshTokenExpiry as string, // '7d' (7 days)
      algorithm: 'HS256' as const,
    } as jwt.SignOptions);

    logger.debug(`Refresh token generated for user: ${payload.user_id}`);
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * VERIFY ACCESS TOKEN
 *
 * Validates an access token and extracts the user information from it.
 * This is used by authentication middleware to verify requests.
 *
 * WHAT IT CHECKS:
 * 1. Signature is valid (token wasn't tampered with)
 * 2. Token hasn't expired
 * 3. Token was signed with our secret key
 *
 * @param token - The JWT token string to verify
 * @returns Decoded token payload with user information
 * @throws Error if token is invalid, expired, or tampered with
 *
 * @example
 * try {
 *   const decoded = verifyAccessToken(token);
 *   console.log(`Authenticated user: ${decoded.user_id}`);
 * } catch (error) {
 *   console.log('Invalid token!');
 * }
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    // STEP 1: Verify the token using the access token secret
    // This will throw an error if:
    // - Token signature is invalid (tampered with)
    // - Token has expired
    // - Token format is invalid
    const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;

    logger.debug(`Access token verified for user: ${decoded.user_id}`);
    return decoded;
  } catch (error: any) {
    // Handle different types of JWT errors
    if (error.name === 'TokenExpiredError') {
      logger.warn('Access token expired');
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token');
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying access token:', error);
      throw new Error('Token verification failed');
    }
  }
}

/**
 * VERIFY REFRESH TOKEN
 *
 * Validates a refresh token and extracts user information.
 * This is used when a user wants to get a new access token.
 *
 * IMPORTANT SECURITY NOTE:
 * - This uses a DIFFERENT secret than access tokens
 * - After verifying a refresh token, you should:
 *   1. Generate new access token
 *   2. Optionally rotate the refresh token (generate new one)
 *   3. Invalidate the old refresh token
 *
 * @param token - The JWT refresh token string to verify
 * @returns Decoded token payload with user information
 * @throws Error if token is invalid, expired, or tampered with
 *
 * @example
 * try {
 *   const decoded = verifyRefreshToken(refreshToken);
 *   const newAccessToken = generateAccessToken(decoded);
 *   // Send newAccessToken to user
 * } catch (error) {
 *   // User needs to login again
 * }
 */
export function verifyRefreshToken(token: string): DecodedToken {
  try {
    // Verify using the refresh token secret
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as DecodedToken;

    logger.debug(`Refresh token verified for user: ${decoded.user_id}`);
    return decoded;
  } catch (error: any) {
    // Handle different types of JWT errors
    if (error.name === 'TokenExpiredError') {
      logger.warn('Refresh token expired');
      throw new Error('Refresh token has expired. Please login again.');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid refresh token');
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Error verifying refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }
}

/**
 * DECODE TOKEN WITHOUT VERIFICATION
 *
 * Extracts information from a JWT token WITHOUT verifying it.
 * ONLY use this for debugging or when you don't need security verification.
 *
 * ⚠️ WARNING FOR JUNIOR DEVELOPERS:
 * - This does NOT check if the token is valid!
 * - This does NOT check if the token has expired!
 * - This does NOT check if the token was tampered with!
 * - NEVER use this for authentication or authorization!
 * - Use verifyAccessToken() or verifyRefreshToken() instead!
 *
 * WHEN TO USE:
 * - Debugging token contents
 * - Reading token expiry time for UI display
 * - Extracting user_id for logging (after already verifying)
 *
 * @param token - The JWT token string to decode
 * @returns Decoded token payload (unverified!)
 *
 * @example
 * // For debugging only:
 * const decoded = decodeTokenUnsafe(token);
 * console.log(`Token expires at: ${new Date(decoded.exp * 1000)}`);
 */
export function decodeTokenUnsafe(token: string): DecodedToken | null {
  try {
    // jwt.decode() extracts the payload WITHOUT verification
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
}

/**
 * CHECK IF TOKEN IS EXPIRED
 *
 * Checks if a JWT token has expired by comparing its expiry time with current time.
 * This is a helper function for token management.
 *
 * NOTE: This only checks expiration, not validity!
 * Use verifyAccessToken() to check both validity AND expiration.
 *
 * @param token - The JWT token string to check
 * @returns true if expired, false if still valid
 *
 * @example
 * if (isTokenExpired(myToken)) {
 *   console.log('Need to refresh the token');
 *   const newToken = await refreshAccessToken();
 * }
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Decode the token (without verification)
    const decoded = decodeTokenUnsafe(token);

    if (!decoded || !decoded.exp) {
      return true; // If we can't decode it, consider it expired
    }

    // JWT exp is in seconds, Date.now() is in milliseconds
    // So we multiply exp by 1000 to compare
    const currentTime = Date.now();
    const expiryTime = decoded.exp * 1000;

    return currentTime >= expiryTime;
  } catch (error) {
    logger.error('Error checking token expiration:', error);
    return true; // If error, consider it expired to be safe
  }
}

/**
 * GET TOKEN EXPIRY TIME
 *
 * Extracts the expiration timestamp from a token.
 * Useful for showing "Session expires in X minutes" to users.
 *
 * @param token - The JWT token string
 * @returns Expiration date object, or null if can't be extracted
 *
 * @example
 * const expiryDate = getTokenExpiryTime(token);
 * if (expiryDate) {
 *   const minutesLeft = Math.floor((expiryDate.getTime() - Date.now()) / 60000);
 *   console.log(`Session expires in ${minutesLeft} minutes`);
 * }
 */
export function getTokenExpiryTime(token: string): Date | null {
  try {
    const decoded = decodeTokenUnsafe(token);

    if (!decoded || !decoded.exp) {
      return null;
    }

    // Convert Unix timestamp (seconds) to JavaScript Date object
    return new Date(decoded.exp * 1000);
  } catch (error) {
    logger.error('Error getting token expiry time:', error);
    return null;
  }
}

/**
 * EXPORT ALL JWT UTILITIES
 *
 * Summary of what each function does:
 * - generateAccessToken(): Create short-lived token for API requests
 * - generateRefreshToken(): Create long-lived token for getting new access tokens
 * - verifyAccessToken(): Validate access token and get user info
 * - verifyRefreshToken(): Validate refresh token and get user info
 * - decodeTokenUnsafe(): Decode token WITHOUT security checks (debugging only!)
 * - isTokenExpired(): Check if token has expired
 * - getTokenExpiryTime(): Get token expiration date
 */

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeTokenUnsafe,
  isTokenExpired,
  getTokenExpiryTime,
};
