const express = require('express');
const router = express.Router();
const { protect, attachCompany } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { list, create, markPaid, getProfile, updateProfile } = require('../controllers/paymentController');

router.use(protect, attachCompany, requirePermission('payment'));
router.get('/', list);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/', create);
router.put('/:id/paid', markPaid);

module.exports = router;
