const mongoose = require('mongoose');
const AuditEntry = require('../models/AuditEntry');
const Company = require('../models/Company');

exports.getAudit = async (req, res) => {
  try {
    const { actor, action, module, startDate, endDate, limit = 200 } = req.query;
    const filter = {};

    const role = String(req.user?.role || '').toLowerCase();
    const isMaster = role === 'master';
    const isSuperAdmin = role === 'superadmin';
    const isAdminRole = isSuperAdmin || role === 'admin';

    // TENANT ISOLATION: everyone except Master is locked to their own
    // company scope. SuperAdmin's "All" filter means "all companies THEY
    // own", never another SuperAdmin's companies.
    if (!isMaster) {
      if (isSuperAdmin) {
        const headerCompanyId = req.headers['x-company-id'] || req.headers['X-Company-Id'];
        if (headerCompanyId) {
          const owned = await Company.findOne({ _id: String(headerCompanyId).trim(), createdBy: req.user._id });
          if (!owned) {
            const ownedCompanies = await Company.find({ createdBy: req.user._id }).select('_id');
            filter.companyId = { $in: ownedCompanies.map((c) => c._id) };
          } else {
            filter.companyId = owned._id;
          }
        } else {
          const ownedCompanies = await Company.find({ createdBy: req.user._id }).select('_id');
          filter.companyId = { $in: ownedCompanies.map((c) => c._id) };
        }
      } else {
        if (!req.user?.companyId) {
          return res.status(400).json({ message: 'Company context missing' });
        }
        filter.companyId = req.user.companyId;
      }
    }

    const selectedActor = typeof actor === 'string' ? actor.trim() : '';
    if (selectedActor && selectedActor !== 'all' && mongoose.Types.ObjectId.isValid(selectedActor)) {
      filter.actor = new mongoose.Types.ObjectId(selectedActor);
    }

    if (action) filter.action = { $regex: action, $options: 'i' };
    if (module) filter.module = { $regex: module, $options: 'i' };

    const companyScope = filter.companyId;
    if (companyScope) {
      if (companyScope.$in) {
        filter.$or = [
          { companyId: { $in: companyScope.$in } },
          { 'details.companyId': { $in: companyScope.$in.map((id) => String(id)) } },
        ];
      } else {
        filter.$or = [
          { companyId: companyScope },
          { 'details.companyId': String(companyScope) },
        ];
      }
      delete filter.companyId;
    }

    // Non-admin roles (regular members) can only ever see their own activity.
    if (!isAdminRole && !isMaster) {
      filter.actor = req.user._id;
    }

    if (startDate || endDate) {
      filter.at = {};
      if (startDate) filter.at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.at.$lte = end;
      }
    }

    const audit = await AuditEntry.find(filter)
      .populate('actor', 'name email')
      .sort({ at: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json(audit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};