const AutomationRule = require('../models/AutomationRule');
const { requireCompanyId } = require('../middleware/tenant');

exports.list = async (req, res) => {
  try { res.json(await AutomationRule.find({ companyId: requireCompanyId(req) }).sort({ createdAt: -1 }).lean()); }
  catch (err) { res.status(500).json({ message: err.message }); }
};
exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, list, trigger = 'disposition_change', action = 'follow_up' } = req.body;
    if (!name || !list) return res.status(400).json({ message: 'Rule name and list are required' });
    res.status(201).json(await AutomationRule.create({ companyId, name: String(name).trim(), list: String(list).trim(), trigger, action, createdBy: req.user._id }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.update = async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndUpdate({ _id: req.params.id, companyId: requireCompanyId(req) }, { enabled: Boolean(req.body.enabled) }, { new: true }).lean();
    if (!rule) return res.status(404).json({ message: 'Automation rule not found' });
    res.json(rule);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.remove = async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndDelete({ _id: req.params.id, companyId: requireCompanyId(req) });
    if (!rule) return res.status(404).json({ message: 'Automation rule not found' });
    res.json({ message: 'Automation rule deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
