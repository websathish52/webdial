const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Recording = require('../models/Recording');
const User = require('../models/User');
const { buildTenantFilter, buildTenantFilterAsync, requireCompanyId } = require('../middleware/tenant');

// Log a call
exports.logCall = async (req, res) => {
  try {
    const { leadId, phone, name, duration, disposition, notes, recordingUrl } = req.body;
    if (!leadId || !phone || !name) return res.status(400).json({ message: 'Missing required fields' });

    const companyId = requireCompanyId(req);
    const callLog = new CallLog({
      companyId,
      leadId,
      phone,
      name,
      agent: req.user._id,
      duration,
      disposition: disposition || 'new',
      notes,
      recordingUrl,
    });
    await callLog.save();

    // Update lead
    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, companyId },
      { disposition: disposition || 'new', $inc: { totalDuration: duration } },
      { new: true }
    );

    // Save recording if needed
    if (recordingUrl && duration > 0) {
      if (recordingUrl) {
        const recording = new Recording({
          companyId,
          leadName: name,
          phone,
          agent: req.user._id,
          duration,
          url: recordingUrl,
          disposition,
          date: new Date(),
        });
        await recording.save();
      }
    }

    res.status(201).json({ callLog, lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get call logs
// Get call logs
exports.getCallLogs = async (req, res) => {
  try {
    const { agent, limit = 1000, skip = 0, scope } = req.query;
    const isAdmin = ['superadmin', 'admin'].includes(String(req.user?.role || '').toLowerCase());

    let filter;
    if (scope === 'team') {
      // Team Activity table: company-wide, regardless of role
      filter = await buildTenantFilterAsync(req, agent ? { agent } : {});
    } else {
      // Personal stat cards / charts: scoped to own calls unless admin
      filter = await buildTenantFilterAsync(req, isAdmin && agent ? { agent } : isAdmin ? {} : { agent: req.user._id });
    }

    const calls = await CallLog.find(filter)
      .populate('leadId', 'name phone')
      .populate('agent', 'name')
      .populate('companyId', 'companyName companyCode')
      .sort({ calledAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallLog.countDocuments(filter);
    res.json({ calls, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isAdmin = ['superadmin', 'admin'].includes(String(req.user?.role || '').toLowerCase());
    const companyFilter = await buildTenantFilterAsync(req, {});
    const callFilter = await buildTenantFilterAsync(req, isAdmin ? {} : { agent: req.user._id });

    const leadQuery = companyFilter;
    const allLeads = await Lead.find(leadQuery);

    // If not admin, call filter should be scoped to the agent
    if (!isAdmin) {
      callFilter.agent = req.user._id;
    }

    const callsToday = await CallLog.countDocuments({
      ...callFilter,
      calledAt: { $gte: today },
    });

    const dispoCount = {};
    allLeads.forEach(l => {
      dispoCount[l.disposition] = (dispoCount[l.disposition] || 0) + 1;
    });

    const dailyCallsData = []; // This is correct as it uses callFilter
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);

      const count = await CallLog.countDocuments({
        ...callFilter,
        calledAt: { $gte: d, $lt: next },
      });
      dailyCallsData.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), calls: count });
    }

    const teamMembers = await User.find(companyFilter).select('-password');

    res.json({
      callsToday,
      conversions: dispoCount['converted'] || 0,
      totalLeads: allLeads.length,
      dispositions: dispoCount,
      dailyCallsData,
      teamMembers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get recordings
exports.getRecordings = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const isAdmin = ['superadmin', 'admin', 'manager', 'submanager'].includes(String(req.user?.role || '').toLowerCase());
    const filter = await buildTenantFilterAsync(req, isAdmin ? {} : { agent: req.user._id || req.user.id });

    const recordings = await Recording.find(filter)
      .populate('agent', 'name')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Recording.countDocuments(filter);

    if (recordings.length === 0) {
      const fallbackCalls = await CallLog.find(filter)
        .populate('agent', 'name')
        .populate('leadId', 'name')
        .sort({ calledAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const fallbackRecordings = fallbackCalls
        .filter((call) => call.recordingUrl || call.duration > 0)
        .map((call) => ({
          _id: call._id,
          id: call._id,
          leadName: call.leadId?.name || call.name || 'Unknown lead',
          phone: call.phone,
          agent: call.agent,
          duration: call.duration || 0,
          url: call.recordingUrl || null,
          date: call.calledAt || call.createdAt,
          disposition: call.disposition,
        }));

      return res.json({ recordings: fallbackRecordings, total: fallbackRecordings.length });
    }

    res.json({ recordings, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
