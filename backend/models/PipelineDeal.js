const mongoose = require('mongoose');

const pipelineDealSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineStage', required: true },
    list: { type: String, required: true },
    value: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PipelineDeal', pipelineDealSchema);
