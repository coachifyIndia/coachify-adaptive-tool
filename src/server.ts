/**
 * COACHIFY ADAPTIVE LEARNING ENGINE - SERVER
 *
 * This is the main entry point of the application.
 * It sets up the Express server, connects to database, and starts listening for requests.
 *
 * IMPORTANT FOR JUNIOR DEVELOPERS:
 * - This file initializes the entire application
 * - It runs when you execute: npm run dev or npm start
 * - Think of it as the "main()" function in other languages
 * - Order of initialization matters! Database must connect before routes work.
 *
 * STARTUP SEQUENCE:
 * 1. Load environment configuration
 * 2. Create Express application
 * 3. Apply security middleware (CORS, Helmet, Rate Limiting)
 * 4. Apply utility middleware (Body Parser, Morgan Logger, Compression)
 * 5. Connect to MongoDB database
 * 6. Register API routes
 * 7. Apply error handling middleware
 * 8. Start HTTP server
 *
 * ARCHITECTURE OVERVIEW:
 * Request → CORS → Helmet → Rate Limit → Body Parser → Routes → Controllers → Models → Database
 * Response ← Error Handler ← Controllers ← Routes ← Middleware ← Request
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';

import config from './config/env.config';
import database from './config/database.config';
import logger from './utils/logger.util';

// Import routes
import authRoutes from './routes/auth.routes';
import practiceRoutes from './routes/practice.routes';
import analyticsRoutes from './routes/analytics.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { adminRoutes } from './admin/routes';

/**
 * CREATE EXPRESS APPLICATION
 *
 * Express is a web framework for Node.js.
 * It handles HTTP requests, routing, middleware, etc.
 */
const app: Express = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

/**
 * 1. CORS (Cross-Origin Resource Sharing)
 *
 * WHAT IT DOES:
 * - Allows our API to be accessed from different domains (frontend apps)
 * - Without CORS, browsers block requests from different origins for security
 *
 * EXAMPLE:
 * - Our API runs on: http://localhost:5000
 * - Our frontend runs on: http://localhost:3000
 * - CORS allows the frontend to call our API
 *
 * SECURITY NOTE:
 * - In production, restrict allowed origins to your actual frontend domains
 * - Never use origin: '*' in production!
 */
app.use(
  cors({
    origin: config.node.env === 'production'
      ? config.cors.origin
      : (_origin, callback) => {
          // In development: Allow all origins (including Playwright tests)
          callback(null, true);
        },
    // In production: Only allow specific domains from config
    credentials: true, // Allow cookies and authentication headers
  })
);

/**
 * 2. HELMET - Security Headers
 *
 * WHAT IT DOES:
 * - Sets various HTTP headers to protect against common web vulnerabilities
 * - Prevents XSS attacks, clickjacking, and other security issues
 *
 * HEADERS SET:
 * - X-DNS-Prefetch-Control: Controls browser DNS prefetching
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - X-XSS-Protection: Enables browser XSS protection
 * - And many more security headers
 *
 * JUNIOR DEV TIP:
 * - Always use helmet() in production
 * - It's a simple one-liner that adds major security
 */
app.use(helmet());

/**
 * 3. RATE LIMITING
 *
 * WHAT IT DOES:
 * - Limits number of requests from a single IP address
 * - Protects against brute force attacks and DDoS
 * - Prevents API abuse
 *
 * CURRENT LIMITS:
 * - 100 requests per 15 minutes per IP
 * - Customize per route if needed (stricter for login, looser for public endpoints)
 *
 * EXAMPLE:
 * - If someone tries to brute force login, they'll be blocked after 100 attempts
 * - Prevents server overload from malicious users
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.node.env === 'development' ? 1000 : 100, // Higher limit in development for testing
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(limiter);

/**
 * 4. BODY PARSER
 *
 * WHAT IT DOES:
 * - Parses incoming request bodies
 * - Converts JSON strings to JavaScript objects
 * - Makes req.body available in controllers
 *
 * EXAMPLE:
 * Client sends: {"email": "user@example.com"}
 * Without parser: req.body is undefined
 * With parser: req.body = { email: 'user@example.com' }
 *
 * LIMIT:
 * - Set to 10mb to prevent huge payload attacks
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * 5. MONGO SANITIZE
 *
 * WHAT IT DOES:
 * - Prevents MongoDB injection attacks
 * - Removes $ and . characters from user input
 * - Protects against malicious queries
 *
 * EXAMPLE ATTACK IT PREVENTS:
 * Malicious input: {"email": {"$gt": ""}, "password": {"$gt": ""}}
 * This could bypass authentication!
 * Mongo Sanitize removes the $ operators
 *
 * JUNIOR DEV TIP:
 * - ALWAYS sanitize user input
 * - Never trust data from clients!
 */
app.use(mongoSanitize());

/**
 * 6. COMPRESSION
 *
 * WHAT IT DOES:
 * - Compresses response bodies using gzip
 * - Reduces bandwidth usage
 * - Faster response times for clients
 *
 * EXAMPLE:
 * - 100KB JSON response → Compressed to ~20KB
 * - Saves bandwidth and speeds up API
 */
app.use(compression());

/**
 * 7. MORGAN - HTTP REQUEST LOGGER
 *
 * WHAT IT DOES:
 * - Logs all HTTP requests to console and/or file
 * - Helps with debugging and monitoring
 *
 * FORMAT:
 * - Development: Colored, detailed logs
 * - Production: JSON format for log aggregation tools
 *
 * EXAMPLE LOG:
 * POST /api/v1/auth/login 200 234ms
 */
