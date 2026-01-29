/**
 * ADMIN AUTH SERVICE
 *
 * Handles admin authentication operations.
 * Separate from user auth for security isolation.
 */

import { AdminModel, IAdmin, AdminRole } from '../../models/admin.model';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminRefreshToken,
  AdminJwtPayload,
} from '../middlewares/admin-auth.middleware';
import logger from '../../utils/logger.util';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminLoginResult {
  admin: {
    admin_id: string;
    name: string;
    email: string;
    role: AdminRole;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds
  };
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  role?: AdminRole;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AdminAuthService {
  /**
   * Admin login
   */
  async login(email: string, password: string): Promise<AdminLoginResult | null> {
    try {
      // Find admin by email (include password for comparison)
      const admin = await AdminModel.findOne({ email: email.toLowerCase() }).select(
        '+password'
      );

      if (!admin) {
        logger.warn(`Admin login failed: email not found - ${email}`);
        return null;
      }

      // Check if admin is active
      if (!admin.is_active) {
        logger.warn(`Admin login failed: account inactive - ${email}`);
        return null;
      }

      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        logger.warn(`Admin login failed: invalid password - ${email}`);
        return null;
      }

      // Update last login
      admin.last_login = new Date();
      await admin.save();

      // Generate tokens
      const payload: AdminJwtPayload = {
        admin_id: admin.admin_id,
        email: admin.email,
        role: admin.role,
      };

      const accessToken = generateAdminAccessToken(payload);
      const refreshToken = generateAdminRefreshToken(payload);

      logger.info(`Admin logged in: ${admin.admin_id} (${admin.email})`);

      return {
        admin: {
          admin_id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 4 * 60 * 60, // 4 hours in seconds
        },
      };
    } catch (error: any) {
      logger.error('Error in admin login:', error);
      throw error;
    }
  }

  /**
   * Refresh admin tokens
   */
  async refreshTokens(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } | null> {
    try {
      // Verify the refresh token
      const decoded = verifyAdminRefreshToken(refreshToken);

      // Verify admin still exists and is active
      const admin = await AdminModel.findOne({ admin_id: decoded.admin_id });

      if (!admin || !admin.is_active) {
        logger.warn(`Token refresh failed: admin not found or inactive - ${decoded.admin_id}`);
        return null;
      }

      // Generate new tokens
      const payload: AdminJwtPayload = {
        admin_id: admin.admin_id,
        email: admin.email,
        role: admin.role,
      };

      const newAccessToken = generateAdminAccessToken(payload);
      const newRefreshToken = generateAdminRefreshToken(payload);

      logger.debug(`Admin tokens refreshed: ${admin.admin_id}`);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 4 * 60 * 60,
      };
    } catch (error: any) {
      logger.warn(`Token refresh failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new admin (requires super admin)
   */
  async createAdmin(
    input: CreateAdminInput,
    createdByAdminId: string
  ): Promise<IAdmin> {
    try {
      // Check if email already exists
      const existingAdmin = await AdminModel.findOne({
        email: input.email.toLowerCase(),
      });

      if (existingAdmin) {
        throw new Error('Admin with this email already exists');
      }

      // Create the admin
      const admin = new AdminModel({
        name: input.name,
        email: input.email.toLowerCase(),
        password: input.password,
        role: input.role || AdminRole.CONTENT_ADMIN,
        is_active: true,
        created_by: createdByAdminId,
      });

      await admin.save();

      logger.info(`Admin created: ${admin.admin_id} by ${createdByAdminId}`);

      // Don't return password
      admin.password = undefined as any;
      return admin;
    } catch (error: any) {
      logger.error('Error creating admin:', error);
      throw error;
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<IAdmin | null> {
    try {
      return await AdminModel.findOne({ admin_id: adminId });
    } catch (error: any) {
      logger.error('Error getting admin:', error);
      throw error;
    }
  }

  /**
   * Get all admins
   */
  async getAllAdmins(): Promise<IAdmin[]> {
    try {
      return await AdminModel.find().sort({ created_at: -1 });
    } catch (error: any) {
      logger.error('Error getting all admins:', error);
      throw error;
    }
  }

  /**
   * Update admin
   */
  async updateAdmin(
    adminId: string,
    updates: {
      name?: string;
      role?: AdminRole;
      is_active?: boolean;
    }
  ): Promise<IAdmin | null> {
    try {
      const admin = await AdminModel.findOne({ admin_id: adminId });
      if (!admin) {
        return null;
      }

      if (updates.name !== undefined) {
        admin.name = updates.name;
      }
      if (updates.role !== undefined) {
        admin.role = updates.role;
      }
      if (updates.is_active !== undefined) {
        admin.is_active = updates.is_active;
      }

      await admin.save();

      logger.info(`Admin updated: ${adminId}`);
      return admin;
    } catch (error: any) {
      logger.error('Error updating admin:', error);
      throw error;
    }
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const admin = await AdminModel.findOne({ admin_id: adminId }).select('+password');
      if (!admin) {
        return false;
      }

      // Verify current password
      const isValid = await admin.comparePassword(currentPassword);
      if (!isValid) {
        logger.warn(`Password change failed: invalid current password - ${adminId}`);
        return false;
      }

      // Update password
      admin.password = newPassword;
      await admin.save();

      logger.info(`Admin password changed: ${adminId}`);
      return true;
    } catch (error: any) {
      logger.error('Error changing admin password:', error);
      throw error;
    }
  }

  /**
   * Deactivate admin
   */
  async deactivateAdmin(adminId: string): Promise<boolean> {
    try {
      const admin = await AdminModel.findOne({ admin_id: adminId });
      if (!admin) {
        return false;
      }

      admin.is_active = false;
      await admin.save();

      logger.info(`Admin deactivated: ${adminId}`);
      return true;
    } catch (error: any) {
      logger.error('Error deactivating admin:', error);
      throw error;
    }
  }

  /**
   * Reactivate admin
   */
  async reactivateAdmin(adminId: string): Promise<boolean> {
    try {
      const admin = await AdminModel.findOne({ admin_id: adminId });
      if (!admin) {
        return false;
      }

      admin.is_active = true;
      await admin.save();

      logger.info(`Admin reactivated: ${adminId}`);
      return true;
    } catch (error: any) {
      logger.error('Error reactivating admin:', error);
      throw error;
    }
  }

  /**
   * Delete admin (soft delete by setting is_active to false, or hard delete)
   */
  async deleteAdmin(adminId: string, hardDelete: boolean = false): Promise<boolean> {
    try {
      const admin = await AdminModel.findOne({ admin_id: adminId });
      if (!admin) {
        return false;
      }

      if (hardDelete) {
        await AdminModel.deleteOne({ admin_id: adminId });
        logger.info(`Admin hard deleted: ${adminId}`);
      } else {
        admin.is_active = false;
        await admin.save();
        logger.info(`Admin soft deleted (deactivated): ${adminId}`);
      }

      return true;
    } catch (error: any) {
      logger.error('Error deleting admin:', error);
      throw error;
    }
  }

  /**
   * Initialize first super admin (for setup)
   */
  async initializeSuperAdmin(
    name: string,
    email: string,
    password: string
  ): Promise<IAdmin | null> {
    try {
      // Check if any super admin exists
      const existingSuperAdmin = await AdminModel.findOne({
        role: AdminRole.SUPER_ADMIN,
      });

      if (existingSuperAdmin) {
        logger.warn('Super admin already exists, skipping initialization');
        return null;
      }

      const admin = new AdminModel({
        name,
        email: email.toLowerCase(),
        password,
        role: AdminRole.SUPER_ADMIN,
        is_active: true,
      });

      await admin.save();

      logger.info(`Initial super admin created: ${admin.admin_id}`);

      admin.password = undefined as any;
      return admin;
    } catch (error: any) {
      logger.error('Error initializing super admin:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();
