const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    name: { type: String, required: true },
    text: { type: String, required: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsappMessage', whatsappMessageSchema);
