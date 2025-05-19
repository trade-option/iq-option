const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  asset: String,
  direction: String,
  time: Number,
  amount: Number,
  payoutRate: Number,
  status: { type: String, default: 'open' }, // open | win | lose
  createdAt: Date,
  expiresAt: Date
});

module.exports = mongoose.model('Order', orderSchema);
