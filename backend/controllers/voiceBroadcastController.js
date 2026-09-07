const VoiceBroadcastCampaign = require('../models/VoiceBroadcastCampaign');
const List = require('../models/List');
const Lead = require('../models/Lead');
const { requireCompanyId } = require('../middleware/tenant');

exports.getLists = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const lists = await List.find({ companyId }).lean();
    const counts = await Lead.aggregate([{ $match: { companyId } }, { $group: { _id: '$list', count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [item._id, item.count]));
    res.json(lists.map((list) => ({ id: String(list._id), name: list.name, count: countMap.get(list.name) || 0 })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStatus = async (req, res) => { res.json({ maintenance: false }); };

exports.list = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    res.json(await VoiceBroadcastCampaign.find({ companyId }).sort({ createdAt: -1 }).lean().then((rows) => rows.map((row) => ({ ...row, id: String(row._id), createdAt: row.createdAt?.toISOString() || '' }))));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, listId, captureInput, contentType, text, audioUrl } = req.body;
    if (!String(name || '').trim() || !listId) return res.status(400).json({ message: 'Campaign name and list are required' });
    const list = await List.findOne({ _id: listId, companyId }).lean();
    if (!list) return res.status(404).json({ message: 'List not found' });
    const total = await Lead.countDocuments({ companyId, list: list.name });
    const campaign = await VoiceBroadcastCampaign.create({ companyId, name: String(name).trim(), listId, listName: list.name, total, captureInput: Boolean(captureInput), contentType: contentType === 'text' ? 'text' : 'audio', text: String(text || ''), audioUrl: String(audioUrl || ''), createdBy: req.user._id });
    res.status(201).json({ ...campaign.toObject(), id: String(campaign._id), createdAt: campaign.createdAt.toISOString() });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
