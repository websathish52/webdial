const Company = require('../models/Company');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');
const { cascadeDeleteCompanyData } = require('../utils/Cascadedeletecompany');

exports.getCompanies = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const isMaster = role === 'master';
    const isSuperAdmin = role === 'superadmin';

    if (isMaster) {
      const companies = await Company.find().sort({ companyName: 1 });
      return res.json(companies);
    }

    if (isSuperAdmin) {
      const companies = await Company.find({ createdBy: req.user._id }).sort({ companyName: 1 });
      return res.json(companies);
    }

    const company = await Company.findById(req.user.companyId);
    return res.json(company ? [company] : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'superadmin' && role !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { companyName, companyCode, status = 'active' } = req.body;
    if (!companyName || !companyCode) return res.status(400).json({ message: 'companyName and companyCode are required' });

    const existing = await Company.findOne({ $or: [{ companyName }, { companyCode }] });
    if (existing) return res.status(409).json({ message: 'Company name or code already exists' });

    const company = new Company({ companyName, companyCode, status, createdBy: req.user._id });
    await company.save();

    // If a SuperAdmin creates their first company and has no companyId yet,
    // link them to it automatically.
    if (role === 'superadmin' && !req.user.companyId) {
      await User.findByIdAndUpdate(req.user._id, { companyId: company._id });
    }

    await logAudit(req.user._id, 'Created company', 'Company', { companyId: company._id, companyName });
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCompany = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const isMaster = role === 'master';
    const isSuperAdmin = role === 'superadmin';

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (!isMaster) {
      if (isSuperAdmin && String(company.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (!isSuperAdmin && String(req.user.companyId) !== String(req.params.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'superadmin' && role !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { companyName, companyCode, status } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (role === 'superadmin' && String(company.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (companyName) company.companyName = companyName;
    if (companyCode) company.companyCode = companyCode;
    if (status) company.status = status;
    await company.save();
    await logAudit(req.user._id, 'Updated company', 'Company', { companyId: company._id, companyName: company.companyName });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE a company: cascades to delete EVERY piece of data scoped to this
// company (leads, lists, tasks, uploads, pipeline, notifications, call
// logs, campaigns, recordings, whatsapp data, audit entries, and the
// company's own members). Never touches any other company's data.
exports.deleteCompany = async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'superadmin' && role !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (role === 'superadmin' && String(company.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const companyId = company._id;
    const companyName = company.companyName;

    await cascadeDeleteCompanyData(companyId, { deleteCompanyDoc: true, deleteUsers: true });

    // If the SuperAdmin's own companyId pointed at the deleted company,
    // clear it so they fall back to "no company" state.
    if (role === 'superadmin' && String(req.user.companyId) === String(companyId)) {
      await User.findByIdAndUpdate(req.user._id, { companyId: null });
    }

    await logAudit(req.user._id, 'Deleted company (cascade)', 'Company', { companyId, companyName });
    res.json({ message: 'Company and all its data deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return the login account associated with the selected company. A
// SuperAdmin may only access companies they created; Master may access any.
exports.getCompanyAccount = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (role === 'superadmin' && String(company.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (role !== 'master' && role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const account = await User.findOne({ companyId: company._id, role: /^admin$/i })
      .select('_id name email username phone role companyId')
      .sort({ createdAt: 1 })
      .lean();
    const fallbackAccount = account || await User.findOne({
      companyId: company._id,
      role: { $not: /^superadmin$/i },
    }).select('_id name email username phone role companyId').sort({ createdAt: 1 }).lean();
    res.json({
      company: { _id: company._id, companyName: company.companyName, companyCode: company.companyCode },
      account: fallbackAccount ? { ...fallbackAccount, id: fallbackAccount._id } : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeCompanyAccountPassword = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const { currentPassword, password } = req.body;
    if (!currentPassword || !password) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if ((role !== 'master') && (role !== 'superadmin' || String(company.createdBy) !== String(req.user._id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const account = await User.findOne({ companyId: company._id, role: /^admin$/i })
      || await User.findOne({ companyId: company._id, role: { $not: /^superadmin$/i } }).sort({ createdAt: 1 });
    if (!account) return res.status(404).json({ message: 'Company admin account not found' });
    const isCurrentPasswordValid = await account.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password does not match' });
    }
    account.password = password;
    await account.save();
    await logAudit(req.user._id, 'Changed company account password', 'Company', { companyId: company._id, accountId: account._id });
    res.json({ message: 'Company account password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};