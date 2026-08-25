const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  provider: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  connected: { type: Boolean, default: false },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  connectedAt: { type: Date },
}, { timestamps: true });

integrationSchema.index({ companyId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('Integration', integrationSchema);
