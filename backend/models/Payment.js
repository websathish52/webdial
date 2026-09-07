const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  plan: { type: String, required: true },
  pricePerUser: { type: Number, required: true },
  users: { type: Number, required: true, min: 1 },
  cycle: { type: String, enum: ['monthly', 'halfyearly', 'yearly', 'annual'], default: 'monthly' },
  amount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Processing', 'Paid', 'Rejected', 'Failed'], default: 'Processing' },
  upiId: { type: String, default: 'hduke1439@okaxis' },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  paidAt: { type: Date },
  expiry: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
