const Task = require('../models/Task');
const AuditEntry = require('../models/AuditEntry');
const User = require('../models/User');
const Company = require('../models/Company');
const notificationController = require('./notificationController');
const { buildTenantFilter } = require('../middleware/tenant');

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

async function resolveTaskCompanyId(req, payload = {}) {
  // 1. Explicit companyId in payload
  if (payload.companyId) return String(payload.companyId);

  // 2. CompanyId from assigned user
  const assignedToId = payload.assignedTo || req.body?.assignedTo;
  if (assignedToId) {
    const assignedUser = await User.findById(assignedToId).select('companyId').lean();
    if (assignedUser?.companyId) return String(assignedUser.companyId);
  }

  // 3. Fallback to creator's companyId
  if (req.user?.companyId) return String(req.user.companyId);
  
  return null;
}

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find(buildTenantFilter(req, {})).populate('assignedTo', 'name').populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const payload = req.body || {};
    const companyId = await resolveTaskCompanyId(req, payload);
    if (!companyId) return res.status(400).json({ message: 'Company context missing' });

    const task = await Task.create({
      ...payload,
      companyId,
      createdBy: req.user._id,
      assignedTo: payload.assignedTo || req.user._id,
    });
    const taskDoc = await Task.findById(task._id).populate('assignedTo', 'name email').populate('createdBy', 'name').lean();
    const assignedUserId = taskDoc.assignedTo?._id || taskDoc.assignedTo || taskDoc.assignedTo?.id;
    const company = await Company.findById(companyId).select('companyName').lean();
    if (assignedUserId && String(assignedUserId) !== String(req.user._id)) {
      await notificationController.createTaskAssignedNotification({
        companyId,
        recipientId: assignedUserId,
        actorId: req.user._id,
        task: taskDoc,
        companyName: company?.companyName || 'Company',
      });
    }
    await logAudit(req.user._id, 'Created task', 'Tasks', { taskId: task._id, companyId }, companyId);
    res.status(201).json(taskDoc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, ...buildTenantFilter(req, {}) }, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await logAudit(req.user._id, 'Updated task', 'Tasks', { taskId: task._id, companyId: task.companyId }, task.companyId);
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, ...buildTenantFilter(req, {}) });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await logAudit(req.user._id, 'Deleted task', 'Tasks', { taskId: task._id, companyId: task.companyId }, task.companyId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
