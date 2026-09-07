const mongoose = require('mongoose');

const supportReplySchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    senderRole: { type: String, default: 'user' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['P1', 'P2', 'P3'], default: 'P2' },
    status: { type: String, enum: ['Open', 'In progress', 'Resolved', 'Closed'], default: 'Open' },
    owner: { type: String, default: 'Unassigned' },
    messages: { type: [supportReplySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', ticketSchema);
