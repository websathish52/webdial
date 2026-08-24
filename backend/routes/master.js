const express = require('express');
const router = express.Router();
const {
  getSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  deleteSuperAdmin,
} = require('../controllers/masterController');

const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// 🔒 Only the master account can hit these routes
router.use(protect, requireRole('master'));

router.get('/superadmins', getSuperAdmins);
router.post('/superadmins', createSuperAdmin);
router.put('/superadmins/:id', updateSuperAdmin);
router.delete('/superadmins/:id', deleteSuperAdmin);

module.exports = router;