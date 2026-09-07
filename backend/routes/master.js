const express = require('express');
const router = express.Router();
const {
  getSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  deleteSuperAdmin,
  getCustomerDashboard,
  createCustomer,
  updateCustomerStatus,
  updateCustomerAccount,
  deleteCustomerAccount,
  getPortalAccess,
  getModuleAccess,
  updateModuleAccess,
} = require('../controllers/masterController');

const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// 🔒 Only the master account can hit these routes
router.use(protect, requireRole('master'));

router.get('/superadmins', getSuperAdmins);
router.post('/superadmins', createSuperAdmin);
router.put('/superadmins/:id', updateSuperAdmin);
router.delete('/superadmins/:id', deleteSuperAdmin);
router.get('/customers', getCustomerDashboard);
router.get('/portal-access', getPortalAccess);
router.get('/module-access/:companyId', getModuleAccess);
router.put('/module-access/:companyId', updateModuleAccess);
router.post('/customers', createCustomer);
router.put('/customers/:companyId/status', updateCustomerStatus);
router.put('/customers/:companyId', updateCustomerAccount);
router.delete('/customers/:companyId', deleteCustomerAccount);

module.exports = router;