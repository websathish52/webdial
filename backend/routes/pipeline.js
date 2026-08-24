const express = require('express');
const router = express.Router();
const { getPipeline, createStage, deleteStage, moveDeal, addDeal } = require('../controllers/pipelineController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPipeline);
router.post('/stages', protect, createStage);
router.delete('/stages/:id', protect, deleteStage);
router.post('/deals/move', protect, moveDeal);
router.post('/deals', protect, addDeal);

module.exports = router;
