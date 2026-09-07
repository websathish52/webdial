const Form = require('../models/Form');
const { requireCompanyId } = require('../middleware/tenant');

const defaultForm = (companyId) => ({ companyId, title: 'Untitled form', description: '', questions: [], requireByDefault: false, listAssigned: '', active: false, responses: [] });

exports.get = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const form = await Form.findOne({ companyId }).lean();
    res.json(form || defaultForm(companyId));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.save = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { title, description, questions } = req.body;
    const form = await Form.findOneAndUpdate(
      { companyId },
      { $set: { title: String(title || 'Untitled form').trim(), description: String(description || ''), questions: Array.isArray(questions) ? questions : [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.json(form);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const patch = {};
    if (typeof req.body.requireByDefault === 'boolean') patch.requireByDefault = req.body.requireByDefault;
    if (typeof req.body.listAssigned === 'string') patch.listAssigned = req.body.listAssigned;
    if (typeof req.body.active === 'boolean') patch.active = req.body.active;
    const form = await Form.findOneAndUpdate({ companyId }, { $set: patch }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    res.json(form);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getWebForm = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const form = await Form.findOne({ companyId }).select('webForm').lean();
    res.json(form?.webForm || {});
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.saveWebForm = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const allowed = ['listId', 'formTitle', 'formSubTitle', 'fields', 'disclaimer', 'buttonText', 'formWidth', 'redirectUrl', 'color', 'theme'];
    const webForm = {};
    for (const key of allowed) if (req.body[key] !== undefined) webForm[key] = req.body[key];
    const form = await Form.findOneAndUpdate({ companyId }, { $set: Object.fromEntries(Object.entries(webForm).map(([key, value]) => [`webForm.${key}`, value])) }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    res.json(form.webForm);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
