const CallLog = require('../models/CallLog');
const User = require('../models/User');
const { buildTenantFilterAsync } = require('../middleware/tenant');

exports.getLeaderboard = async (req, res) => {
  try {
    const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'weekly';
    const end = req.query.end ? new Date(`${req.query.end}T23:59:59.999`) : new Date();
    const from = req.query.start ? new Date(`${req.query.start}T00:00:00`) : new Date(end);
    if (Number.isNaN(from.getTime()) || Number.isNaN(end.getTime()) || from > end) return res.status(400).json({ message: 'Invalid leaderboard date range' });
    if (!req.query.start) {
      const days = period === 'daily' ? 1 : period === 'monthly' ? 30 : 7;
      from.setHours(0, 0, 0, 0);
      from.setDate(end.getDate() - days + 1);
    }
    const callFilter = await buildTenantFilterAsync(req, { calledAt: { $gte: from, $lte: end } });
    const memberFilter = await buildTenantFilterAsync(req, {});
    const [calls, members] = await Promise.all([
      CallLog.find(callFilter).select('agent duration').lean(),
      User.find(memberFilter).select('_id name email role').lean(),
    ]);
    const byAgent = new Map();
    calls.forEach((call) => {
      const id = String(call.agent || '');
      if (!id) return;
      const current = byAgent.get(id) || { calls: 0, connected: 0, seconds: 0 };
      current.calls += 1;
      current.connected += Number(call.duration || 0) > 0 ? 1 : 0;
      current.seconds += Number(call.duration || 0);
      byAgent.set(id, current);
    });
    const entries = members.map((member) => {
      const stats = byAgent.get(String(member._id)) || { calls: 0, connected: 0, seconds: 0 };
      return { id: String(member._id), name: member.name || member.email || 'Member', role: member.role || 'Team member', calls: stats.calls, connectedCalls: stats.connected, notConnectedCalls: stats.calls - stats.connected, activeMinutes: Math.round(stats.seconds / 60), activityPresence: stats.calls ? Math.round((stats.connected / stats.calls) * 100) : 0 };
    });
    res.json({ period, from, end, entries });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
