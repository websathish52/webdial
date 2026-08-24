const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const permissionsSchema = new mongoose.Schema(
  {
    crm: { type: Boolean, default: true },
    team: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    tools: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    pbx: { type: Boolean, default: false },
    subscribe: { type: Boolean, default: false },
    payment: { type: Boolean, default: true },
    integration: { type: Boolean, default: false },
    recording: { type: Boolean, default: false },
    settings: { type: Boolean, default: true },
  },
  { _id: false }
);

const flagsSchema = new mongoose.Schema(
  {
    accessCrmOnApp: { type: Boolean, default: true },
    modifyMember: { type: Boolean, default: false },
    skipCall: { type: Boolean, default: false },
    deleteList: { type: Boolean, default: false },
    mobileRecording: { type: Boolean, default: false },
    enableWhatsapp: { type: Boolean, default: true },
    allowAllListAccess: { type: Boolean, default: false },
    callLogAccess: { type: Boolean, default: true },
    disableExportList: { type: Boolean, default: false },
    disableContactDelete: { type: Boolean, default: false },
    markAttendance: { type: Boolean, default: false },
    captureLocation: { type: Boolean, default: false },
    capturePhoto: { type: Boolean, default: false },
    enableSessionLock: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, enum: ['master', 'superadmin', 'admin', 'manager', 'submanager', 'telecaller'], default: 'telecaller' },
    teams: { type: [String], default: [] },
    lists: { type: [String], default: [] },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    permissions: { type: permissionsSchema, default: () => ({}) },
    flags: { type: flagsSchema, default: () => ({}) },
    // Per-user logo, used ONLY for SuperAdmin/Master's own identity when no
    // company is selected ("All Team"). This is separate from a Company's
    // logo (CompanySettings.companyInfo.logoUrl) — each SuperAdmin (A, B, ...)
    // has their own, and it never mixes with any company's logo.
    logoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);