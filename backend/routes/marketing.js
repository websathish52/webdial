const express = require('express');
const router = express.Router();
const { getCampaigns, createCampaign, updateCampaign, deleteCampaign } = require('../controllers/marketingController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

// Whole Marketing module gated behind the "marketing" sidebar permission
router.use(protect, requirePermission('marketing'));

router.get('/campaigns', getCampaigns);
router.post('/campaigns', createCampaign);
router.put('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);

module.exports = router;