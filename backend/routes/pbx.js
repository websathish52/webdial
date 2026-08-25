const express = require('express');
const router = express.Router();
const { protect, attachCompany } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { get, update } = require('../controllers/pbxController');

router.use(protect, attachCompany, requirePermission('pbx'));
router.get('/', get);
router.put('/', update);

module.exports = router;
