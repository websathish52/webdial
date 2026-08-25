const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const { uploadFile, getUploads, deleteUpload } = require('../controllers/uploadController');

const uploadsDir = process.env.VERCEL
  ? path.join('/tmp', 'webdial-uploads')
  : path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get('/', protect, getUploads);
router.post('/', protect, upload.single('file'), (req, res, next) => {
  Promise.resolve(uploadFile(req, res, next)).catch(next);
});
router.delete('/:id', protect, deleteUpload);

router.use((err, req, res, next) => {
  console.error('Upload request failed:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: err.message || 'Upload failed' });
});

module.exports = router;
