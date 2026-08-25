const express = require('express');
const router = express.Router();
const { protect, attachCompany } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { list, create, markPaid } = require('../controllers/paymentController');

router.use(protect, attachCompany, requirePermission('payment'));
router.get('/', list);
router.post('/', create);
router.put('/:id/paid', markPaid);

module.exports = router;
