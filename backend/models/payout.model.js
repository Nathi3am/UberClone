const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'captain',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    default: 'EFT'
  }
});

module.exports = mongoose.model('Payout', payoutSchema);
