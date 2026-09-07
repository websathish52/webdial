const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  name: { type: String, default: '' },
  phone: { type: String, required: true },
}, { _id: false });

const whatsappBroadcastSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  templateId: { type: String, default: '' },
  recipients: { type: [recipientSchema], default: [] },
  scheduledAt: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'scheduled', 'queued', 'completed'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('WhatsappBroadcast', whatsappBroadcastSchema);
