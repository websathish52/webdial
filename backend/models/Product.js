const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  sku: { type: String, default: '' },
  price: { type: Number, default: 0, min: 0 },
  color: { type: String, default: '#2563EB' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
