const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, unique: true, trim: true },
    organisation: { type: String, default: '', trim: true },
    companyCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'], default: 'ACTIVE', index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
