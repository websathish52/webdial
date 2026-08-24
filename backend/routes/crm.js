const express = require('express');
const router = express.Router();
const { getLeads, getLead, createLead, importLeads, updateLead, deleteLead, getLists, createList, updateList, deleteList, rechurnList } = require('../controllers/crmController');
const { protect } = require('../middleware/auth');
const { requirePermission, blockIfFlag } = require('../middleware/permission');

// Whole CRM module gated behind the "crm" sidebar permission
router.use(protect, requirePermission('crm'));

// Leads routes
router.get('/leads', getLeads);
router.get('/leads/:id', getLead);
router.post('/leads', createLead);
router.post('/leads/import', importLeads);
router.put('/leads/:id', updateLead);
router.delete('/leads/:id', blockIfFlag('disableContactDelete'), deleteLead);

// Lists routes
router.get('/lists', getLists);
router.post('/lists', createList);
router.put('/lists/:id', updateList);
router.delete('/lists/:id', blockIfFlag('deleteList'), deleteList);
router.post('/lists/:id/rechurn', rechurnList);

module.exports = router;