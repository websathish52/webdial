const mongoose = require('mongoose');

const CompanyInfoSchema = new mongoose.Schema({
  organizationName: { type: String, default: 'Web' },
  address: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  website: { type: String, default: '' },
  description: { type: String, default: '' },
  country: { type: String, default: 'India' },
  currency: { type: String, default: '₹' },
  officeHoursStart: { type: String, default: '10:00' },
  officeHoursEnd: { type: String, default: '19:00' },
  logoUrl: { type: String, default: '' },
});

const KYCDetailsSchema = new mongoose.Schema({
  idDocType: { type: String, default: 'Aadhar Card' },
  idDocUrl: { type: String, default: '' },
  regDocType: { type: String, default: 'GST Certificate' },
  regDocUrl: { type: String, default: '' },
});

const CompanySettingsSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
    index: true,
  },
  companyInfo: {
    type: CompanyInfoSchema,
    default: () => ({}),
  },
  kycDetails: {
    type: KYCDetailsSchema,
    default: () => ({}),
  },
  uniqueContacts: {
    mode: { type: String, enum: ['list', 'system'], default: 'list' },
  },
  defaultDialer: { type: String, default: 'Phone Dialer' },
  customStatuses: [{ key: String, name: String, description: String, color: String }],
  messageTemplates: [{ name: String, desc: String, body: String, tag: String }],
  storage: { used: { type: Number, default: 0 }, total: { type: Number, default: 100 } },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', CompanySettingsSchema);