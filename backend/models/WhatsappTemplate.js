const mongoose = require('mongoose');

const whatsappTemplateSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ['approved', 'pending'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);
