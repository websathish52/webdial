const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'websathish52@gmail.com';
  const password = 'Sathish@0922';

  let user = await User.findOne({ email });
  if (user) {
    console.log('User already exists, updating password + role...');
    user.password = password; // pre-save hook hashes it
    user.role = 'master';
    await user.save();
    console.log('Updated existing user to master role with new password.');
  } else {
    user = new User({ name: 'Sathish', email, password, role: 'master' });
    await user.save();
    console.log('Master user created:', email);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});