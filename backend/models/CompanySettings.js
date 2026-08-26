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
  paymentProfile: {
    company: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' },
    gstin: { type: String, default: '' },
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
  messageTemplates: [{
    name: String,
    desc: String,
    body: String,
    tag: String,
    attachmentUrl: String,
    attachmentName: String,
    attachmentType: String,
    attachmentSize: Number,
  }],
  storage: { used: { type: Number, default: 0 }, total: { type: Number, default: 100 } },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', CompanySettingsSchema);