import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

async function setUserPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/adaptive_learning_engine');
    console.log('Connected to MongoDB');

    const email = 'rahul.sharma@testmail.com';
    const password = 'Test@123';

    // Find user
    const user = await mongoose.connection.db.collection('users').findOne({ 'profile.email': email });

    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:', user.user_id);
    console.log('Email:', user.profile.email);

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    console.log('\n🔐 Hashing password...');
    console.log('Password hash created:', passwordHash.substring(0, 20) + '...');

    // Update user with password
    await mongoose.connection.db.collection('users').updateOne(
      { 'profile.email': email },
      { $set: { 'authentication.password_hash': passwordHash } }
    );

    console.log('\n✅ Password set successfully!');
    console.log('\nYou can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', password);

    // Test the password
    const isMatch = await bcryptjs.compare(password, passwordHash);
    console.log('\n✅ Password verification test:', isMatch ? 'PASSED' : 'FAILED');

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setUserPassword();
