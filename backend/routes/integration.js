const express = require('express');
const router = express.Router();
const { protect, attachCompany } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { list, upsert } = require('../controllers/integrationController');

router.use(protect, attachCompany, requirePermission('integration'));
router.get('/', list);
router.put('/:provider', upsert);

module.exports = router;
