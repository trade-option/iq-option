const mongoose = require('mongoose');

const winSettingsSchema = {};
[
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "DOTUSDT",
  "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT",
  "AAPL", "TSLA", "AMZN", "NVDA",
  "XAUUSD", "SILVUSD", "PLATINUM", "COPPER",
  "USDJPY", "EURUSD", "AUDUSD", "GBPUSD", "NZDUSD", "USDCHF"
].forEach((id) => {
  winSettingsSchema[id] = { type: String, enum: ["win", "lose", null], default: null };
});

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  balance: { type: Number, default: 0 },
  totalDeposits: { type: Number, default: 0 },
  totalWithdrawals24h: { type: Number, default: 0 },
  availableToWithdraw24h: { type: Number, default: 0 },

  // ✅ ระบบกำหนดแพ้/ชนะรายสินทรัพย์
  winSettings: winSettingsSchema,

  createdAt: { type: Date, default: Date.now }
});

// ✅ เมธอดอัปเดตข้อมูลกระเป๋า
walletSchema.methods.updateWallet = async function (updateData) {
  Object.assign(this, updateData);
  return this.save();
};

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
