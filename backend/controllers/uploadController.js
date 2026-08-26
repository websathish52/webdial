const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const Upload = require('../models/Upload');
const CompanySettings = require('../models/CompanySettings');
const Lead = require('../models/Lead');
const List = require('../models/List'); // Assuming S3 service exists for production
const { buildTenantFilter, requireCompanyId, isSuperAdmin } = require('../middleware/tenant');
const { assertStorageAvailable, syncStorageUsage } = require('../utils/storageLimit');

const ADMIN_ROLES = ['superadmin', 'admin'];
const MAX_IMPORT_ROWS = 25000;
const isAdminRole = (role) => ADMIN_ROLES.includes(String(role || '').toLowerCase());

function getUserIdReferences(user) {
  const refs = [];
  if (user._id) refs.push(user._id);
  if (user.id) refs.push(user.id);
  return refs;
}

function getUserListNames(user) {
  return Array.isArray(user.lists) ? user.lists.filter(Boolean) : [];
}

async function authorizeListByName(listName, req) {
  const query = buildTenantFilter(req, { name: listName });
  if (isAdminRole(req.user.role)) {
    return await List.findOne(query);
  }

  const ids = getUserIdReferences(req.user);
  query.$or = [
    { createdBy: { $in: ids } },
    { assignedTo: { $in: ids } },
  ];
  const listNames = getUserListNames(req.user);
  if (listNames.length) {
    query.$or.push({ name: { $in: listNames } });
  }
  return await List.findOne(query);
}

async function getAccessibleUploadListNames(req) {
  const companyFilter = buildTenantFilter(req, {});
  if (isAdminRole(req.user.role)) {
    const lists = await List.find(companyFilter).select('name');
    return lists.map((l) => l.name);
  }

  const ids = getUserIdReferences(req.user);
  const listNames = getUserListNames(req.user);
  const query = {
    ...companyFilter,
    $or: [
      { createdBy: { $in: ids } },
      { assignedTo: { $in: ids } },
      ...(listNames.length ? [{ name: { $in: listNames } }] : []),
    ],
  };
  const lists = await List.find(query).select('name');
  return Array.from(new Set([...listNames, ...lists.map((l) => l.name)]));
}

function toCleanString(value) {
  if (value == null) return '';
  return String(value).toString().trim();
}

function normalizePhoneDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  const trimmed = digits.replace(/^00/, '');
  if (/^91\d{10,15}$/.test(trimmed)) return trimmed.slice(2);
  if (/^\d{7,15}$/.test(trimmed)) return trimmed;
  return '';
}

function extractPhoneNumbers(value) {
  const text = toCleanString(value);
  if (!text) return [];

  const matches = text.match(/\d{7,15}/g) || [];
  const normalized = [];
  const seen = new Set();

  for (const match of matches) {
    const clean = normalizePhoneDigits(match);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    normalized.push(clean);
  }

  return normalized.length > 0 ? normalized : (text.match(/\d+/g) || []).map((chunk) => normalizePhoneDigits(chunk)).filter(Boolean);
}

function normalizePhone(value) {
  const [first] = extractPhoneNumbers(value);
  return first || '';
}

function getFieldValue(row, aliases) {
  const clean = (s) => String(s || '').toLowerCase().replace(/[\s_\-\.]/g, '');
  const keys = Object.keys(row || {});
  for (const alias of aliases) {
    const target = clean(alias);
    const match = keys.find((key) => clean(key) === target || clean(key).includes(target));
    if (match) return toCleanString(row[match]);
  }
  return '';
}

function parseRowsFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.csv') {
    const workbook = xlsx.readFile(filePath, { type: 'file', cellDates: true, raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
  }
  if (ext === '.txt') {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const rows = lines.slice(1).map((line) => {
      const parts = line.split(/[\t,;]/).map((value) => value.trim());
      return { name: parts[0] || '', phone: parts[1] || '', email: parts[2] || '' };
    });
    return rows.filter((row) => row.name || row.phone || row.email);
  }

  const workbook = xlsx.readFile(filePath, { type: 'file', cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

function validateImportLimit(rowCount) {
  if (rowCount <= MAX_IMPORT_ROWS) return null;
  return `Upload limit exceeded: this file has ${rowCount.toLocaleString()} numbers, but each file can contain only ${MAX_IMPORT_ROWS.toLocaleString()} numbers. Please split the file into smaller uploads.`;
}

function countImportRows(filePath, originalName) {
  const rows = parseRowsFromFile(filePath, originalName);
  return rows.reduce((count, row) => {
    const phones = extractPhoneNumbers(getFieldValue(row, ['phone', 'mobile', 'number', 'phonenumber', 'mobilenumber', 'contact', 'contactnumber', 'primaryphone', 'cell', 'tel', 'phone1']));
    return count + phones.length;
  }, 0);
}

async function insertLeadsInBatches(leads, listName, createdBy, sourceUploadId, companyId) {
  const batchSize = 1000;
  let insertedCount = 0;
  const normalized = [];
  const filePhones = new Set();
  for (const lead of leads) {
    if (!lead?.phone || filePhones.has(lead.phone)) continue;
    filePhones.add(lead.phone);
    normalized.push(lead);
  }
  if (!normalized.length) return 0;

  const phones = normalized.map((lead) => lead.phone);
  const existing = await Lead.find({ companyId, phone: { $in: phones } }).select('phone');
  const existingPhones = new Set(existing.map((item) => item.phone));
  const uniqueLeads = normalized.filter((lead) => !existingPhones.has(lead.phone));

  for (let index = 0; index < uniqueLeads.length; index += batchSize) {
    const batch = uniqueLeads.slice(index, index + batchSize).map((lead) => ({
      name: lead.name || 'Unknown',
      phone: lead.phone,
      email: lead.email || '',
      list: listName,
      companyId,
      createdBy,
      disposition: 'new',
      sourceUpload: sourceUploadId,
    }));
    if (!batch.length) continue;
    const inserted = await Lead.insertMany(batch, { ordered: false });
    insertedCount += inserted.length;
  }

  return insertedCount;
}

// Generic asset upload (for logos, KYC docs, etc.)
exports.uploadAsset = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const companyId = requireCompanyId(req);
  const purpose = req.body.purpose || 'general'; // e.g., 'company-logo', 'kyc-document'

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const file = req.file;
  const publicUrl = `/uploads/${file.filename}`;

  const record = await Upload.create({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    publicUrl,
    uploadedBy: req.user?._id,
    companyId,
    listName: `asset_${purpose}`, // Use a special name to distinguish from lead lists
    status: 'uploaded',
  });

  res.status(201).json({
    message: 'File uploaded successfully',
    url: publicUrl,
    _id: record._id,
    filename: record.filename,
    originalname: record.originalName,
    path: record.publicUrl,
  });
};

exports.uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const companyId = requireCompanyId(req);
  const purpose = req.body?.purpose || '';
  const listName = req.body?.list || req.body?.listName || '';
  if (!listName && purpose !== 'call-recording') return res.status(400).json({ message: 'List name required' });
  if (purpose === 'call-recording') {
    const file = req.file;
    try { await assertStorageAvailable(companyId, file.size); } catch (err) {
      try { fs.unlinkSync(file.path); } catch {}
      return res.status(err.statusCode || 500).json({ message: err.message, storageFull: Boolean(err.storageFull) });
    }
    const publicUrl = `/uploads/${file.filename}`;
    const record = await Upload.create({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      publicUrl,
      uploadedBy: req.user?._id || req.user?.id,
      companyId,
      listName: 'asset_call-recording',
      status: 'uploaded',
    });
    await syncStorageUsage(companyId);
    return res.status(201).json({ file: { _id: record._id, url: publicUrl, path: publicUrl, filename: record.filename } });
  }
  const authorizedList = await authorizeListByName(listName, req);
  if (!authorizedList) return res.status(403).json({ message: 'Forbidden to upload for this list' });

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const file = req.file;
  try { await assertStorageAvailable(companyId, file.size); } catch (err) {
    try { fs.unlinkSync(file.path); } catch {}
    return res.status(err.statusCode || 500).json({ message: err.message, storageFull: Boolean(err.storageFull) });
  }
  const publicUrl = `/uploads/${file.filename}`;
  const record = await Upload.create({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    publicUrl,
    uploadedBy: req.user?._id || req.user?.id,
    companyId,
    listName,
    importedCount: 0,
    status: 'uploaded',
  });

  let importedCount = 0;
  try {
    const rows = parseRowsFromFile(file.path, file.originalname);
    const normalizedLeads = rows.flatMap((row) => {
      const phones = extractPhoneNumbers(getFieldValue(row, ['phone', 'mobile', 'number', 'phonenumber', 'mobilenumber', 'contact', 'contactnumber', 'primaryphone', 'cell', 'tel', 'phone1']));
      const name = getFieldValue(row, ['name', 'fullname', 'customername', 'contactname', 'leadname', 'firstname']) || 'Unknown';
      const email = getFieldValue(row, ['email', 'emailaddress', 'mail', 'emailid', 'e-mail']);

      if (!phones.length) return [];
      return phones.map((phone) => ({ name, phone, email }));
    });

    const limitError = validateImportLimit(normalizedLeads.length);
    if (limitError) {
      record.status = 'uploaded';
      await record.save();
      return res.status(400).json({ message: limitError });
    }

    if (normalizedLeads.length) {
      importedCount = await insertLeadsInBatches(normalizedLeads, listName, req.user?._id || req.user?.id, record._id, companyId);
      record.importedCount = importedCount;
      record.status = importedCount > 0 ? 'imported' : 'uploaded';
      record.importedAt = new Date();
      await record.save();
    }
  } catch (err) {
    console.error('CRM import parsing failed:', err);
    record.status = 'uploaded';
    await record.save();
  }

  res.status(201).json({
    message: 'File uploaded',
    file: {
      _id: record._id,
      originalname: record.originalName,
      filename: record.filename,
      mimeType: record.mimetype,
      size: record.size,
      path: record.publicUrl,
      url: record.publicUrl,
      status: record.status,
      importedCount,
      createdAt: record.createdAt,
    },
  });
};

exports.getUploads = async (req, res) => {
  const query = buildTenantFilter(req, { status: { $ne: 'deleted' } });
  if (!isAdminRole(req.user.role)) {
    const accessibleListNames = await getAccessibleUploadListNames(req);
    query.$or = [
      { uploadedBy: req.user._id },
      { listName: { $in: accessibleListNames } },
    ];
  }
  const uploads = await Upload.find(query).sort({ createdAt: -1 });
  const settings = await CompanySettings.findOne({ companyId: query.companyId });
  const documentFiles = [];
  if (settings) {
    const configuredFiles = [
      ['Company logo', settings.companyInfo?.logoUrl, 'General'],
      ['KYC ID document', settings.kycDetails?.idDocUrl, 'KYC'],
      ['KYC registration document', settings.kycDetails?.regDocUrl, 'KYC'],
    ];
    for (const [originalName, publicUrl, category] of configuredFiles) {
      if (!publicUrl) continue;
      const relativePath = String(publicUrl).replace(/^\/uploads\//, '');
      const filePath = path.join(__dirname, '..', 'uploads', relativePath);
      let size = 0;
      let createdAt;
      try {
        const stat = fs.statSync(filePath);
        size = stat.size;
        createdAt = stat.birthtime;
      } catch {
        continue;
      }
      documentFiles.push({
        _id: `settings-${category}-${originalName.replace(/\s+/g, '-').toLowerCase()}`,
        originalName,
        filename: path.basename(filePath),
        mimetype: 'application/octet-stream',
        size,
        publicUrl,
        path: publicUrl,
        listName: category,
        status: 'uploaded',
        createdAt,
      });
    }
  }
  res.json([...documentFiles, ...uploads]);
};

exports.deleteUpload = async (req, res) => {
  const upload = await Upload.findOne({ _id: req.params.id, ...buildTenantFilter(req, {}) });
  if (!upload) return res.status(404).json({ message: 'Upload not found' });
  if (!isAdminRole(req.user.role) && upload.uploadedBy?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (upload.path) {
    try {
      fs.unlinkSync(upload.path);
    } catch (err) {
      console.warn('Could not delete file from disk:', err.message);
    }
  }

  const Lead = require('../models/Lead');
  await Lead.deleteMany({ sourceUpload: upload._id, companyId: upload.companyId });

  upload.status = 'deleted';
  await upload.save();
  res.json({ message: 'Upload removed' });
};

exports.MAX_IMPORT_ROWS = MAX_IMPORT_ROWS;
exports.validateImportLimit = validateImportLimit;
exports.countImportRows = countImportRows;
