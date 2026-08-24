const express = require('express');
const router = express.Router();
const { listNotifications, markNotificationRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, listNotifications);
router.put('/:id/read', protect, markNotificationRead);

module.exports = router;
