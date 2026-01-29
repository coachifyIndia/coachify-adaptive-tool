/**
 * INITIALIZE SUPER ADMIN SCRIPT
 *
 * Run this script to create the initial super admin for the admin dashboard.
 * Usage: npx ts-node scripts/init-super-admin.ts
 */

import mongoose from 'mongoose';
import config from '../src/config/env.config';
import { AdminModel, AdminRole } from '../src/models/admin.model';

async function initSuperAdmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.database.uri);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await AdminModel.findOne({ role: AdminRole.SUPER_ADMIN });

    if (existingSuperAdmin) {
      console.log('\n⚠️  Super admin already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Admin ID: ${existingSuperAdmin.admin_id}`);
      console.log('\nTo create a new super admin, delete the existing one first.');
      await mongoose.disconnect();
      return;
    }

    // Create super admin
    const superAdmin = new AdminModel({
      name: 'Super Admin',
      email: 'admin@coachify.com',
      password: 'Admin@123', // Will be hashed by pre-save hook
      role: AdminRole.SUPER_ADMIN,
      is_active: true,
    });

    await superAdmin.save();

    console.log('\n✅ Super admin created successfully!');
    console.log('\n   Login credentials:');
    console.log('   ─────────────────────────────────');
    console.log(`   Email: admin@coachify.com`);
    console.log(`   Password: Admin@123`);
    console.log(`   Admin ID: ${superAdmin.admin_id}`);
    console.log('   ─────────────────────────────────');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error initializing super admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

initSuperAdmin();
