const mongoose = require('mongoose');

const listSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    leadsCount: { type: Number, default: 0 },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('List', listSchema);
