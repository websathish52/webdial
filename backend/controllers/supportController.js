const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSubscriptionEmail } = require('../utils/subscriptionMailer');

function getCompanyScope(req) {
  if (String(req.user.role || '').toLowerCase() === 'master') {
    return {};
  }

  const scopedCompanyId = req.companyId || req.user.companyId;
  if (scopedCompanyId) {
    return { companyId: scopedCompanyId };
  }

  return { requesterId: req.user._id };
}

async function createTicketNotification(ticket, action, actorUser) {
  const recipients = new Set();

  if (ticket.companyId) {
    const companyMembers = await User.find({ companyId: ticket.companyId }).select('_id').lean();
    companyMembers.forEach((member) => recipients.add(String(member._id)));
  }

  const masterUsers = await User.find({ role: 'master' }).select('_id').lean();
  masterUsers.forEach((member) => recipients.add(String(member._id)));

  if (actorUser && actorUser._id) {
    recipients.delete(String(actorUser._id));
  }

  const docs = [...recipients].map((recipientId) => ({
    companyId: ticket.companyId || null,
    recipientId,
    actorId: actorUser && actorUser._id ? actorUser._id : null,
    type: action === 'updated' ? 'support_ticket_updated' : 'support_ticket',
    title: action === 'updated' ? 'Support ticket updated' : 'New support ticket',
    message: action === 'updated'
      ? `Ticket ${ticket.ticketNumber} was updated: ${ticket.subject}`
      : `Ticket ${ticket.ticketNumber} was created: ${ticket.subject}`,
    relatedTicketId: ticket._id,
    metadata: {
      ticketNumber: ticket.ticketNumber,
      ticketSubject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status,
    },
  }));

  if (docs.length) {
    await Notification.insertMany(docs);
  }
}

async function notifyTicketByEmail(ticket, actorUser, action = 'created') {
  const recipients = new Set();
  const receptionistEmail = actorUser?.email || null;
  const adminEmail = process.env.ADMIN_EMAIL || 'sathish@webcodexus.com';

  if (receptionistEmail) recipients.add(String(receptionistEmail).trim().toLowerCase());
  if (adminEmail) recipients.add(String(adminEmail).trim().toLowerCase());

  const masterUsers = await User.find({ role: 'master' }).select('email').lean();
  masterUsers.forEach((user) => {
    if (user.email) recipients.add(String(user.email).trim().toLowerCase());
  });

  const subjectPrefix = action === 'updated' ? 'Support ticket updated' : 'New support ticket raised';
  const title = action === 'updated' ? 'Support ticket update' : 'Support ticket created';
  const details = {
    'Ticket #': ticket.ticketNumber,
    Subject: ticket.subject,
    Priority: ticket.priority,
    Status: ticket.status,
    Requester: actorUser?.name || actorUser?.email || ticket.createdBy || 'User',
    'Portal link': `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`,
  };

  await Promise.allSettled(
    [...recipients].filter(Boolean).map((to) => sendSubscriptionEmail({
      to,
      subject: `${subjectPrefix}: ${ticket.ticketNumber}`,
      title,
      details,
    }))
  );
}

exports.getSupportTickets = async (req, res) => {
  try {
    const filter = getCompanyScope(req);
    const tickets = await SupportTicket.find(filter)
      .populate('companyId', 'companyName companyCode')
      .populate('requesterId', 'name email role')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const normalized = tickets.map((ticket) => ({
      ...ticket,
      companyName: ticket.companyId?.companyName || 'General',
      requesterName: ticket.requesterId?.name || ticket.createdBy || 'User',
    }));

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch support tickets' });
  }
};

exports.createSupportTicket = async (req, res) => {
  try {
    const { subject, description, priority = 'P2', owner = 'Unassigned' } = req.body || {};

    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const companyId = req.companyId || req.user.companyId || null;
    const ticketNumber = `WD-${Date.now().toString().slice(-6)}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      companyId,
      requesterId: req.user._id,
      createdBy: req.user.name || req.user.email || 'User',
      subject: String(subject).trim(),
      description: String(description).trim(),
      priority: ['P1', 'P2', 'P3'].includes(String(priority).toUpperCase()) ? String(priority).toUpperCase() : 'P2',
      owner: String(owner || 'Unassigned').trim() || 'Unassigned',
      messages: [{
        sender: req.user.name || req.user.email || 'User',
        senderRole: String(req.user.role || 'user'),
        message: String(description).trim(),
      }],
    });

    await createTicketNotification(ticket, 'created', req.user);
    await notifyTicketByEmail(ticket, req.user, 'created');

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create support ticket' });
  }
};

exports.updateSupportTicket = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyScope(req) };
    const ticket = await SupportTicket.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const { status, priority, owner, subject, description } = req.body || {};

    if (subject) ticket.subject = String(subject).trim();
    if (description) ticket.description = String(description).trim();
    if (priority && ['P1', 'P2', 'P3'].includes(String(priority).toUpperCase())) {
      ticket.priority = String(priority).toUpperCase();
    }
    if (status && ['Open', 'In progress', 'Resolved', 'Closed'].includes(String(status))) {
      ticket.status = String(status);
    }
    if (owner !== undefined) {
      ticket.owner = String(owner || 'Unassigned').trim() || 'Unassigned';
    }

    await ticket.save();
    await createTicketNotification(ticket, 'updated', req.user);
    await notifyTicketByEmail(ticket, req.user, 'updated');
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update support ticket' });
  }
};

exports.deleteSupportTicket = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getCompanyScope(req) };
    const ticket = await SupportTicket.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    await SupportTicket.deleteOne({ _id: ticket._id });
    await Notification.deleteMany({ relatedTicketId: ticket._id });
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete support ticket' });
  }
};

exports.addSupportReply = async (req, res) => {
  try {
    const { message, senderName } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const filter = { _id: req.params.id, ...getCompanyScope(req) };
    const ticket = await SupportTicket.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const sender = senderName || req.user.name || req.user.email || 'User';
    ticket.messages.push({
      sender,
      senderRole: String(req.user.role || 'user'),
      message: String(message).trim(),
      createdAt: new Date(),
    });

    if (!ticket.owner || ticket.owner === 'Unassigned') {
      ticket.owner = sender;
    }
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      ticket.status = 'In progress';
    }

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add ticket reply' });
  }
};
