const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number, default: 0 },
    path: { type: String, required: true },
    publicUrl: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    listName: { type: String },
    importedCount: { type: Number, default: 0 },
    status: { type: String, enum: ['uploaded', 'imported', 'deleted'], default: 'uploaded' },
    importedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Upload', uploadSchema);
