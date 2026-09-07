const express = require('express');
const router = express.Router();
const controller = require('../controllers/voiceBroadcastController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect, requirePermission('marketing'));
router.get('/lists', controller.getLists);
router.get('/status', controller.getStatus);
router.get('/campaigns', controller.list);
router.post('/campaigns', controller.create);

module.exports = router;
