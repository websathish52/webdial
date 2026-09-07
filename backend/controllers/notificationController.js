const Notification = require('../models/Notification');
const Task = require('../models/Task');
const User = require('../models/User');
const Company = require('../models/Company');
const { resolveCompanyId } = require('../middleware/tenant');

exports.createNotification = async ({ companyId, recipientId, actorId, type, title, message, relatedTaskId, relatedTicketId, metadata = {} }) => {
  if (!recipientId) return null;
  const notification = await Notification.create({
    companyId: companyId || null,
    recipientId,
    actorId: actorId || null,
    type,
    title,
    message,
    relatedTaskId: relatedTaskId || null,
    relatedTicketId: relatedTicketId || null,
    metadata: metadata || {},
  });
  return notification;
};

exports.createPaymentNotification = async ({ companyId, recipientId, actorId, payment, customerName, companyName, status }) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  const titleMap = {
    pending: 'Payment submitted for approval',
    approved: 'Payment approved',
    rejected: 'Payment rejected',
  };
  const messageMap = {
    pending: `${customerName || 'Customer'} submitted a ${payment?.plan || 'subscription'} payment request for approval.`,
    approved: `${customerName || 'Customer'} payment was approved and the plan is active.`,
    rejected: `${customerName || 'Customer'} payment was rejected. Please review the failed payment details.`,
  };

  return exports.createNotification({
    companyId,
    recipientId,
    actorId,
    type: normalizedStatus === 'approved' ? 'payment_approved' : normalizedStatus === 'rejected' ? 'payment_rejected' : 'payment_pending_approval',
    title: titleMap[normalizedStatus] || 'Payment update',
    message: messageMap[normalizedStatus] || 'Payment updated.',
    metadata: {
      companyName: companyName || 'Company',
      customerName: customerName || 'Customer',
      plan: payment?.plan || 'Subscription',
      amount: Number(payment?.finalAmount ?? payment?.amount ?? 0),
      paymentId: String(payment?._id || ''),
      status: normalizedStatus,
    },
  });
};

exports.listNotifications = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const query = { recipientId: req.user._id };
    if (companyId) query.companyId = companyId;
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .lean();
    const taskIds = notifications.filter(n => n.relatedTaskId).map(n => n.relatedTaskId);
    const tasks = taskIds.length ? await Task.find({ _id: { $in: taskIds } }).lean() : [];
    const taskMap = Object.fromEntries(tasks.map(task => [String(task._id), task]));
    const recipient = await User.findById(req.user._id).select('name').lean();
    const actorIds = notifications.map((n) => n.actorId).filter(Boolean);
    const actors = actorIds.length ? await User.find({ _id: { $in: actorIds } }).select('name').lean() : [];
    const actorMap = Object.fromEntries(actors.map((actor) => [String(actor._id), actor.name]));
    const companyIds = notifications.map((n) => n.companyId).filter(Boolean);
    const companies = companyIds.length ? await Company.find({ _id: { $in: companyIds } }).select('companyName').lean() : [];
    const companyMap = Object.fromEntries(companies.map((company) => [String(company._id), company.companyName]));
    const enriched = notifications.map((n) => ({
      ...n,
      _id: n._id.toString(),
      relatedTask: taskMap[String(n.relatedTaskId)] || null,
      recipientName: recipient?.name || 'User',
      actorName: actorMap[String(n.actorId)] || 'System',
      companyName: companyMap[String(n.companyId)] || 'Company',
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const query = { _id: req.params.id, recipientId: req.user._id };
    if (companyId) query.companyId = companyId;
    const notification = await Notification.findOneAndUpdate(
      query,
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTaskAssignedNotification = async ({ companyId, recipientId, actorId, task, companyName }) => {
  const notification = await Notification.create({
    companyId,
    recipientId,
    actorId,
    type: 'task_assigned',
    title: 'New task assigned',
    message: `Task "${task.title}" was assigned to you`,
    relatedTaskId: task._id,
    metadata: {
      taskTitle: task.title,
      taskDescription: task.description || '',
      taskWhen: task.when,
      companyName,
      assignedBy: actorId ? String(actorId) : null,
    },
  });
  return notification;
};

exports.createTaskUpdatedNotification = async ({ companyId, recipientId, actorId, task, companyName, completed }) => {
  return Notification.create({
    companyId,
    recipientId,
    actorId,
    type: completed ? 'task_completed' : 'task_updated',
    title: completed ? 'Task completed' : 'Task updated',
    message: `Task "${task.title}" was ${completed ? 'completed' : 'updated'}`,
    relatedTaskId: task._id,
    metadata: { taskTitle: task.title, companyName },
  });
};
