const express = require('express');
const router = express.Router();
const { getReport } = require('../controllers/whatsappReportController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect, requirePermission('whatsapp'));
router.get('/', getReport);

module.exports = router;
