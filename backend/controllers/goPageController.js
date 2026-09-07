const GoPage = require('../models/GoPage');
const List = require('../models/List');
const { requireCompanyId } = require('../middleware/tenant');

function slugify(value) {
  return String(value || 'untitled').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

exports.list = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const pages = await GoPage.find({ companyId }).sort({ createdAt: -1 }).lean();
    res.json(pages.map((page) => ({ ...page, id: String(page._id), slug: `https://land.webdial.in/${page.slug}`, createdAt: page.createdAt?.toISOString() || '' })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.analyze = async (req, res) => {
  const { name, websiteUrl, offeringType } = req.body || {};
  if (!String(name || '').trim()) return res.status(400).json({ message: 'Product or business name is required' });
  res.json({ name: String(name).trim(), websiteUrl: String(websiteUrl || ''), offeringType: offeringType === 'service' ? 'service' : 'product', summary: `A conversion-focused page for ${String(name).trim()}. Add your description and key benefits to generate the final page.` });
};

exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const data = req.body || {};
    if (!String(data.name || '').trim() || !String(data.godialList || '').trim()) return res.status(400).json({ message: 'Name and GoDial list are required' });
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let suffix = 2;
    while (await GoPage.exists({ slug })) slug = `${baseSlug}-${suffix++}`;
    const page = await GoPage.create({ companyId, title: String(data.name).trim(), slug, websiteUrl: data.websiteUrl || '', offeringType: data.offeringType || 'product', description: data.description || '', usp: data.usp || '', features: data.features || '', faqs: Array.isArray(data.faqs) ? data.faqs : [], layout: data.layout || 'split-focus', colorTheme: data.colorTheme || 'corporate', godialList: data.godialList, createdBy: req.user._id });
    res.status(201).json({ ...page.toObject(), id: String(page._id), slug: `https://land.webdial.in/${page.slug}`, createdAt: page.createdAt.toISOString() });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const deleted = await GoPage.findOneAndDelete({ _id: req.params.id, companyId });
    if (!deleted) return res.status(404).json({ message: 'Go Page not found' });
    res.json({ message: 'Go Page deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
