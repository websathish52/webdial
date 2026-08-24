const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    leadName: { type: String, required: true },
    phone: { type: String, required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration: { type: Number, default: 0 },
    url: { type: String, required: true },
    disposition: {
      type: String,
      enum: ['new', 'interested', 'not_interested', 'callback', 'converted', 'dnd', 'no_answer', 'busy', 'wrong_number'],
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recording', recordingSchema);
