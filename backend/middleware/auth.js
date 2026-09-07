const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');

// --- Verifies JWT and attaches the logged-in user to req.user ---
exports.protect = async (req, res, next) => {
  let token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Not authorized, token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (req.user.companyId && !['master'].includes(String(req.user.role || '').toLowerCase())) {
      const company = await Company.findById(req.user.companyId).select('accountStatus subscriptionId');
      if (company) {
        const subscription = company.subscriptionId
          ? await Subscription.findById(company.subscriptionId).select('status expiryDate type plan')
          : null;
        const expired = subscription && subscription.type !== 'MANUAL' && subscription.expiryDate && subscription.expiryDate <= new Date();
        const blockedStatus = company.accountStatus === 'EXPIRED' || company.accountStatus === 'SUSPENDED' || subscription?.status === 'EXPIRED' || subscription?.status === 'SUSPENDED';

        if (expired || blockedStatus) {
          req.subscriptionExpired = true;
          if (expired && subscription && subscription.status !== 'EXPIRED') {
            await Subscription.findByIdAndUpdate(subscription._id, { status: 'EXPIRED' });
            await Company.findByIdAndUpdate(company._id, { accountStatus: 'EXPIRED' });
          }
          if (!req.originalUrl.startsWith('/api/payments') && !req.originalUrl.startsWith('/api/auth')) {
            return res.status(403).json({
              code: 'SUBSCRIPTION_EXPIRED',
              message: company.accountStatus === 'SUSPENDED' || subscription?.status === 'SUSPENDED' ? 'Account suspended' : 'Subscription expired',
            });
          }
        }
      }
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// --- Resolves req.companyId (or marks "own SuperAdmin context") so every
// company-scoped route (settings, crm, dialer, members, etc.) works
// correctly for every role ---
//
// Rules:
// 1. master / superadmin can operate across companies -> they send an
//    `X-Company-Id` header when a specific company is selected (frontend
//    already does this via getSelectedCompanyId()).
// 2. master / superadmin with NO header selected = "All Team" -> this is
//    NOT an error. It means "show my own SuperAdmin-level context", not
//    a specific company's. We set req.isOwnContext = true and leave
//    req.companyId null. Controllers that need a real companyId (settings)
//    must check req.isOwnContext and serve the SuperAdmin's own data
//    instead of trying to load/create a CompanySettings document.
// 3. admin / manager / submanager / telecaller are always scoped to the
//    single company they belong to (req.user.companyId) — the header is
//    ignored for them, so nobody can access another tenant's data just
//    by sending a different header value.
// 4. If a non-privileged user has no companyId at all, that's a real
//    error state (they must belong to a company to do anything here).
exports.attachCompany = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const headerCompanyId = req.headers['x-company-id'];
  const role = String(req.user.role || '').toLowerCase();
  const isPrivileged = role === 'master' || role === 'superadmin';

  if (isPrivileged) {
    if (headerCompanyId && String(headerCompanyId).trim()) {
      req.companyId = String(headerCompanyId).trim();
      req.isOwnContext = false;
    } else {
      // "All Team" selected — this is the SuperAdmin's own context.
      req.companyId = null;
      req.isOwnContext = true;
    }
    return next();
  }

  // Everyone else is locked to their own company.
  const companyId = req.user.companyId ? String(req.user.companyId) : null;
  if (!companyId) {
    return res.status(400).json({
      message: 'No company selected. Please select or create a company before continuing.',
    });
  }
  req.companyId = companyId;
  req.isOwnContext = false;
  next();
};

// --- Optional: restrict a route to specific roles ---
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }
  next();
};