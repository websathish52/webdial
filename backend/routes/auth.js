const express = require('express');
const router = express.Router();
const { login, register, me, changePassword, startTrial, completeOnboarding } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Auth API is running',
    endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/change-password'],
  });
});

router.post('/', login);
router.post('/login', login);
router.post('/trial', startTrial);
// register user - superadmin or company admin
router.post('/register', protect, requireRole(['superadmin', 'admin']), register);
router.get('/me', protect, me);
router.put('/onboarding-complete', protect, completeOnboarding);
router.put('/change-password', protect, changePassword);

module.exports = router;
