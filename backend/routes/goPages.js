const express = require('express');
const router = express.Router();
const controller = require('../controllers/goPageController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect, requirePermission('marketing'));
router.get('/', controller.list);
router.post('/analyze', controller.analyze);
router.post('/', controller.create);
router.delete('/:id', controller.remove);

module.exports = router;
