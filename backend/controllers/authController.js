const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');
const { resolveCompanyId } = require('../middleware/tenant');

function normalizeRole(role) {
  const value = String(role || 'telecaller').toLowerCase();
  if (['master', 'superadmin', 'admin', 'manager', 'submanager', 'telecaller'].includes(value)) return value;
  return 'telecaller';
}

function generateToken(user) {
  return jwt.sign({ id: user._id || user.id, role: user.role, email: user.email, companyId: user.companyId || null }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });
}

async function findUserByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  return User.findOne({ $or: [{ email: normalized }, { username: normalized }] });
}

async function verifyPassword(user, password) {
  if (!user || !password) return false;
  if (typeof user.matchPassword === 'function') return user.matchPassword(password);
  return user.password === password;
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const isMatch = await verifyPassword(user, password);
  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

  const token = generateToken(user);
  await logAudit(user._id || user.id, 'Logged in', 'Auth', { email: user.email });
  res.json({
    token,
    user: {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      username: user.username || user.email,
      lists: Array.isArray(user.lists) ? user.lists : [],
      teams: Array.isArray(user.teams) ? user.teams : [],
      companyId: user.companyId || null,
    },
  });
};

// register (protected - only superadmin can create other users)
exports.register = async (req, res) => {
  const { name, email, password, role, username, phone, companyId } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = username ? String(username).trim().toLowerCase() : normalizedEmail.split('@')[0];
  const normalizedRole = normalizeRole(role);
  const currentRole = String(req.user?.role || '').toLowerCase();
  const isSuperAdmin = currentRole === 'superadmin';
  const isCompanyAdmin = currentRole === 'admin';

  let assignedCompanyId = null;
  if (normalizedRole !== 'superadmin') {
    const selectedCompanyId = companyId || resolveCompanyId(req);
    if (!selectedCompanyId) {
      return res.status(400).json({ message: 'companyId is required for non-superadmin users' });
    }
    assignedCompanyId = selectedCompanyId;
  }

  if (!isSuperAdmin && normalizedRole === 'superadmin') {
    return res.status(403).json({ message: 'Only superadmin can create another superadmin' });
  }

  if (isCompanyAdmin && assignedCompanyId && String(assignedCompanyId) !== String(req.user.companyId)) {
    return res.status(403).json({ message: 'Company admin cannot create users outside their company' });
  }

  try {
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, ...(normalizedUsername ? [{ username: normalizedUsername }] : [])] });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const user = new User({
      name,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      username: normalizedUsername,
      phone,
      companyId: assignedCompanyId,
    });
    await user.save();
    await logAudit(req.user?._id || user._id, 'Created user', 'Auth', { userId: user._id, name: user.name, role: user.role, companyId: assignedCompanyId });
    res.status(201).json({ message: 'User created', user: { id: user._id, email: user.email, role: user.role, username: user.username, companyId: user.companyId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password required' });
  if (String(newPassword).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    const isMatch = await verifyPassword(user, currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password does not match' });

    user.password = newPassword;
    await user.save();
    await logAudit(req.user._id, 'Changed password', 'Auth', { userId: req.user._id });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  res.json({
    user: {
      id: req.user._id || req.user.id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name,
      username: req.user.username || req.user.email,
      lists: Array.isArray(req.user.lists) ? req.user.lists : [],
      teams: Array.isArray(req.user.teams) ? req.user.teams : [],
      companyId: req.user.companyId || null,
    },
  });
};
