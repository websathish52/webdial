const Campaign = require('../models/Campaign');
const AuditEntry = require('../models/AuditEntry');
const { requireCompanyId } = require('../middleware/tenant');

async function logAudit(actorId, action, moduleName, details = {}, companyId = null) {
  try {
    const payload = { actor: actorId, action, module: moduleName, details, ip: 'local' };
    if (companyId) payload.companyId = companyId;
    else if (details && details.companyId) payload.companyId = details.companyId;
    await AuditEntry.create(payload);
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
}

exports.getCampaigns = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const campaigns = await Campaign.find({ companyId }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, script, status } = req.body;
    if (!name || !script) return res.status(400).json({ message: 'Name and script required' });

    const campaign = await Campaign.create({
      companyId,
      name,
      script,
      status: status || 'active',
      createdBy: req.user._id,
    });

    await logAudit(req.user._id, 'Created campaign', 'Marketing', { campaignId: campaign._id, name }, companyId);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, script, status, leadsCount } = req.body;
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { name, script, status, leadsCount },
      { new: true, runValidators: true },
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await logAudit(req.user._id, 'Updated campaign', 'Marketing', { campaignId: campaign._id }, companyId);
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, companyId });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await logAudit(req.user._id, 'Deleted campaign', 'Marketing', { campaignId: campaign._id }, companyId);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


