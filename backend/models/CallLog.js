const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    phone: { type: String, required: true },
    name: { type: String, required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration: { type: Number, default: 0 },
    disposition: {
      type: String,
      enum: ['new', 'interested', 'not_interested', 'callback', 'converted', 'dnd', 'no_answer', 'busy', 'wrong_number'],
      default: 'new',
    },
    notes: { type: String },
    recordingUrl: { type: String },
    calledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallLog', callLogSchema);