if (config.node.env === 'development') {
  app.use(morgan('dev')); // Colored output for development
} else {
  // In production, integrate with Winston logger
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 *
 * PURPOSE:
 * - Check if server is running
 * - Used by load balancers and monitoring tools
 * - Returns server status and version
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Coachify API is running',
    data: {
      status: 'healthy',
      environment: config.node.env,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @route   GET /
 * @desc    Root endpoint - API information
 * @access  Public
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Coachify Adaptive Learning Engine API',
    data: {
      version: '1.0.0',
      documentation: '/api/v1/docs', // Future: API documentation
      endpoints: {
        authentication: '/api/v1/auth',
        practice: '/api/v1/practice',
        analytics: '/api/v1/analytics',
        dashboard: '/api/v1/dashboard',
        admin: '/api/v1/admin',
      },
    },
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * MOUNT API ROUTES
 *
 * All routes are prefixed with /api/v1/
 * This allows for API versioning in the future.
 *
 * CURRENT ROUTES:
 * - /api/v1/auth/*         - Authentication endpoints
 * - /api/v1/practice/*     - Practice sessions (ADAPTIVE LEARNING!)
 *
 * FUTURE ROUTES:
 * - /api/v1/questions/*    - Question management
 * - /api/v1/videos/*       - Video lectures
 * - /api/v1/progress/*     - User progress tracking
 * - /api/v1/leaderboard/*  - Leaderboard and rankings
 */

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/practice', practiceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);

// TODO: Add more routes as you build them
// app.use('/api/v1/questions', questionRoutes);
// app.use('/api/v1/videos', videoRoutes);
// app.use('/api/v1/progress', progressRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 - NOT FOUND HANDLER
 *
 * This catches all requests to undefined routes.
 * Must be placed AFTER all valid routes.
 */
app.use((req: Request, res: Response, _next: NextFunction) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: 'NOT_FOUND',
  });
});

/**
 * GLOBAL ERROR HANDLER
 *
 * This catches all errors thrown in the application.
 * It prevents the server from crashing and sends proper error responses.
 *
 * TYPES OF ERRORS HANDLED:
 * 1. Validation errors
 * 2. Database errors
 * 3. Authentication errors
 * 4. Unexpected errors
 *
 * IMPORTANT:
 * - This must be the LAST middleware
 * - It has 4 parameters (err, req, res, next) to identify it as error handler
 */
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Prepare error response
  const errorResponse: any = {
    success: false,
    message: err.message || 'An unexpected error occurred',
    error: err.name || 'INTERNAL_ERROR',
  };

  // In development, include stack trace for debugging
  if (config.node.env === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
});

// ============================================================================
// START SERVER
// ============================================================================

/**
 * SERVER INITIALIZATION FUNCTION
 *
 * This function:
 * 1. Connects to MongoDB database
 * 2. Starts the HTTP server
 * 3. Handles graceful shutdown
 */
async function startServer() {
  try {
    // ========================================================================
    // STEP 1: CONNECT TO DATABASE
    // ========================================================================

    logger.info('🚀 Starting Coachify Adaptive Learning Engine...');
    logger.info(`Environment: ${config.node.env}`);
    logger.info(`Port: ${config.server.port}`);

    logger.info('Connecting to MongoDB...');
    await database.connect();
    logger.info('✅ Database connected successfully');

    // ========================================================================
    // STEP 1.5: INITIALIZE DEFAULT SUPER ADMIN (if not exists)
    // ========================================================================
    try {
      const { adminAuthService } = await import('./admin/services/auth.service');
      const defaultAdmin = await adminAuthService.initializeSuperAdmin(
        'Super Admin',
        'admin@coachify.com',
        'Admin@123'
      );
      if (defaultAdmin) {
        logger.info('✅ Default super admin created: admin@coachify.com / Admin@123');
      }
    } catch (error) {
      logger.debug('Super admin initialization skipped (may already exist)');
    }

    // ========================================================================
    // STEP 2: START HTTP SERVER
    // ========================================================================

    const server = app.listen(config.server.port, () => {
      logger.info('═'.repeat(60));
      logger.info(`✨ Server is running on port ${config.server.port}`);
      logger.info(`📍 API Base URL: http://localhost:${config.server.port}/api/v1`);
      logger.info(`🏥 Health Check: http://localhost:${config.server.port}/health`);
      logger.info('═'.repeat(60));
    });

    // ========================================================================
    // STEP 3: GRACEFUL SHUTDOWN HANDLING
    // ========================================================================

    /**
     * GRACEFUL SHUTDOWN
     *
     * When the server is stopped (Ctrl+C or process kill):
     * 1. Stop accepting new requests
     * 2. Finish processing existing requests
     * 3. Close database connections
     * 4. Exit cleanly
     *
     * This prevents data corruption and connection leaks.
     */
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await database.disconnect();
          logger.info('Database disconnected');

          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ========================================================================
    // STEP 4: HANDLE UNCAUGHT ERRORS
    // ========================================================================

    /**
     * UNCAUGHT EXCEPTION HANDLER
     *
     * Catches errors that weren't caught anywhere else.
     * This is a last resort - properly handle errors in code instead!
     */
    process.on('uncaughtException', (error: Error) => {
      logger.error('UNCAUGHT EXCEPTION! Shutting down...');
      logger.error(error);

      process.exit(1);
    });

    /**
     * UNHANDLED PROMISE REJECTION HANDLER
     *
     * Catches promise rejections that weren't handled with .catch()
     * Always use try-catch or .catch() with promises!
     */
    process.on('unhandledRejection', (reason: any) => {
      logger.error('UNHANDLED REJECTION! Shutting down...');
      logger.error(reason);

      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTE SERVER STARTUP
// ============================================================================

/**
 * START THE SERVER
 *
 * This runs when you execute: npm run dev or npm start
 */
startServer();

/**
 * EXPORT APP FOR TESTING
 *
 * This allows us to import the app in test files without starting the server.
 */
export default app;
