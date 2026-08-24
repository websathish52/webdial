const AuditEntry = require('../models/AuditEntry');

async function logAudit(actorId, action, moduleName, details = {}, ip = 'local', companyId = null) {
  try {
    const payload = {
      actor: actorId,
      action,
      module: moduleName,
      details,
      ip,
    };
    if (companyId) payload.companyId = companyId;
    else if (details && details.companyId) payload.companyId = details.companyId;
    await AuditEntry.create(payload);
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
}

module.exports = logAudit;
