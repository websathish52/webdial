const express = require('express');
const router = express.Router();
const { getMembers, getMember, updateMember, updateMemberPassword, deleteMember, getSettings, updateSettings } = require('../controllers/memberController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Get all members (authenticated users can read the team list)
router.get('/', protect, getMembers);

// Get single member
router.get('/:id', protect, getMember);

// Update member info (superadmin only)
router.put('/:id', protect, requireRole('superadmin'), updateMember);

// Update member password (superadmin only)
router.put('/:id/password', protect, requireRole('superadmin'), updateMemberPassword);

// Delete member (superadmin only)
router.delete('/:id', protect, requireRole('superadmin'), deleteMember);

// Settings routes
router.get('/settings/me', protect, getSettings);
router.put('/settings/me', protect, updateSettings);

module.exports = router;
