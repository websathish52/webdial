const mongoose = require('mongoose');

const extensionSchema = new mongoose.Schema({
  extension: { type: String, required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['online', 'on call', 'offline'], default: 'offline' },
  callsToday: { type: Number, default: 0 },
}, { _id: false });

const pbxSettingsSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true, index: true },
  active: { type: Boolean, default: false },
  provider: { type: String, default: 'Browser SIP' },
  sipDomain: { type: String, default: '' },
  extensions: { type: [extensionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('PbxSettings', pbxSettingsSchema);
