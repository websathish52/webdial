// utils/cascadeDeleteCompany.js
//
// Deletes a Company and EVERYTHING scoped to it across every collection
// that stores a companyId. Used both when:
//   1. Master deletes a SuperAdmin -> delete each of their companies +
//      all data inside those companies.
//   2. A SuperAdmin deletes one of their own companies from Team & Members
//      -> delete that company + all data inside it, without touching any
//      other company's data.
//
// IMPORTANT: this only ever deletes documents matching a specific
// companyId, so it can never affect another tenant's data.

const Lead = require('../models/Lead');
const List = require('../models/List');
const Upload = require('../models/Upload');
const CallLog = require('../models/CallLog');
const Campaign = require('../models/Campaign');
const Notification = require('../models/Notification');
const PipelineDeal = require('../models/PipelineDeal');
const PipelineStage = require('../models/PipelineStage');
const Recording = require('../models/Recording');
const Task = require('../models/Task');
const WhatsappMessage = require('../models/WhatsappMessage');
const WhatsappTemplate = require('../models/WhatsappTemplate');
const AuditEntry = require('../models/AuditEntry');
const Settings = require('../models/Settings');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');
const Company = require('../models/Company');
const Integration = require('../models/Integration');
const PbxSettings = require('../models/PbxSettings');

const fs = require('fs');

/**
 * Deletes every document across every collection that belongs to the
 * given companyId, then deletes the Company document itself.
 * Does NOT delete the Company document if deleteCompanyDoc is false
 * (useful if the caller wants to delete the company separately/first).
 *
 * @param {string|mongoose.Types.ObjectId} companyId
 * @param {object} [opts]
 * @param {boolean} [opts.deleteCompanyDoc=true]
 * @param {boolean} [opts.deleteUsers=true] whether to also delete User
 *   documents (members/telecallers) belonging to this company. The
 *   SuperAdmin's own User document is handled separately by the caller.
 */
async function cascadeDeleteCompanyData(companyId, opts = {}) {
  const { deleteCompanyDoc = true, deleteUsers = true } = opts;
  if (!companyId) return;

  const results = {};

  // Leads + their uploaded files
  const uploads = await Upload.find({ companyId }).catch(() => []);
  for (const upload of uploads) {
    if (upload.path) {
      try { fs.unlinkSync(upload.path); } catch (e) { /* file may already be gone */ }
    }
  }
  results.uploads = await Upload.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));

  results.leads = await Lead.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.lists = await List.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.callLogs = await CallLog.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.campaigns = await Campaign.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.notifications = await Notification.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.pipelineDeals = await PipelineDeal.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.pipelineStages = await PipelineStage.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.recordings = await Recording.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.tasks = await Task.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.whatsappMessages = await WhatsappMessage.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.whatsappTemplates = await WhatsappTemplate.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.auditEntries = await AuditEntry.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.companySettings = await CompanySettings.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.settingsByCompany = await Settings.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.integrations = await Integration.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));
  results.pbxSettings = await PbxSettings.deleteMany({ companyId }).catch(() => ({ deletedCount: 0 }));

  if (deleteUsers) {
    // Delete all non-superadmin members belonging to this company
    // (telecallers, managers, admins). Their Settings docs go too.
    const companyUsers = await User.find({ companyId, role: { $ne: 'superadmin' } }).select('_id');
    const userIds = companyUsers.map((u) => u._id);
    if (userIds.length) {
      results.settings = await Settings.deleteMany({ user: { $in: userIds } }).catch(() => ({ deletedCount: 0 }));
      results.users = await User.deleteMany({ _id: { $in: userIds } }).catch(() => ({ deletedCount: 0 }));
    }
  }

  if (deleteCompanyDoc) {
    await Company.findByIdAndDelete(companyId).catch(() => null);
  }

  return results;
}

module.exports = { cascadeDeleteCompanyData };