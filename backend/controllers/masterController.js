const User = require('../models/User');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const Trial = require('../models/Trial');
const Payment = require('../models/Payment');
const CompanySettings = require('../models/CompanySettings');
const { sendSubscriptionEmail } = require('../utils/subscriptionMailer');
const notificationController = require('./notificationController');
const logAudit = require('../utils/auditLogger');
const { cascadeDeleteCompanyData } = require('../utils/Cascadedeletecompany');

const portalAccessCatalog = [
  { name: 'Dashboard', route: '/dashboard', module: 'Core', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'CRM', route: '/crm', module: 'Core', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Auto Dialer', route: '/dialer', module: 'Core', roles: ['Telecaller'] },
  { name: 'WhatsApp Inbox', route: '/whatsapp', module: 'WhatsApp', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Reports Summary', route: '/summary', module: 'Reports & Analytics', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Disposition Report', route: '/disposition-report', module: 'Reports & Analytics', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Productivity', route: '/productivity', module: 'Reports & Analytics', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Leaderboard', route: '/game', module: 'Reports & Analytics', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Automation', route: '/automation', module: 'Tools', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Pipeline', route: '/pipeline', module: 'Tools', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Forms', route: '/form', module: 'Tools', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Web Dialer', route: '/webdialer', module: 'Tools', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Go Pages', route: '/gopages', module: 'Marketing', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Web Forms', route: '/web_form', module: 'Marketing', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Voice Broadcast', route: '/voice-broadcast', module: 'Marketing', roles: ['SuperAdmin', 'Telecaller'] },
  { name: 'Settings', route: '/settings', module: 'Platform', roles: ['SuperAdmin', 'Telecaller'] },
];

const moduleAccessCatalog = [
  { key: 'crm', label: 'CRM & Contacts', pages: ['/crm'], permission: 'crm' },
  { key: 'whatsapp', label: 'WhatsApp Suite', pages: ['/whatsapp', '/whatsapp-templates', '/whatsapp-automation', '/broadcast', '/whatsapp-reports', '/whatsapp-settings'], permission: 'whatsapp' },
  { key: 'reports', label: 'Reports & Dispositions', pages: ['/summary', '/disposition-report', '/productivity', '/productivity-attendance', '/game'], permission: 'reports' },
  { key: 'tools', label: 'Dialer, Forms & Automation', pages: ['/webdialer', '/automation', '/form', '/products', '/stages'], permission: 'tools' },
  { key: 'marketing', label: 'Marketing & Broadcast', pages: ['/marketing', '/gopages', '/web_form', '/voice-broadcast'], permission: 'marketing' },
  { key: 'integration', label: 'Integrations', pages: ['/integration'], permission: 'integration' },
  { key: 'pbx', label: 'PBX & Telephony', pages: ['/pbx'], permission: 'pbx' },
  { key: 'settings', label: 'Settings & Administration', pages: ['/settings'], permission: 'settings' },
];

const moduleAccessDefaults = {
  SuperAdmin: { crm: true, whatsapp: true, reports: true, tools: true, marketing: true, integration: true, pbx: true, settings: true },
  Admin: { crm: true, whatsapp: true, reports: true, tools: true, marketing: true, integration: true, pbx: true, settings: true },
  Manager: { crm: true, whatsapp: true, reports: true, tools: true, marketing: false, integration: false, pbx: false, settings: false },
  Submanager: { crm: true, whatsapp: true, reports: true, tools: true, marketing: false, integration: false, pbx: false, settings: false },
  Telecaller: { crm: true, whatsapp: true, reports: true, tools: true, marketing: true, integration: false, pbx: false, settings: false },
};

exports.getPortalAccess = async (req, res) => {
  res.json({ pages: portalAccessCatalog, roles: ['SuperAdmin', 'Telecaller'], generatedAt: new Date().toISOString() });
};

exports.getModuleAccess = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).select('companyName').lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const users = await User.find({ companyId: company._id }).select('role permissions').lean();
    const roles = Object.fromEntries(Object.keys(moduleAccessDefaults).map((role) => [role, { ...moduleAccessDefaults[role] }]));
    for (const user of users) {
      const role = String(user.role || '').toLowerCase();
      const roleName = role === 'superadmin' ? 'SuperAdmin' : role.charAt(0).toUpperCase() + role.slice(1);
      if (!roles[roleName]) continue;
      for (const module of moduleAccessCatalog) {
        if (user.permissions?.[module.permission] !== undefined) roles[roleName][module.key] = Boolean(user.permissions[module.permission]);
      }
    }
    res.json({ company, modules: moduleAccessCatalog, roles, memberCount: users.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateModuleAccess = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).select('companyName').lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const requestedRoles = req.body?.roles || {};
    const users = await User.find({ companyId: company._id });
    let updated = 0;
    for (const user of users) {
      const role = String(user.role || '').toLowerCase();
      const roleName = role === 'superadmin' ? 'SuperAdmin' : role.charAt(0).toUpperCase() + role.slice(1);
      const roleAccess = requestedRoles[roleName];
      if (!roleAccess) continue;
      const nextPermissions = { ...(user.permissions?.toObject?.() || user.permissions || {}) };
      for (const module of moduleAccessCatalog) nextPermissions[module.permission] = Boolean(roleAccess[module.key]);
      user.permissions = nextPermissions;
      await user.save();
      updated += 1;
    }
    await logAudit(req.user._id, 'Updated module access', 'Master', { companyId: company._id, companyName: company.companyName, updatedUsers: updated });
    res.json({ message: 'Module access updated', updatedUsers: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const planPrices = { FREE: 0, STARTED: 199, PRO: 499 };
const durationMonths = { monthly: 1, halfyearly: 6, annual: 12 };
const discountRates = { monthly: 0, halfyearly: 0.1, annual: 0.15 };

exports.getCustomerDashboard = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).lean();
    const companyIds = companies.map((company) => company._id);
    const [subscriptions, trials, payments, users] = await Promise.all([
      Subscription.find({ companyId: { $in: companyIds } }).sort({ createdAt: -1 }).lean(),
      Trial.find({ companyId: { $in: companyIds } }).sort({ createdAt: -1 }).lean(),
      Payment.find({ companyId: { $in: companyIds } }).sort({ createdAt: -1 }).lean(),
      User.find({ companyId: { $in: companyIds }, role: { $in: ['admin', 'superadmin'] } }).select('-password').lean(),
    ]);
    const latestByCompany = new Map();
    for (const subscription of subscriptions) if (!latestByCompany.has(String(subscription.companyId))) latestByCompany.set(String(subscription.companyId), subscription);

    const creatorSubscriptionByUser = new Map();
    for (const company of companies) {
      if (!company.createdBy) continue;
      const creatorSubscription = latestByCompany.get(String(company.createdBy));
      if (creatorSubscription) creatorSubscriptionByUser.set(String(company.createdBy), creatorSubscription);
    }

    const customers = companies.map((company) => {
      const directSubscription = latestByCompany.get(String(company._id));
      const inheritedSubscription = !directSubscription && company.createdBy
        ? creatorSubscriptionByUser.get(String(company.createdBy)) || null
        : null;
      const subscription = directSubscription || inheritedSubscription;
      const account = users.find((user) => String(user.companyId) === String(company._id));
      const trial = trials.find((item) => String(item.companyId) === String(company._id)) || (subscription?.type === 'FREE_TRIAL' ? { companyId: company._id, status: 'ACTIVE', startDate: subscription.startDate, expiryDate: subscription.expiryDate, plan: subscription.plan } : null);
      return { company, account, subscription: subscription || null, trial: trial || null, payments: payments.filter((payment) => String(payment.companyId) === String(company._id)) };
    });
    const active = customers.filter((customer) => customer.subscription?.status === 'ACTIVE' && customer.subscription?.type !== 'FREE_TRIAL').length;
    const trialsActive = customers.filter((customer) => customer.subscription?.type === 'FREE_TRIAL' && customer.subscription?.status === 'ACTIVE').length;
    const revenue = payments.filter((payment) => payment.status === 'Paid').reduce((total, payment) => total + Number(payment.finalAmount || payment.amount || 0), 0);
    res.json({ metrics: { totalCustomers: customers.length, activeSubscriptions: active, activeTrials: trialsActive, expired: customers.filter((customer) => customer.subscription?.status === 'EXPIRED').length, started: customers.filter((customer) => customer.subscription?.plan === 'STARTED').length, pro: customers.filter((customer) => customer.subscription?.plan === 'PRO').length, manual: customers.filter((customer) => customer.subscription?.type === 'MANUAL').length, revenue, convertedTrials: trials.filter((trial) => trial.convertedToPaid).length }, customers });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, companyName, organisation, accessType = 'MANUAL', plan = 'STARTED', numberOfUsers = 1, billingPeriod = 'monthly', startDate } = req.body;
    if (!name || !email || !password || !companyName) return res.status(400).json({ message: 'Name, email, password and company name are required' });
    if (await User.findOne({ email: String(email).trim().toLowerCase() })) return res.status(409).json({ message: 'Email already exists' });
    const normalizedPlan = String(plan).toUpperCase();
    const normalizedAccessType = String(accessType).toUpperCase();
    const type = normalizedAccessType === 'MANUAL' ? 'MANUAL' : normalizedAccessType === 'FREE_TRIAL' ? 'FREE_TRIAL' : 'PAID';
    const start = startDate ? new Date(startDate) : new Date();
    const expiry = type === 'MANUAL' ? null : new Date(start);
    if (type === 'FREE_TRIAL') expiry.setDate(expiry.getDate() + 7);
    else if (expiry) expiry.setMonth(expiry.getMonth() + (durationMonths[billingPeriod] || 1));
    const usersCount = Math.max(1, Number(numberOfUsers) || 1);
    const amount = type === 'MANUAL' || type === 'FREE_TRIAL' ? 0 : planPrices[normalizedPlan] * usersCount * (durationMonths[billingPeriod] || 1);
    const discount = amount * (discountRates[billingPeriod] || 0);
    const company = await Company.create({ companyName, organisation: organisation || '', companyCode: `MASTER-${Date.now()}`, createdBy: req.user._id });
    const user = await User.create({ name, email: String(email).trim().toLowerCase(), password, phone: phone || '', role: 'superadmin', companyId: company._id });
    const subscription = await Subscription.create({ companyId: company._id, plan: normalizedPlan, type, status: 'ACTIVE', numberOfUsers: usersCount, billingPeriod, startDate: start, expiryDate: expiry, amount, discount, finalAmount: amount - discount, paymentStatus: type === 'MANUAL' || type === 'FREE_TRIAL' ? 'SUCCESS' : 'PENDING' });
    company.subscriptionId = subscription._id;
    await company.save();
    if (type === 'FREE_TRIAL') {
      await Trial.create({ companyId: company._id, email: user.email, phone: phone || '', deviceIdentifier: `master-${user._id}`, plan: normalizedPlan, startDate: start, expiryDate: expiry });
      await CompanySettings.create({ companyId: company._id, paymentProfile: { company: String(companyName).trim(), firstName: name.split(/\s+/)[0] || '', lastName: name.split(/\s+/).slice(1).join(' '), email: user.email, phone: phone || '', country: 'India' } });
      const adminEmail = process.env.ADMIN_EMAIL || 'sathish@webcodexus.com';
      const details = { Customer: name, Plan: normalizedPlan, 'Trial start': start.toISOString(), 'Trial expiry': expiry.toISOString(), 'Login email': user.email };
      const masterUsers = await User.find({ role: 'master' }).select('_id').lean();
      await Promise.allSettled([
        sendSubscriptionEmail({ to: user.email, subject: 'WebDial 7-Day Free Trial Activated', title: 'Your WebDial free trial is active', details }),
        sendSubscriptionEmail({ to: adminEmail, subject: 'New WebDial Free Trial Activated', title: 'New WebDial free trial', details }),
        ...masterUsers.map((masterUser) => notificationController.createNotification({
          companyId: company._id,
          recipientId: masterUser._id,
          actorId: user._id,
          type: 'free_trial_started',
          title: 'Free trial started',
          message: `${name} started a free trial for ${normalizedPlan}.`,
          metadata: { companyName: companyName || 'Company', customerName: name, plan: normalizedPlan, expiryDate: expiry.toISOString() },
        })),
      ]);
    }
    res.status(201).json({ company, user: { id: user._id, name: user.name, email: user.email }, subscription });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'EXPIRED'].includes(status)) return res.status(400).json({ message: 'Invalid account status' });
    const company = await Company.findByIdAndUpdate(req.params.companyId, { accountStatus: status, status: status === 'ACTIVE' ? 'active' : 'inactive' }, { new: true });
    if (!company) return res.status(404).json({ message: 'Customer not found' });
    if (company.subscriptionId) await Subscription.findByIdAndUpdate(company.subscriptionId, { status });
    res.json(company);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET all SuperAdmins along with their company details (if any)
