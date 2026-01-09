import mongoose from 'mongoose';
import config from './env.config';
import logger from '../utils/logger.util';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    try {
      const dbUri =
        config.node.env === 'test' ? config.database.testUri : config.database.uri;

      const options = {
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        family: 4,
      };

      await mongoose.connect(dbUri, options);

      this.isConnected = true;

      mongoose.connection.on('connected', () => {
        logger.info(`MongoDB connected: ${dbUri}`);
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      if (mongoose.connection.readyState === 1) {
        return {
          status: 'healthy',
          message: 'Database connection is active',
        };
      }
      return {
        status: 'unhealthy',
        message: 'Database connection is not active',
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database health check failed: ${error}`,
      };
    }
  }
}

export default DatabaseConnection.getInstance();
