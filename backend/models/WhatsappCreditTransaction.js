const mongoose = require('mongoose');

const whatsappCreditTransactionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  credits: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('WhatsappCreditTransaction', whatsappCreditTransactionSchema);
