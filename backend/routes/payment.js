const express = require('express');
const router = express.Router();
const { protect, attachCompany } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { list, create, markProcessing, markPaid, rejectPayment, getProfile, updateProfile, getSubscription } = require('../controllers/paymentController');

router.use(protect, attachCompany, requirePermission('payment'));
router.get('/', list);
router.get('/profile', getProfile);
router.get('/subscription', getSubscription);
router.put('/profile', updateProfile);
router.post('/', create);
router.delete('/', async (req, res) => {
  const { ids = [] } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No payment IDs provided' });
  const Payment = require('../models/Payment');
  const { isMaster } = require('../middleware/tenant');
  try {
    const deleteQuery = { _id: { $in: ids } };
    if (!isMaster(req)) {
      const companyId = require('../middleware/tenant').requireCompanyId(req);
      deleteQuery.companyId = companyId;
    }
    const result = await Payment.deleteMany(deleteQuery);
    return res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});
router.delete('/:id', async (req, res) => {
  const Payment = require('../models/Payment');
  const { isMaster } = require('../middleware/tenant');
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (!isMaster(req)) {
      const companyId = require('../middleware/tenant').requireCompanyId(req);
      if (String(payment.companyId) !== String(companyId)) return res.status(403).json({ message: 'Forbidden' });
    }
    await Payment.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});
router.put('/:id/processing', markProcessing);
router.put('/:id/paid', markPaid);
router.put('/:id/reject', rejectPayment);

module.exports = router;
