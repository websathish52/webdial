const User = require('../models/User');

module.exports = async function seedAdmin() {
  try {
    const email = 'websathish52@gmail.com';
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Master admin already exists');
      return;
    }

    const user = new User({ name: 'Sathish', email, password: 'Sathish@0922', role: 'master' });
    await user.save();
    console.log('Master admin created: websathish52@gmail.com');
  } catch (err) {
    console.error('Failed to seed master admin', err.message);
  }
};