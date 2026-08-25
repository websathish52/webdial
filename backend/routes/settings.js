const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, attachCompany } = require('../middleware/auth');
const multer = require('multer');

// Multer setup with error handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
};

// All settings routes are protected and require a resolved company context
router.use(protect);
router.use(attachCompany);

// General Company Info
router.get('/company-info', settingsController.getCompanyInfo);
router.put('/company-info', settingsController.updateCompanyInfo);
router.post('/company-logo', handleUpload('logo'), settingsController.uploadCompanyLogo);
router.delete('/company-logo', settingsController.removeCompanyLogo);

// KYC Details
router.get('/kyc', settingsController.getKYCDetails);
router.put('/kyc', settingsController.updateKYCDetails);
router.post('/kyc/id-doc', handleUpload('idDoc'), settingsController.uploadKYCDocument);
router.post('/kyc/reg-doc', handleUpload('regDoc'), settingsController.uploadKYCDocument);
// Remove a single KYC document without touching the other one.
router.delete('/kyc/:field', settingsController.removeKYCDocument);

// Unique Contacts
router.get('/unique-contacts', settingsController.getUniqueContactsSetting);
router.put('/unique-contacts', settingsController.updateUniqueContactsSetting);

// Default Dialer
router.get('/dialer', settingsController.getDialerSettings);
router.put('/dialer', settingsController.updateDialerSettings);

// Custom Statuses
router.get('/custom-statuses', settingsController.getCustomStatuses);
router.post('/custom-statuses', settingsController.createCustomStatus);
router.put('/custom-statuses/:key', settingsController.updateCustomStatus);
router.delete('/custom-statuses/:key', settingsController.deleteCustomStatus);

// Message Templates
router.get('/message-templates', settingsController.getMessageTemplates);
router.post('/message-templates', settingsController.createMessageTemplate);
router.post('/message-templates/attachment', handleUpload('file'), settingsController.uploadMessageTemplateAttachment);
router.put('/message-templates/:id', settingsController.updateMessageTemplate);
router.delete('/message-templates/:id', settingsController.deleteMessageTemplate);

// Storage
router.get('/storage', settingsController.getStorageUsage);

module.exports = router;