exports.getSuperAdmins = async (req, res) => {
  try {
    const superAdmins = await User.find({ role: 'superadmin' })
      .select('-password')
      .populate('companyId', 'companyName companyCode status')
      .sort({ createdAt: -1 });
    res.json(superAdmins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE a SuperAdmin together with the company entered by the Master.
exports.createSuperAdmin = async (req, res) => {
  try {
    const { name, email, username, phone, password, companyName, billingPeriod = 'monthly', accessType = 'MANUAL', plan = 'FREE' } = req.body;

    if (!name || !email || !password || !String(companyName || '').trim()) {
      return res.status(400).json({ message: 'Name, email, password and company name are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = username ? String(username).trim().toLowerCase() : undefined;

    const orUserCheck = [{ email: normalizedEmail }];
    if (normalizedUsername) orUserCheck.push({ username: normalizedUsername });
    const existingUser = await User.findOne({ $or: orUserCheck });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email or username already exists' });
    }

    const selectedAccess = String(accessType).toUpperCase();
    const selectedPlan = String(plan).toUpperCase();
    const normalizedPlan = ['FREE', 'STARTED', 'PRO'].includes(selectedPlan) ? selectedPlan : 'FREE';
    const selectedBilling = ['monthly', 'halfyearly', 'annual'].includes(String(billingPeriod)) ? String(billingPeriod) : 'monthly';
    const superAdmin = await User.create({
      name,
      email: normalizedEmail,
      username: normalizedUsername,
      phone,
      password,
      role: 'superadmin',
      companyId: null,
    });

    if (['MANUAL', 'FREE', 'FREE_TRIAL', 'STARTED', 'PRO'].includes(selectedAccess)) {
      const company = await Company.create({
        companyName: String(companyName).trim(),
        companyCode: `MASTER-${Date.now()}`,
        createdBy: superAdmin._id,
      });

      const isFreeTrial = selectedAccess === 'FREE_TRIAL';
      const isManual = selectedAccess === 'MANUAL' || selectedAccess === 'FREE';
      const startDate = new Date();
      const expiryDate = isManual
        ? null
        : isFreeTrial
          ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(startDate.getFullYear(), startDate.getMonth() + (durationMonths[selectedBilling] || 1), startDate.getDate());

      const resolvedPlan = selectedAccess === 'FREE' ? 'FREE' : selectedAccess === 'PRO' ? 'PRO' : selectedAccess === 'STARTED' ? 'STARTED' : normalizedPlan;
      const subscription = await Subscription.create({
        companyId: company._id,
        plan: resolvedPlan,
        type: isManual ? 'MANUAL' : isFreeTrial ? 'FREE_TRIAL' : 'PAID',
        status: 'ACTIVE',
        numberOfUsers: 1,
        billingPeriod: selectedBilling,
        startDate,
        expiryDate,
        amount: isManual || isFreeTrial ? 0 : (planPrices[resolvedPlan] || 0) * (durationMonths[selectedBilling] || 1),
        discount: isManual || isFreeTrial ? 0 : (planPrices[resolvedPlan] || 0) * (durationMonths[selectedBilling] || 1) * (discountRates[selectedBilling] || 0),
        finalAmount: isManual || isFreeTrial ? 0 : (planPrices[resolvedPlan] || 0) * (durationMonths[selectedBilling] || 1) * (1 - (discountRates[selectedBilling] || 0)),
        paymentStatus: isManual || isFreeTrial ? 'SUCCESS' : 'PENDING',
      });

      company.subscriptionId = subscription._id;
      await company.save();
      superAdmin.companyId = company._id;
      await superAdmin.save();
    }

    const safeUser = await User.findById(superAdmin._id).select('-password');

    await logAudit(req.user._id, 'Created SuperAdmin', 'Master', {
      superAdminId: superAdmin._id,
      name: superAdmin.name,
    });

    res.status(201).json(safeUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE a SuperAdmin's own basic details (name/email/username/phone/password)
exports.updateSuperAdmin = async (req, res) => {
  try {
    const { name, email, username, phone, password } = req.body;

    const superAdmin = await User.findOne({ _id: req.params.id, role: 'superadmin' });
    if (!superAdmin) return res.status(404).json({ message: 'SuperAdmin not found' });

    if (name) superAdmin.name = name;
    if (email) superAdmin.email = String(email).trim().toLowerCase();
    if (username !== undefined) superAdmin.username = username ? String(username).trim().toLowerCase() : username;
    if (phone !== undefined) superAdmin.phone = phone;
    if (password) superAdmin.password = password; // pre-save hook hashes it
    await superAdmin.save();

    const safeUser = await User.findById(superAdmin._id).select('-password');

    await logAudit(req.user._id, 'Updated SuperAdmin', 'Master', {
      superAdminId: superAdmin._id,
      name: superAdmin.name,
    });

    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE a SuperAdmin -- cascades to delete EVERY company they created,
// and every piece of data inside those companies (leads, lists, tasks,
// uploads, pipeline, notifications, call logs, campaigns, recordings,
// whatsapp data, audit entries, and all members of those companies).
exports.deleteSuperAdmin = async (req, res) => {
  try {
    const superAdmin = await User.findOne({ _id: req.params.id, role: 'superadmin' });
    if (!superAdmin) return res.status(404).json({ message: 'SuperAdmin not found' });

    // Find every company this SuperAdmin created/owns.
    const ownedCompanies = await Company.find({ createdBy: superAdmin._id }).select('_id companyName');

    for (const company of ownedCompanies) {
      // deleteUsers: true removes all non-superadmin members of each
      // company. We delete the superadmin's own User doc separately below.
      await cascadeDeleteCompanyData(company._id, { deleteCompanyDoc: true, deleteUsers: true });
    }

    await User.findByIdAndDelete(superAdmin._id);

    await logAudit(req.user._id, 'Deleted SuperAdmin (cascade)', 'Master', {
      superAdminId: superAdmin._id,
      name: superAdmin.name,
      companiesDeleted: ownedCompanies.map((c) => c.companyName),
    });

    res.json({ message: 'SuperAdmin and all their companies/data deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCustomerAccount = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).select('_id companyName');
    if (!company) return res.status(404).json({ message: 'Customer account not found' });

    const accountUsers = await User.find({ companyId: company._id }).select('_id name email');
    await cascadeDeleteCompanyData(company._id, { deleteCompanyDoc: true, deleteUsers: true });
    await User.deleteMany({ companyId: company._id });

    await logAudit(req.user._id, 'Deleted customer account (cascade)', 'Master', {
      companyId: company._id,
      companyName: company.companyName,
      usersDeleted: accountUsers.map((user) => user.email),
    });

    res.json({ message: 'Customer account and all login/data deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateCustomerAccount = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) return res.status(404).json({ message: 'Customer not found' });
    const account = await User.findOne({ companyId: company._id, role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
    if (!account) return res.status(404).json({ message: 'Customer login account not found' });

    const { name, email, phone, companyName, organisation, password, plan, numberOfUsers, billingPeriod, startDate, expiryDate } = req.body;
    if (name) account.name = String(name).trim();
    if (email) account.email = String(email).trim().toLowerCase();
    if (phone !== undefined) account.phone = String(phone).trim();
    if (password) account.password = password;
    await account.save();
    if (companyName) company.companyName = String(companyName).trim();
    if (organisation !== undefined) company.organisation = String(organisation).trim();
    await company.save();

    const subscription = await Subscription.findOne({ companyId: company._id }).sort({ createdAt: -1 });
    if (subscription) {
      if (plan) subscription.plan = String(plan).toUpperCase();
      if (numberOfUsers !== undefined) subscription.numberOfUsers = Math.max(1, Number(numberOfUsers) || 1);
      if (billingPeriod && ['monthly', 'halfyearly', 'annual'].includes(billingPeriod)) subscription.billingPeriod = billingPeriod;
      if (startDate) subscription.startDate = new Date(startDate);
      if (expiryDate) subscription.expiryDate = new Date(expiryDate);
      if (subscription.type !== 'MANUAL') {
        const months = durationMonths[subscription.billingPeriod] || 1;
        const price = planPrices[subscription.plan] || 0;
        const amount = price * subscription.numberOfUsers * months;
        subscription.amount = amount;
        subscription.discount = amount * (discountRates[subscription.billingPeriod] || 0);
        subscription.finalAmount = amount - subscription.discount;
        if (!expiryDate) {
          subscription.expiryDate = new Date(subscription.startDate || new Date());
          subscription.expiryDate.setMonth(subscription.expiryDate.getMonth() + months);
        }
      }
      await subscription.save();
    }
    res.json({ message: 'Customer account updated' });
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 500).json({ message: err.code === 11000 ? 'Email already exists' : err.message });
  }
};