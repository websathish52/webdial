const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/tasksController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(protect, requirePermission('tools'));
router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
