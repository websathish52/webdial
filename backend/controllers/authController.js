const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');
const { resolveCompanyId } = require('../middleware/tenant');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const Trial = require('../models/Trial');
const CompanySettings = require('../models/CompanySettings');
const { sendSubscriptionEmail } = require('../utils/subscriptionMailer');
const notificationController = require('./notificationController');

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

async function resolveCompanySeatInfo(companyId) {
  if (!companyId) return { subscription: null, currentUsers: 0, seatLimit: 0 };

  const [subscription, currentUsers] = await Promise.all([
    Subscription.findOne({ companyId }).sort({ createdAt: -1 }).lean(),
    User.countDocuments({ companyId }),
  ]);

  const baseSeatLimit = subscription ? Number(subscription.numberOfUsers || 0) : 0;
  const normalizedPlan = String(subscription?.plan || '').toUpperCase();
  const seatLimit = normalizedPlan === 'STARTED' ? Math.min(5, Math.max(1, baseSeatLimit || 5)) : Math.max(0, baseSeatLimit);

  return { subscription, currentUsers, seatLimit };
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
      permissions: user.permissions,
      flags: user.flags,
      onboardingCompleted: user.onboardingCompleted === true,
    },
  });
};

exports.startTrial = async (req, res) => {
  const { firstName, lastName, name, companyName, organisation, phone, email, password, plan, numberOfUsers, deviceIdentifier } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || `${firstName || ''} ${lastName || ''}`).trim().replace(/\s+/g, ' ');
  const selectedPlan = String(plan || '').toUpperCase();
  if (!normalizedName || !normalizedEmail || !password || !String(companyName || '').trim() || !deviceIdentifier || !['STARTED', 'PRO'].includes(selectedPlan)) {
    return res.status(400).json({ message: 'Name, company, email, password, plan and device identifier are required' });
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    const usedTrial = await Trial.findOne({ $or: [{ deviceIdentifier: String(deviceIdentifier).trim() }, { email: normalizedEmail }, ...(phone ? [{ phone: String(phone).trim() }] : [])] });
    if (existingUser || usedTrial) return res.status(409).json({ code: 'TRIAL_ALREADY_USED', message: 'This email, phone number, or device has already used its free trial. Please purchase a subscription.' });

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const company = await Company.create({ companyName: String(companyName).trim(), organisation: organisation || '', companyCode: `TRIAL-${Date.now()}` });
    const user = await User.create({ name: normalizedName, email: normalizedEmail, password, phone: phone || '', role: 'superadmin', companyId: company._id });
    company.createdBy = user._id;
    await company.save();
    const subscription = await Subscription.create({ companyId: company._id, plan: selectedPlan, type: 'FREE_TRIAL', status: 'ACTIVE', numberOfUsers: Math.max(1, Number(numberOfUsers) || 1), startDate: now, expiryDate, paymentStatus: 'SUCCESS' });
    company.subscriptionId = subscription._id;
    await company.save();
    await Trial.create({ companyId: company._id, email: normalizedEmail, phone: phone || '', deviceIdentifier: String(deviceIdentifier).trim(), plan: selectedPlan, startDate: now, expiryDate });
    await CompanySettings.create({ companyId: company._id, paymentProfile: { company: String(companyName).trim(), firstName: firstName || user.name.split(/\s+/)[0] || '', lastName: lastName || user.name.split(/\s+/).slice(1).join(' '), email: normalizedEmail, phone: phone || '', country: 'India' } });
    const details = { Customer: user.name, Plan: selectedPlan, 'Trial start': now.toISOString(), 'Trial expiry': expiryDate.toISOString(), Users: Math.max(1, Number(numberOfUsers) || 1), 'Login link': `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth` };
    const adminEmail = process.env.ADMIN_EMAIL || 'sathish@webcodexus.com';
    const masterUsers = await User.find({ role: 'master' }).select('_id').lean();
    await Promise.allSettled([
      sendSubscriptionEmail({ to: normalizedEmail, subject: 'WebDial 7-Day Free Trial Activated', title: 'Your WebDial free trial is active', details }),
      sendSubscriptionEmail({ to: adminEmail, subject: 'New WebDial Free Trial Activated', title: 'New WebDial free trial', details: { ...details, Email: normalizedEmail, 'Account ID': company._id.toString() } }),
      ...masterUsers.map((masterUser) => notificationController.createNotification({
        companyId: company._id,
        recipientId: masterUser._id,
        actorId: user._id,
        type: 'free_trial_started',
        title: 'Free trial started',
        message: `${user.name} started a free trial for ${selectedPlan}.`,
        metadata: { companyName: companyName || 'Company', customerName: user.name, plan: selectedPlan, expiryDate: expiryDate.toISOString() },
      })),
    ]);
    res.status(201).json({ token: generateToken(user), user: { id: user._id, email: user.email, role: user.role, name: user.name, companyId: user.companyId }, trial: { plan: selectedPlan, startDate: now, expiryDate } });
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 500).json({ message: err.code === 11000 ? 'Account already exists' : err.message });
  }
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

    if (assignedCompanyId) {
      const { subscription, currentUsers, seatLimit } = await resolveCompanySeatInfo(assignedCompanyId);
      if (subscription && subscription.status !== 'ACTIVE') {
        return res.status(402).json({ code: 'SUBSCRIPTION_INACTIVE', message: 'Company subscription is inactive. Please upgrade to continue.' });
      }
      if (subscription && subscription.expiryDate && new Date(subscription.expiryDate) <= new Date()) {
        return res.status(402).json({ code: 'SUBSCRIPTION_EXPIRED', message: 'Company subscription has expired. Please purchase a plan.' });
      }
      if (seatLimit > 0 && currentUsers + 1 > seatLimit) {
        return res.status(402).json({
          code: 'SEAT_LIMIT_REACHED',
          message: subscription?.plan === 'STARTED'
            ? 'Starter plan seats are full. Upgrade to add another member.'
            : 'No paid seat is available for this company. Purchase more seats to add a member.',
        });
      }
    }

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
      permissions: req.user.permissions,
      flags: req.user.flags,
      onboardingCompleted: req.user.onboardingCompleted === true,
    },
  });
};

exports.completeOnboarding = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { onboardingCompleted: true });
    res.json({ onboardingCompleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
