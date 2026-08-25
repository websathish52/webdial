const User = require('../models/User');
const Settings = require('../models/Settings');
const logAudit = require('../utils/auditLogger');
const { buildTenantFilterAsync, isSuperAdmin, isMaster } = require('../middleware/tenant');
const Company = require('../models/Company');

exports.getMembers = async (req, res) => {
  try {
    const filter = await buildTenantFilterAsync(req, {});

    if (!isSuperAdmin(req) && !isMaster(req) && !filter.companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let members = await User.find(filter).select('-password');

    if (isSuperAdmin(req)) {
      const alreadyIncluded = members.some((m) => String(m._id) === String(req.user._id));
      if (!alreadyIncluded) {
        const self = await User.findById(req.user._id).select('-password');
        if (self) members = [self, ...members];
      }
    } else if (!isMaster(req) && req.user.companyId) {
      const company = await Company.findById(req.user.companyId).select('createdBy');
      if (company?.createdBy && !members.some((m) => String(m._id) === String(company.createdBy))) {
        const companyOwner = await User.findById(company.createdBy).select('-password');
        if (companyOwner) members = [companyOwner, ...members];
      }
    }

    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMember = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      const self = await User.findById(req.user._id).select('-password');
      if (self) return res.json(self);
    }
    const filter = await buildTenantFilterAsync(req, {});
    const member = await User.findOne({ _id: req.params.id, ...filter }).select('-password');
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  try {
    const { name, email, phone, role, username, lists, teams, companyId, permissions, flags } = req.body;

    let member;
    if (String(req.params.id) === String(req.user._id)) {
      member = await User.findById(req.user._id);
    } else {
      const filter = await buildTenantFilterAsync(req, {});
      member = await User.findOne({ _id: req.params.id, ...filter });
    }
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (name) member.name = name;
    if (email) member.email = email.toLowerCase();
    if (phone !== undefined) member.phone = phone;
    if (role) member.role = role;
    if (username !== undefined) member.username = username;
    if (lists !== undefined) member.lists = lists;
    if (teams !== undefined) member.teams = teams;

    // Only SuperAdmin/Master/Admin can change someone else's permissions
    // & flags. A member must never be able to elevate their own access
    // by sending permissions/flags on their own profile update.
    const isSelf = String(req.params.id) === String(req.user._id);
    const requesterRole = String(req.user.role || '').toLowerCase();
    const canManagePermissions = isSuperAdmin(req) || isMaster(req) || (!isSelf && (requesterRole === 'admin' || requesterRole === 'manager'));

    if (permissions !== undefined) {
      if (!canManagePermissions) {
        return res.status(403).json({ message: 'You are not allowed to change permissions' });
      }
      member.permissions = { ...(member.permissions?.toObject?.() ?? member.permissions ?? {}), ...permissions };
    }
    if (flags !== undefined) {
      if (!canManagePermissions) {
        return res.status(403).json({ message: 'You are not allowed to change access flags' });
      }
      member.flags = { ...(member.flags?.toObject?.() ?? member.flags ?? {}), ...flags };
    }

    // FIX: previously this only allowed a SuperAdmin to assign a member to
    // a company that THEY personally created (`createdBy: req.user._id`),
    // which silently 403'd (or worse, was masked by the outer try/catch)
    // whenever a SuperAdmin tried to assign a member to any other company
    // that legitimately exists in the system. A SuperAdmin (and Master)
    // should be able to assign members to ANY existing company.
    if (companyId && (isSuperAdmin(req) || isMaster(req))) {
      const targetCompany = await Company.findById(companyId).lean();
      if (!targetCompany) {
        return res.status(400).json({ message: 'Company not found' });
      }
      member.companyId = companyId;
    } else if (companyId === null && isSuperAdmin(req)) {
      // Allow SuperAdmin to unassign a user from a company
      member.companyId = null;
    }

    await member.save();
    const safeMember = await User.findById(req.params.id).select('-password');
    await logAudit(req.user._id, 'Updated member', 'Team', { memberId: member._id, name: member.name, companyId: member.companyId });
    res.json(safeMember);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update member password
exports.updateMemberPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required' });

    let member;
    if (String(req.params.id) === String(req.user._id)) {
      member = await User.findById(req.user._id);
    } else {
      const filter = await buildTenantFilterAsync(req, {});
      member = await User.findOne({ _id: req.params.id, ...filter });
    }
    if (!member) return res.status(404).json({ message: 'Member not found' });

    member.password = password;
    await member.save();

    const safeMember = await User.findById(req.params.id).select('-password');
    await logAudit(req.user._id, 'Updated member password', 'Team', { memberId: member._id, name: member.name });
    res.json({ message: 'Password updated', member: safeMember });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete member
exports.deleteMember = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own SuperAdmin account here' });
    }
    const filter = await buildTenantFilterAsync(req, {});
    const member = await User.findOneAndDelete({ _id: req.params.id, ...filter });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await Settings.deleteOne({ user: req.params.id });
    await logAudit(req.user._id, 'Deleted member', 'Team', { memberId: member._id, name: member.name, companyId: member.companyId });

    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get member settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });
    if (!settings) {
      if (!req.user.companyId) return res.json({ dialGap: 5 });
      settings = new Settings({ user: req.user._id, companyId: req.user.companyId });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update member settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });
    if (!settings) {
      if (!req.user.companyId) return res.status(400).json({ message: 'Company context missing' });
      settings = new Settings({ user: req.user._id, companyId: req.user.companyId });
    }

    if (req.body.dialGap !== undefined) {
      const dialGap = Number(req.body.dialGap);
      if (!Number.isInteger(dialGap) || dialGap < 0 || dialGap > 3600) {
        return res.status(400).json({ message: 'Dial gap must be a whole number between 0 and 3600 seconds' });
      }
    }
    Object.assign(settings, req.body);
    await settings.save();
    await logAudit(req.user._id, 'Updated settings', 'Settings', { userId: req.user._id });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};