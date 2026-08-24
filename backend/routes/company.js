const express = require('express');
const router = express.Router();
const { getCompanies, createCompany, getCompany, getCompanyAccount, changeCompanyAccountPassword, updateCompany, deleteCompany } = require('../controllers/companyController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getCompanies);
router.post('/', protect, createCompany);
router.get('/:id', protect, getCompany);
router.get('/:id/account', protect, getCompanyAccount);
router.put('/:id/account-password', protect, changeCompanyAccountPassword);
router.put('/:id', protect, updateCompany);
router.delete('/:id', protect, deleteCompany);

module.exports = router;
