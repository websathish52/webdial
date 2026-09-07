const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  list: { type: String, required: true, trim: true },
  trigger: { type: String, default: 'disposition_change' },
  action: { type: String, default: 'follow_up' },
  enabled: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
module.exports = mongoose.model('AutomationRule', automationRuleSchema);
