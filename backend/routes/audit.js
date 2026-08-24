const express = require('express');
const router = express.Router();
const { getAudit } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAudit);

module.exports = router;
