const PbxSettings = require('../models/PbxSettings');
const { requireCompanyId } = require('../middleware/tenant');

exports.get = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const settings = await PbxSettings.findOne({ companyId }).populate('extensions.agent', 'name email').lean();
    res.json(settings || { companyId, active: false, provider: 'Browser SIP', sipDomain: '', extensions: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { active, provider, sipDomain, extensions } = req.body;
    const settings = await PbxSettings.findOneAndUpdate(
      { companyId },
      { companyId, active: Boolean(active), provider: provider || 'Browser SIP', sipDomain: sipDomain || '', extensions: Array.isArray(extensions) ? extensions : [] },
      { upsert: true, new: true, runValidators: true },
    ).populate('extensions.agent', 'name email');
    res.json(settings);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
