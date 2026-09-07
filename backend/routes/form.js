const express = require('express');
const router = express.Router();
const controller = require('../controllers/formController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect);
router.use((req, res, next) => {
	const role = String(req.user?.role || '').toLowerCase();
	const permissions = req.user?.permissions || {};
	if (['master', 'superadmin', 'admin'].includes(role) || permissions.tools || permissions.marketing) return next();
	return res.status(403).json({ message: "You don't have access to forms" });
});
router.get('/', controller.get);
router.get('/web-form', controller.getWebForm);
router.put('/', controller.save);
router.put('/settings', controller.updateSettings);
router.put('/web-form', controller.saveWebForm);

module.exports = router;
