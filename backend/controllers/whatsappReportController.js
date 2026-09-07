const WhatsappBroadcast = require('../models/WhatsappBroadcast');
const { requireCompanyId } = require('../middleware/tenant');

exports.getReport = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    to.setHours(23, 59, 59, 999);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return res.status(400).json({ message: 'Invalid report date range' });
    }

    const broadcasts = await WhatsappBroadcast.find({ companyId, createdAt: { $gte: from, $lte: to } }).sort({ createdAt: -1 }).lean();
    const totalRecipients = broadcasts.reduce((sum, item) => sum + (item.recipients?.length || 0), 0);
    const statusCounts = broadcasts.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
    const daily = {};
    broadcasts.forEach((item) => {
      const day = new Date(item.createdAt).toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { date: day, broadcasts: 0, recipients: 0 };
      daily[day].broadcasts += 1;
      daily[day].recipients += item.recipients?.length || 0;
    });

    res.json({
      from, to,
      summary: {
        broadcasts: broadcasts.length,
        recipients: totalRecipients,
        queued: statusCounts.queued || 0,
        scheduled: statusCounts.scheduled || 0,
        completed: statusCounts.completed || 0,
        drafts: statusCounts.draft || 0,
      },
      daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
      broadcasts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
