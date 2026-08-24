const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    secondaryPhone: { type: String },
    email: { type: String },
    company: { type: String },
    address: { type: String },
    remarks: { type: String },
    note: { type: String },
    disposition: {
      type: String,
      enum: ['new', 'interested', 'not_interested', 'callback', 'converted', 'dnd', 'no_answer', 'busy', 'wrong_number'],
      default: 'new',
    },
    list: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    sourceUpload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalDuration: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
