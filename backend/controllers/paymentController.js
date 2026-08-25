const Payment = require('../models/Payment');
const { requireCompanyId } = require('../middleware/tenant');

const cycleMonths = { monthly: 1, halfyearly: 6, yearly: 12 };

exports.list = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const payments = await Payment.find({ companyId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(payments);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { plan, pricePerUser, users, cycle = 'monthly', profile = {} } = req.body;
    const numericPrice = Number(pricePerUser);
    const numericUsers = Number(users);
    if (!plan || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericUsers) || numericUsers < 1) {
      return res.status(400).json({ message: 'Plan, price per user, and user count are required' });
    }
    const amount = numericPrice * numericUsers * (cycleMonths[cycle] || 1);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (cycleMonths[cycle] || 1));
    const payment = await Payment.create({ companyId, plan, pricePerUser: numericPrice, users: numericUsers, cycle, amount, profile, status: 'Pending', expiry });
    res.status(201).json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markPaid = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const payment = await Payment.findOneAndUpdate({ _id: req.params.id, companyId }, { status: 'Paid', paidAt: new Date() }, { new: true });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
