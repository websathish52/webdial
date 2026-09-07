const express = require('express');
const router = express.Router();
const { getSupportTickets, createSupportTicket, updateSupportTicket, deleteSupportTicket, addSupportReply } = require('../controllers/supportController');
const { protect, attachCompany } = require('../middleware/auth');

router.use(protect, attachCompany);

router.get('/', getSupportTickets);
router.post('/', createSupportTicket);
router.put('/:id', updateSupportTicket);
router.delete('/:id', deleteSupportTicket);
router.post('/:id/reply', addSupportReply);

module.exports = router;
