const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    script: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    leadsCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
