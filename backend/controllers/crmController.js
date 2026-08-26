const fs = require('fs');
const Lead = require('../models/Lead');
const List = require('../models/List');
const Upload = require('../models/Upload');
const logAudit = require('../utils/auditLogger');
const { buildTenantFilterAsync, requireCompanyId } = require('../middleware/tenant');

function normalizeLimit(value, fallback = 50000) {
  const num = parseInt(String(value || ''), 10);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeSkip(value) {
  const num = parseInt(String(value || ''), 10);
  return Number.isNaN(num) ? 0 : num;
}

async function applyListAccessFilter(req, filter) {
  const role = String(req.user?.role || '').toLowerCase();
  if (['master', 'superadmin', 'admin'].includes(role) || req.user?.flags?.allowAllListAccess) return filter;

  const assignedLists = await List.find({
    companyId: filter.companyId,
    $or: [
      { name: { $in: Array.isArray(req.user?.lists) ? req.user.lists : [] } },
      { assignedTo: req.user._id },
      { assignedTo: { $size: 0 } },
    ],
  }).select('name').lean();
  filter.list = { $in: assignedLists.map((list) => list.name) };
  return filter;
}

// Get all leads (with filters)
exports.getLeads = async (req, res) => {
  try {
    const { list, disposition, limit = 50000, skip = 0 } = req.query;
    const filter = await buildTenantFilterAsync(req, {});
    await applyListAccessFilter(req, filter);
    if (list) {
      if (filter.list?.$in && !filter.list.$in.includes(list)) return res.json({ leads: [], total: 0 });
      filter.list = list;
    }
    if (disposition) filter.disposition = disposition;

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .limit(normalizeLimit(limit))
      .skip(normalizeSkip(skip));
    const total = await Lead.countDocuments(filter);

    res.json({ leads, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single lead
exports.getLead = async (req, res) => {
  try {
    const filter = await buildTenantFilterAsync(req, {});
    await applyListAccessFilter(req, filter);
    const lead = await Lead.findOne({ _id: req.params.id, ...filter });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create lead
exports.createLead = async (req, res) => {
  try {
    const { name, phone, email, list, company, address, remarks } = req.body;
    if (!name || !phone || !list) return res.status(400).json({ message: 'Missing required fields' });

    const companyId = requireCompanyId(req);
    const lead = new Lead({ companyId, name, phone, email, list, company, address, remarks, createdBy: req.user._id });
    await lead.save();
    await logAudit(req.user._id, 'Created lead', 'CRM', { leadId: lead._id, list, companyId });
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bulk import leads
exports.importLeads = async (req, res) => {
  try {
    const { leads, list } = req.body;
    if (!leads || !Array.isArray(leads) || !list) return res.status(400).json({ message: 'Invalid format' });
    if (leads.length > 25000) return res.status(400).json({ message: 'Cannot import more than 25,000 leads at once.' });

    const companyId = requireCompanyId(req);
    const accessFilter = await applyListAccessFilter(req, { companyId });
    if (accessFilter.list?.$in && !accessFilter.list.$in.includes(list)) {
      return res.status(403).json({ message: 'You do not have access to this list' });
    }
    const leadsToInsert = leads.map((l) => ({
      ...l,
      list,
      companyId,
      createdBy: req.user._id,
      disposition: 'new',
    }));
    const inserted = await Lead.insertMany(leadsToInsert);

    await List.findOneAndUpdate({ companyId, name: list }, { $inc: { leadsCount: inserted.length } });
    await logAudit(req.user._id, 'Imported leads', 'CRM', { list, count: inserted.length, companyId });

    res.status(201).json({ count: inserted.length, leads: inserted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update lead
exports.updateLead = async (req, res) => {
  try {
    const filter = await buildTenantFilterAsync(req, {});
    await applyListAccessFilter(req, filter);
    const lead = await Lead.findOneAndUpdate({ _id: req.params.id, ...filter }, req.body, { new: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    await logAudit(req.user._id, 'Updated lead', 'CRM', { leadId: lead._id, disposition: lead.disposition, companyId: lead.companyId });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete lead
exports.deleteLead = async (req, res) => {
  try {
    const filter = await buildTenantFilterAsync(req, {});
    await applyListAccessFilter(req, filter);
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...filter });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await List.findOneAndUpdate({ companyId: lead.companyId, name: lead.list }, { $inc: { leadsCount: -1 } });
    await logAudit(req.user._id, 'Deleted lead', 'CRM', { leadId: lead._id, list: lead.list, companyId: lead.companyId });

    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all lists
exports.getLists = async (req, res) => {
  try {
    const filter = await buildTenantFilterAsync(req, {});
    await applyListAccessFilter(req, filter);
    const lists = await List.find(filter).populate('createdBy', 'name email').populate('assignedTo', 'name email');
    res.json(lists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create list
exports.createList = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'List name required' });

    const companyId = requireCompanyId(req);
    const existing = await List.findOne({ companyId, name });
    if (existing) return res.status(409).json({ message: 'List already exists' });

    const list = new List({ companyId, name, description, createdBy: req.user._id });
    await list.save();
    await logAudit(req.user._id, 'Created list', 'CRM', { listId: list._id, name, companyId });
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update list
exports.updateList = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, description, assignedTo } = req.body;
    const list = await List.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { name, description, assignedTo },
      { new: true }
    ).populate('assignedTo', 'name email');
    if (!list) return res.status(404).json({ message: 'List not found' });
    await logAudit(req.user._id, 'Updated list', 'CRM', { listId: list._id, name: list.name, companyId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete list
exports.deleteList = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const list = await List.findOneAndDelete({ _id: req.params.id, companyId });
    if (!list) return res.status(404).json({ message: 'List not found' });

    await Lead.deleteMany({ companyId, list: list.name });

    const uploads = await Upload.find({ companyId, listName: list.name, status: { $ne: 'deleted' } });
    for (const upload of uploads) {
      if (upload.path) {
        try {
          fs.unlinkSync(upload.path);
        } catch (err) {
          console.warn('Could not delete uploaded file from disk:', err.message);
        }
      }
      upload.status = 'deleted';
      await upload.save();
    }
    await logAudit(req.user._id, 'Deleted list', 'CRM', { listId: list._id, name: list.name, companyId });

    res.json({ message: 'List and associated leads deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Rechurn list - reset all leads to 'new' disposition
exports.rechurnList = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const list = await List.findOne({ _id: req.params.id, companyId });
    if (!list) return res.status(404).json({ message: 'List not found' });

    await Lead.updateMany({ companyId, list: list.name }, { disposition: 'new', totalDuration: 0 });
    await logAudit(req.user._id, 'Rechurned list', 'CRM', { listId: list._id, name: list.name, companyId });
    res.json({ message: 'List rechurned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};