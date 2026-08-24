const User = require('../models/User');
const Company = require('../models/Company');
const logAudit = require('../utils/auditLogger');
const { cascadeDeleteCompanyData } = require('../utils/cascadeDeleteCompany');

// GET all SuperAdmins along with their company details (if any)
exports.getSuperAdmins = async (req, res) => {
  try {
    const superAdmins = await User.find({ role: 'superadmin' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(superAdmins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE a SuperAdmin ONLY -- no company is created here.
// The SuperAdmin logs in with no company assigned and creates their own
// company later from their Team & Members page.
exports.createSuperAdmin = async (req, res) => {
  try {
    const { name, email, username, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = username ? String(username).trim().toLowerCase() : undefined;

    const orUserCheck = [{ email: normalizedEmail }];
    if (normalizedUsername) orUserCheck.push({ username: normalizedUsername });
    const existingUser = await User.findOne({ $or: orUserCheck });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email or username already exists' });
    }

    const superAdmin = await User.create({
      name,
      email: normalizedEmail,
      username: normalizedUsername,
      phone,
      password,
      role: 'superadmin',
      companyId: null, // No company yet -- SuperAdmin creates their own later.
    });

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