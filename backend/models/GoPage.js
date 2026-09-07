const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({ question: String, answer: String }, { _id: false });

const goPageSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  slug: { type: String, required: true, unique: true },
  websiteUrl: { type: String, default: '' },
  offeringType: { type: String, enum: ['product', 'service'], default: 'product' },
  description: { type: String, default: '' },
  usp: { type: String, default: '' },
  features: { type: String, default: '' },
  faqs: { type: [faqSchema], default: [] },
  layout: { type: String, default: 'split-focus' },
  colorTheme: { type: String, default: 'corporate' },
  views: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  godialList: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

goPageSchema.index({ companyId: 1, createdAt: -1 });
module.exports = mongoose.model('GoPage', goPageSchema);
