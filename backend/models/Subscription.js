const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  plan: { type: String, enum: ['FREE', 'STARTED', 'PRO'], required: true },
  type: { type: String, enum: ['MANUAL', 'FREE_TRIAL', 'PAID'], required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'], default: 'ACTIVE', index: true },
  numberOfUsers: { type: Number, min: 1, default: 1 },
  billingPeriod: { type: String, enum: ['monthly', 'halfyearly', 'annual'], default: 'monthly' },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date },
  amount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  transactionId: { type: String, default: '' },
  lastReminderSentAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);