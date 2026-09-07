const mongoose = require('mongoose');

const voiceBroadcastCampaignSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  listId: { type: String, required: true },
  listName: { type: String, default: '' },
  total: { type: Number, default: 0 },
  captureInput: { type: Boolean, default: false },
  contentType: { type: String, enum: ['audio', 'text'], default: 'audio' },
  text: { type: String, default: '' },
  audioUrl: { type: String, default: '' },
  status: { type: String, enum: ['queued', 'paused', 'completed'], default: 'queued' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('VoiceBroadcastCampaign', voiceBroadcastCampaignSchema);
