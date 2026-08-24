const PipelineStage = require('../models/PipelineStage');
const PipelineDeal = require('../models/PipelineDeal');
const { buildTenantFilter, requireCompanyId, resolveCompanyId } = require('../middleware/tenant');
const AuditEntry = require('../models/AuditEntry');
const Lead = require('../models/Lead');

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

async function ensureDefaultStages(req, createdBy, isAdmin) {
  // Global default stages for all users
  const defaultStages = [
    { name: 'New', color: '#4285F4' },
    { name: 'In progress', color: '#f59e0b' },
    { name: 'Won', color: '#10b981' },
    { name: 'Lost', color: '#ef4444' },
  ];

  const companyId = resolveCompanyId(req);
  const existingStages = companyId
    ? await PipelineStage.find({ companyId }).sort({ createdAt: 1 })
    : await PipelineStage.find({}).sort({ createdAt: 1 });

  if (existingStages.length > 0) {
    return existingStages;
  }

  if (!companyId) {
    return defaultStages.map((stage) => ({
      ...stage,
      _id: `default-${stage.name.toLowerCase().replace(/\s+/g, '-')}`,
      createdBy,
    }));
  }

  const createdStages = [];
  const existingNames = new Set(existingStages.map(stage => stage.name.toLowerCase()));

  for (const stage of defaultStages) {
    if (!existingNames.has(stage.name.toLowerCase())) {
      const created = await PipelineStage.create({
        ...stage,
        companyId,
        createdBy,
      });
      createdStages.push(created);
      existingStages.push(created);
    }
  }

  return existingStages;
}

exports.getPipeline = async (req, res) => {
  try {
    const isAdmin = ['superadmin', 'admin'].includes(String(req.user?.role || '').toLowerCase());
    
    const stages = await ensureDefaultStages(req, req.user._id, isAdmin);
    const dealFilter = buildTenantFilter(req, {});
    
    const deals = await PipelineDeal.find(dealFilter)
      .populate('leadId', 'name phone disposition list assignedTo')
      .sort({ createdAt: -1 });

    res.json({
      stages,
      deals
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
exports.createStage = async (req, res) => {
  try {
    const stageName = String(req.body?.name || '').trim();

    if (!stageName) {
      return res.status(400).json({
        message: 'Stage name required'
      });
    }

    const companyId = req.body?.companyId || resolveCompanyId(req) || req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ message: 'Company context missing. Please select a company or log in as a user with a valid company.' });
    }

    const existing = await PipelineStage.findOne({
      companyId,
      name: { $regex: `^${stageName}$`, $options: 'i' }
    });

    if (existing) {
      return res.status(409).json({
        message: 'Stage already exists'
      });
    }

    const stage = await PipelineStage.create({
      name: stageName,
      color: req.body?.color || '#6b7280',
      companyId,
      createdBy: req.user._id
    });

    await logAudit(
      req.user._id,
      'Created pipeline stage',
      'Pipeline',
      { stageId: stage._id, companyId },
      companyId
    );

    res.status(201).json(stage);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.deleteStage = async (req, res) => {
  try {
    const stage = await PipelineStage.findById(req.params.id);

    if (!stage) {
      return res.status(404).json({
        message: 'Stage not found'
      });
    }

    const isOwnStage = String(stage.createdBy) === String(req.user._id);
    if (!isOwnStage) {
      return res.status(403).json({
        message: 'You can only delete your own stages.'
      });
    }

    await PipelineStage.findByIdAndDelete(req.params.id);

    await PipelineDeal.deleteMany({
      stageId: req.params.id
    });

    await logAudit(
      req.user._id,
      'Deleted pipeline stage',
      'Pipeline',
      {
        stageId: req.params.id,
        name: stage.name
      }
    );

    res.json({
      message: 'Stage deleted'
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.moveDeal = async (req, res) => {
  try {
    const { dealId, stageId } = req.body;

    const deal = await PipelineDeal.findById(dealId);

    if (!deal) {
      return res.status(404).json({
        message: 'Deal not found'
      });
    }
    if (String(deal.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to move this deal.' });
    }
    const stage = await PipelineStage.findById(stageId);

    if (!stage) {
      return res.status(404).json({
        message: 'Stage not found'
      });
    }

    deal.stageId = stageId;

    await deal.save();

    await logAudit(
      req.user._id,
      'Moved deal',
      'Pipeline',
      { dealId, stageId }
    );

    res.json(deal);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.addDeal = async (req, res) => {
  try {
    const { leadId, stageId, list, value } = req.body;

    if (!leadId) {
      return res.status(400).json({
        message: 'Lead is required'
      });
    }

    const existing = await PipelineDeal.findOne({ leadId, createdBy: req.user._id });

    if (existing) {
      return res.json(existing);
    }

    if (stageId) {
      const stage = await PipelineStage.findById(stageId);
      if (!stage) {
        return res.status(404).json({
          message: 'Stage not found'
        });
      }
    }

    const stages = await ensureDefaultStages(req, req.user._id, ['superadmin', 'admin'].includes(String(req.user?.role || '').toLowerCase()));

    const resolvedStageId =
      stageId ||
      stages.find(
        stage =>
          stage.name.toLowerCase() === 'new'
      )?._id ||
      stages[0]?._id;

    const lead = await Lead.findById(leadId);

    if (!lead) {
      return res.status(404).json({
        message: 'Lead not found'
      });
    }

    if (lead.assignedTo && String(lead.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Lead is not assigned to you'
      });
    }

    const deal = await PipelineDeal.create({
      leadId,
      stageId: resolvedStageId,
      companyId: lead.companyId,
      list: list || lead?.list || 'Unassigned',
      value,
      createdBy: req.user._id
    });

    await logAudit(
      req.user._id,
      'Added pipeline deal',
      'Pipeline',
      {
        dealId: deal._id,
        leadId
      }
    );

    res.status(201).json(deal);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
