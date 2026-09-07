const express = require('express');
const router = express.Router();
const { list, create, remove } = require('../controllers/whatsappBroadcastController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect, requirePermission('whatsapp'));
router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
