const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    recordCalls: { type: Boolean, default: true },
    dialGap: { type: Number, default: 5 },
    customDispositions: [{ label: String, color: String }],
    customFields: [{ key: String, label: String, type: String }],
    messageTemplates: [{ id: String, name: String, body: String }],
    storageUsedMb: { type: Number, default: 0 },
    storageLimitMb: { type: Number, default: 5120 },
    companyName: { type: String, default: 'Web' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
