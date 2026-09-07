const Product = require('../models/Product');
const { requireCompanyId } = require('../middleware/tenant');

exports.list = async (req, res) => {
  try { res.json(await Product.find({ companyId: requireCompanyId(req) }).sort({ createdAt: -1 }).lean()); }
  catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { name, description = '', sku = '', price = 0, color = '#2563EB' } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Product name is required' });
    const product = await Product.create({ companyId, name: String(name).trim(), description, sku, price: Number(price) || 0, color, createdBy: req.user._id });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, companyId: requireCompanyId(req) });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
