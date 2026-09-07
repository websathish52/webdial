const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_updated',
        'task_completed',
        'support_ticket',
        'support_ticket_updated',
        'payment_pending_approval',
        'payment_approved',
        'payment_rejected',
        'free_trial_started',
        'trial_expiring',
        'subscription_expiring',
        'subscription_expired',
        'subscription_activated',
      ],
      default: 'task_assigned',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    relatedTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
