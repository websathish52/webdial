const Company = require('../models/Company');

function getHeaderCompanyId(req) {
  const header = req.headers['x-company-id'] || req.headers['X-Company-Id'];
  return header ? String(header).trim() : null;
}

function isSuperAdmin(req) {
  return String(req.user?.role || '').toLowerCase() === 'superadmin';
}

function isMaster(req) {
  return String(req.user?.role || '').toLowerCase() === 'master';
}

function resolveCompanyId(req, fallback) {
  const headerCompanyId = getHeaderCompanyId(req);
  if (isSuperAdmin(req) && headerCompanyId) return headerCompanyId;
  if (String(req.user?.companyId || '').trim()) return String(req.user.companyId);
  return fallback || null;
}

function requireCompanyId(req) {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    throw new Error('Company context missing');
  }
  return companyId;
}

// Builds a Mongo filter scoped to the correct tenant boundary:
// - Master: no restriction (extra only) -- can see everything.
// - SuperAdmin with a specific company selected (X-Company-Id): scoped to
//   that one companyId, PROVIDED that company belongs to them.
// - SuperAdmin with no company selected ("All Team"): scoped to ALL
//   companies THEY created -- never another SuperAdmin's companies.
// - Everyone else: scoped to their own companyId only.
async function buildTenantFilterAsync(req, extra = {}) {
  if (isMaster(req)) {
    return extra;
  }

  if (isSuperAdmin(req)) {
    const headerCompanyId = getHeaderCompanyId(req);
    if (headerCompanyId) {
      // Verify this SuperAdmin actually owns the selected company before
      // scoping to it, so a tampered header can't leak another tenant.
      const owned = await Company.findOne({ _id: headerCompanyId, createdBy: req.user._id });
      if (!owned) {
        // Not their company -- fall back to "all companies they own"
        // rather than trusting the header.
        const ownedCompanies = await Company.find({ createdBy: req.user._id }).select('_id');
        return { companyId: { $in: ownedCompanies.map((c) => c._id) }, ...extra };
      }
      return { companyId: headerCompanyId, ...extra };
    }

    // "All Team" -- scope to every company this SuperAdmin owns.
    const ownedCompanies = await Company.find({ createdBy: req.user._id }).select('_id');
    return { companyId: { $in: ownedCompanies.map((c) => c._id) }, ...extra };
  }

  const companyId = resolveCompanyId(req);
  return { companyId, ...extra };
}

// Synchronous version kept for callers that can't await (rare). Prefer
// buildTenantFilterAsync everywhere -- this one is NOT SuperAdmin-safe
// for the "All Team" case and should be phased out.
function buildTenantFilter(req, extra = {}) {
  const companyId = resolveCompanyId(req);
  if (isSuperAdmin(req) && !companyId) {
    // SuperAdmin with no company selected: restrict to nothing found
    // rather than leaking every company's data. Callers needing the
    // real "All Team" behavior must switch to buildTenantFilterAsync.
    return { companyId: null, ...extra };
  }
  return { companyId, ...extra };
}

async function validateCompanyContext(req, res, next) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: 'Company context missing' });
    }
    if (isSuperAdmin(req)) {
      const company = await Company.findById(companyId);
      if (!company) return res.status(404).json({ message: 'Selected company not found' });
      if (String(company.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    next();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  resolveCompanyId,
  requireCompanyId,
  buildTenantFilter,
  buildTenantFilterAsync,
  isSuperAdmin,
  isMaster,
  validateCompanyContext,
};