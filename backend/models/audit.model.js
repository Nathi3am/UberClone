const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  actorEmail: { type: String },
  action: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetType: { type: String },
  targetEmail: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Audit', auditSchema);
