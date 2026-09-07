const mongoose = require('mongoose');

const trialSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  deviceIdentifier: { type: String, required: true, index: true },
  plan: { type: String, enum: ['STARTED', 'PRO'], required: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CONVERTED'], default: 'ACTIVE' },
  convertedToPaid: { type: Boolean, default: false },
  lastReminderSentAt: { type: Date, default: null },
}, { timestamps: true });

trialSchema.index({ email: 1 });
trialSchema.index({ phone: 1 });

module.exports = mongoose.model('Trial', trialSchema);