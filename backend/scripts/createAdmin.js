const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexastyle';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@nexastyle.com';
    const adminPassword = 'admin123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      // Update existing user to admin
      existingAdmin.role = 'admin';
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log('Admin user updated successfully!');
      console.log('\n=== ADMIN CREDENTIALS ===');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPassword);
      console.log('Admin URL: http://localhost:3000/admin');
      console.log('========================\n');
    } else {
      // Create new admin user
      const admin = new User({
        name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created successfully!');
      console.log('\n=== ADMIN CREDENTIALS ===');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPassword);
      console.log('Admin URL: http://localhost:3000/admin');
      console.log('========================\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();

