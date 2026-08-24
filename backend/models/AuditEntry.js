const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    action: { type: String, required: true },
    module: { type: String, required: true },
    ip: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditEntry', auditEntrySchema);
