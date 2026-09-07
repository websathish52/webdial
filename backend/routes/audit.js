const express = require('express');
const router = express.Router();
const { getAudit } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.get('/', protect, requirePermission('reports'), getAudit);

module.exports = router;
