const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.get('/', protect, requirePermission('reports'), getLeaderboard);

module.exports = router;
