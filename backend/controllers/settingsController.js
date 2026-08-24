const CompanySettings = require('../models/CompanySettings');
const Upload = require('../models/Upload');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Helper to get or create settings for a company
const getOrCreateSettings = async (companyId) => {
  let settings = await CompanySettings.findOne({ companyId });
  if (!settings) {
    settings = await CompanySettings.create({ companyId });
  }
  return settings;
};

// When a privileged user (SuperAdmin/Master) has no company selected
// ("All Team" in the sidebar), settings must reflect THEIR OWN details,
// not any company's — and must never try to load/create a
// CompanySettings document with a null companyId (that was the source
// of the original crash).
function isOwnContext(req) {
  return !!req.isOwnContext;
}

function requireCompanySelectedResponse(res) {
  return res.status(400).json({ message: 'Select a specific company first.' });
}

// Ensures a per-tenant upload folder exists and returns its absolute path.
// scope is either `companies/<companyId>` or `users/<userId>` so a
// SuperAdmin's own files NEVER land in the same folder as any company's
// files, and two different companies never share a folder either.
function ensureUploadsDir(scope) {
  const dir = path.join(__dirname, '..', 'uploads', scope);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function saveBufferAndGetUrl(scope, file) {
  const dir = ensureUploadsDir(scope);
  const safeOriginal = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${safeOriginal}`;
  fs.writeFileSync(path.join(dir, fileName), file.buffer);
  // Publicly served path — server.js serves /uploads statically, which
  // covers this nested path automatically (express.static is recursive).
  return `/uploads/${scope}/${fileName}`;
}

// Best-effort delete of a previously uploaded file when it's replaced or
// removed, so switching logos/documents doesn't pile up orphaned files.
function tryDeleteFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  try {
    const rel = relativeUrl.replace(/^\/uploads\//, '');
    const full = path.join(__dirname, '..', 'uploads', rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    // non-fatal — old file staying on disk is not worth failing the request
  }
}

// --- General Settings ---
exports.getCompanyInfo = async (req, res) => {
  try {
    if (isOwnContext(req)) {
      // SuperAdmin/Master's own details (no company selected / "All Team").
      // logoUrl is THEIR OWN, persisted on the User document — never a
      // company's logo, and never shared between different SuperAdmins.
      return res.json({
        organizationName: req.user.name || '',
        address: '',
        addressLine2: '',
        website: '',
        description: '',
        country: 'India',
        currency: '₹',
        officeHoursStart: '10:00',
        officeHoursEnd: '19:00',
        logoUrl: req.user.logoUrl || '',
      });
    }
    const settings = await getOrCreateSettings(req.companyId);
    const companyInfo = settings.companyInfo.toObject();

    // If organizationName is not set, default it to the user's name
    if (!companyInfo.organizationName && req.user?.name) {
      companyInfo.organizationName = req.user.name;
    }
    res.json(companyInfo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCompanyInfo = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const settings = await getOrCreateSettings(req.companyId);
    settings.companyInfo = { ...settings.companyInfo.toObject(), ...req.body };
    await settings.save();
    res.json(settings.companyInfo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Company / Own Logo Upload ---
// Works for ANY role that reaches this route (SuperAdmin, Admin, Telecaller
// with settings permission, etc.) — the destination just depends on context:
//   - own context (SuperAdmin/Master, no company selected) -> User.logoUrl
//   - company context (a company selected)                 -> CompanySettings.companyInfo.logoUrl
exports.uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (isOwnContext(req)) {
      const oldUrl = req.user.logoUrl;
      const logoUrl = saveBufferAndGetUrl(`users/${req.user._id}`, req.file);
      await User.findByIdAndUpdate(req.user._id, { logoUrl });
      if (oldUrl) tryDeleteFile(oldUrl); // The 'url' property is redundant.
      return res.json({ logoUrl });
    }

    const settings = await getOrCreateSettings(req.companyId);
    const oldUrl = settings.companyInfo.logoUrl;
    const logoUrl = saveBufferAndGetUrl(`companies/${req.companyId}`, req.file);

    settings.companyInfo.logoUrl = logoUrl;
    await settings.save();
    if (oldUrl) tryDeleteFile(oldUrl);
    res.json({ logoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeCompanyLogo = async (req, res) => {
  try {
    if (isOwnContext(req)) {
      const oldUrl = req.user.logoUrl;
      await User.findByIdAndUpdate(req.user._id, { logoUrl: '' });
      if (oldUrl) tryDeleteFile(oldUrl);
      return res.json({ message: 'Logo removed' });
    }
    const settings = await getOrCreateSettings(req.companyId);
    const oldUrl = settings.companyInfo.logoUrl;
    settings.companyInfo.logoUrl = '';
    await settings.save();
    if (oldUrl) tryDeleteFile(oldUrl);
    res.json({ message: 'Logo removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- KYC Details ---
exports.getKYCDetails = async (req, res) => {
  try {
    if (isOwnContext(req)) {
      return res.json({
        idDocType: 'Aadhar Card',
        idDocUrl: '',
        regDocType: 'GST Certificate',
        regDocUrl: '',
      });
    }
    const settings = await getOrCreateSettings(req.companyId);
    res.json(settings.kycDetails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateKYCDetails = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const settings = await getOrCreateSettings(req.companyId);
    settings.kycDetails = { ...settings.kycDetails.toObject(), ...req.body };
    await settings.save();
    res.json(settings.kycDetails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- KYC Document Upload (used for both idDoc and regDoc routes) ---
// Returns the FULL kycDetails object (not just the uploaded field) so the
// frontend can immediately show/view/download/re-upload without a second
// round-trip, and supports replacing a file (old one is deleted from disk).
exports.uploadKYCDocument = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const settings = await getOrCreateSettings(req.companyId);
    const docUrl = saveBufferAndGetUrl(`companies/${req.companyId}`, req.file);

    // req.file.fieldname will be 'idDoc' or 'regDoc' depending on which
    // route/multer field was used (see routes/settings.js)
    const field = req.file.fieldname === 'idDoc' ? 'idDocUrl' : 'regDocUrl';
    const oldUrl = settings.kycDetails[field];
    settings.kycDetails.set(field, docUrl);
    settings.markModified('kycDetails');

    await settings.save();
    if (oldUrl) tryDeleteFile(oldUrl);
    // The frontend expects the specific field (`idDocUrl` or `regDocUrl`)
    // to be present in the response. Returning the whole object is safer
    // and ensures the frontend state is fully synchronized.
    res.json({ ...settings.kycDetails.toObject(), [field]: docUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remove a single KYC document (idDoc or regDoc) without touching the
// other one. Route: DELETE /api/settings/kyc/:field  (field = idDoc|regDoc)
exports.removeKYCDocument = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const { field } = req.params;
    if (!['idDoc', 'regDoc'].includes(field)) {
      return res.status(400).json({ message: 'Invalid document field' });
    }
    const urlField = field === 'idDoc' ? 'idDocUrl' : 'regDocUrl';
    const settings = await getOrCreateSettings(req.companyId);
    const oldUrl = settings.kycDetails[urlField];
    settings.kycDetails.set(urlField, '');
    settings.markModified('kycDetails');
    await settings.save();
    if (oldUrl) tryDeleteFile(oldUrl);
    res.json(settings.kycDetails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Unique Contacts ---
exports.getUniqueContactsSetting = async (req, res) => {
  try {
    if (isOwnContext(req)) return res.json({ mode: 'list' });
    const settings = await getOrCreateSettings(req.companyId);
    res.json(settings.uniqueContacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUniqueContactsSetting = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const { mode } = req.body;
    if (!['list', 'system'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid mode' });
    }
    const settings = await getOrCreateSettings(req.companyId);
    settings.uniqueContacts.mode = mode;
    await settings.save();
    res.json(settings.uniqueContacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Default Dialer ---
exports.getDialerSettings = async (req, res) => {
  try {
    if (isOwnContext(req)) return res.json({ selectedDialer: 'Phone Dialer' });
    const settings = await getOrCreateSettings(req.companyId);
    res.json({ selectedDialer: settings.defaultDialer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDialerSettings = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const { selectedDialer } = req.body;
    if (!selectedDialer) {
      return res.status(400).json({ message: 'selectedDialer is required' });
    }
    const settings = await getOrCreateSettings(req.companyId);
    settings.defaultDialer = selectedDialer;
    await settings.save();
    res.json({ selectedDialer: settings.defaultDialer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Message Templates ---
exports.getMessageTemplates = async (req, res) => {
  try {
    if (isOwnContext(req)) return res.json([]);
    const settings = await getOrCreateSettings(req.companyId);
    res.json(settings.messageTemplates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createMessageTemplate = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const settings = await getOrCreateSettings(req.companyId);
    settings.messageTemplates.push(req.body);
    await settings.save();
    res.status(201).json(settings.messageTemplates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMessageTemplate = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const settings = await CompanySettings.findOne({ companyId: req.companyId });
    if (!settings) return res.status(404).json({ message: 'Settings not found' });
    const template = settings.messageTemplates.id(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    Object.assign(template, req.body);
    await settings.save();
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteMessageTemplate = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    await CompanySettings.updateOne(
      { companyId: req.companyId },
      { $pull: { messageTemplates: { _id: req.params.id } } }
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Custom Statuses ---
const DEFAULT_DISPOSITION_STATUSES = [
  ['interested', 'Interested', '#eab308'],
  ['not_interested', 'Not Interested', '#6b7280'],
  ['callback', 'Callback', '#f59e0b'],
  ['converted', 'Converted', '#059669'],
  ['no_answer', 'Ringing / No Response', '#ef4444'],
  ['busy', 'Busy', '#92400e'],
  ['wrong_number', 'Wrong Number', '#111827'],
  ['dnd', 'DND', '#7f1d1d'],
];

async function getSettingsWithDefaultStatuses(companyId) {
  const settings = await getOrCreateSettings(companyId);
  let changed = false;
  for (const [key, name, color] of DEFAULT_DISPOSITION_STATUSES) {
    if (!settings.customStatuses.some((status) => status.key === key)) {
      settings.customStatuses.push({ key, name, color, description: '' });
      changed = true;
    }
  }
  if (changed) await settings.save();
  return settings;
}

exports.getCustomStatuses = async (req, res) => {
  try {
    if (isOwnContext(req)) return res.json([]);
    const settings = await getSettingsWithDefaultStatuses(req.companyId);
    res.json(settings.customStatuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCustomStatus = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const { name, description, color } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Status name is required' });
    }
    const key = String(name).trim().toLowerCase().replace(/\s+/g, '_');
    const settings = await getSettingsWithDefaultStatuses(req.companyId);
    if (settings.customStatuses.some((s) => s.key === key)) {
      return res.status(409).json({ message: 'Status with this name already exists' });
    }
    settings.customStatuses.push({ key, name, description, color });
    await settings.save();
    res.status(201).json(settings.customStatuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCustomStatus = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const { key } = req.params;
    await CompanySettings.updateOne(
      { companyId: req.companyId },
      { $pull: { customStatuses: { key: key } } }
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCustomStatus = async (req, res) => {
  try {
    if (isOwnContext(req)) return requireCompanySelectedResponse(res);
    const { key } = req.params;
    const settings = await getSettingsWithDefaultStatuses(req.companyId);
    const status = settings.customStatuses.find((s) => s.key === key);
    if (!status) return res.status(404).json({ message: 'Status not found' });
    const { name, description, color } = req.body;
    if (name) status.name = name;
    if (description !== undefined) status.description = description;
    if (color) status.color = color;
    await settings.save();
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Storage ---
exports.getStorageUsage = async (req, res) => {
  try {
    if (isOwnContext(req)) return res.json({ used: 0, total: 100 });
    const settings = await getOrCreateSettings(req.companyId);
    // Recalculate used storage based on uploads for this company only
    const uploads = await Upload.find({ companyId: req.companyId, status: { $ne: 'deleted' } });
    let usedInBytes = uploads.reduce((acc, file) => acc + (file.size || 0), 0);
    const storedDocumentUrls = [
      settings.companyInfo.logoUrl,
      settings.kycDetails.idDocUrl,
      settings.kycDetails.regDocUrl,
    ].filter(Boolean);
    for (const url of storedDocumentUrls) {
      const relativePath = String(url).replace(/^\/uploads\//, '');
      const filePath = path.join(__dirname, '..', 'uploads', relativePath);
      try {
        usedInBytes += fs.statSync(filePath).size;
      } catch {
        // The settings record may point to an old file that no longer exists.
      }
    }
    settings.storage.used = Math.round((usedInBytes / 1024 / 1024) * 100) / 100; // Convert to MB
    await settings.save();
    res.json(settings.storage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};