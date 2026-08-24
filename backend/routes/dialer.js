const express = require('express');
const router = express.Router();
const { logCall, getCallLogs, getDashboardStats, getRecordings } = require('../controllers/dialerController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect);

// Call logs -- gated by "callLogAccess" flag (viewing), everyone can still log a call they made
router.post('/call-logs', logCall);
router.get('/call-logs', requirePermission('reports'), getCallLogs);

// Dashboard stats
router.get('/stats', getDashboardStats);

// Recordings -- gated by the "recording" sidebar permission
router.get('/recordings', requirePermission('recording'), getRecordings);

module.exports = router;