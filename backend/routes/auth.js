const express = require('express');
const router = express.Router();
const { login, register, me, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.post('/login', login);
// register user - superadmin or company admin
router.post('/register', protect, requireRole(['superadmin', 'admin']), register);
router.get('/me', protect, me);
router.put('/change-password', protect, changePassword);

module.exports = router;
