const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, default: '' },
  type: { type: String, enum: ['short', 'multiple', 'checkbox', 'dropdown', 'date', 'time'], default: 'multiple' },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: false },
}, { _id: false });

const formSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true, index: true },
  title: { type: String, default: 'Untitled form', trim: true },
  description: { type: String, default: '' },
  questions: { type: [questionSchema], default: [] },
  requireByDefault: { type: Boolean, default: false },
  listAssigned: { type: String, default: '' },
  active: { type: Boolean, default: false },
  responses: { type: [{ id: String, submittedAt: String, summary: String }], default: [] },
  webForm: {
    listId: { type: String, default: '' },
    formTitle: { type: String, default: 'Untitled' },
    formSubTitle: { type: String, default: 'Subtitle' },
    fields: { type: [String], default: ['name'] },
    disclaimer: { type: String, default: '' },
    buttonText: { type: String, default: 'Submit' },
    formWidth: { type: String, default: '500' },
    redirectUrl: { type: String, default: '' },
    color: { type: String, default: '#3B82F6' },
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);
