const Upload = require('../models/Upload');
const CompanySettings = require('../models/CompanySettings');
const fs = require('fs');
const path = require('path');

const STORAGE_LIMIT_MB = 100;

async function getStorageUsageBytes(companyId) {
  const uploads = await Upload.find({ companyId, status: { $ne: 'deleted' } }).select('size').lean();
  let total = uploads.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const settings = await CompanySettings.findOne({ companyId }).select('companyInfo kycDetails messageTemplates').lean();
  const urls = [settings?.companyInfo?.logoUrl, settings?.kycDetails?.idDocUrl, settings?.kycDetails?.regDocUrl,
    ...(settings?.messageTemplates || []).map((template) => template.attachmentUrl)].filter(Boolean);
  for (const url of urls) {
    const relativePath = String(url).replace(/^\/uploads\//, '');
    try { total += fs.statSync(path.join(__dirname, '..', 'uploads', relativePath)).size; } catch {}
  }
  return total;
}

async function assertStorageAvailable(companyId, incomingBytes) {
  const usedBytes = await getStorageUsageBytes(companyId);
  const limitBytes = STORAGE_LIMIT_MB * 1024 * 1024;
  if (usedBytes + Number(incomingBytes || 0) > limitBytes) {
    const usedMb = Math.round((usedBytes / 1024 / 1024) * 100) / 100;
    const incomingMb = Math.round((Number(incomingBytes || 0) / 1024 / 1024) * 100) / 100;
    const error = new Error(`Storage limit reached. ${usedMb}MB is already used and this file needs ${incomingMb}MB. Delete files or upgrade storage.`);
    error.statusCode = 507;
    error.storageFull = true;
    throw error;
  }
  return { usedBytes, limitBytes };
}

async function syncStorageUsage(companyId) {
  const usedBytes = await getStorageUsageBytes(companyId);
  await CompanySettings.findOneAndUpdate(
    { companyId },
    { $set: { 'storage.used': Math.round((usedBytes / 1024 / 1024) * 100) / 100, 'storage.total': STORAGE_LIMIT_MB } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return usedBytes;
}

module.exports = { STORAGE_LIMIT_MB, assertStorageAvailable, syncStorageUsage };
