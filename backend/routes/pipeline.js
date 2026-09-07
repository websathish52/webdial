const express = require('express');
const router = express.Router();
const { getPipeline, createStage, deleteStage, moveDeal, addDeal } = require('../controllers/pipelineController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect, requirePermission('tools'));
router.get('/', getPipeline);
router.post('/stages', createStage);
router.delete('/stages/:id', deleteStage);
router.post('/deals/move', moveDeal);
router.post('/deals', addDeal);

module.exports = router;
