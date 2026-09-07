const WhatsappBroadcast = require('../models/WhatsappBroadcast');
const { requireCompanyId } = require('../middleware/tenant');

exports.list = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const broadcasts = await WhatsappBroadcast.find({ companyId }).sort({ createdAt: -1 }).lean();
    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, message, templateId = '', recipients = [], scheduledAt = null, status = 'draft' } = req.body;
    if (!name || !message) return res.status(400).json({ message: 'Name and message are required' });
    if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ message: 'Select at least one recipient' });
    if (!['draft', 'scheduled', 'queued'].includes(status)) return res.status(400).json({ message: 'Invalid broadcast status' });

    const broadcast = await WhatsappBroadcast.create({
      companyId, name: String(name).trim(), message: String(message).trim(), templateId,
      recipients: recipients.map((recipient) => ({ leadId: recipient.leadId, name: recipient.name, phone: recipient.phone })),
      scheduledAt: scheduledAt || null, status, createdBy: req.user._id,
    });
    res.status(201).json(broadcast);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const broadcast = await WhatsappBroadcast.findOneAndDelete({ _id: req.params.id, companyId });
    if (!broadcast) return res.status(404).json({ message: 'Broadcast not found' });
    res.json({ message: 'Broadcast deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
