// models/Trade.js
const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  asset: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    enum: ["buy", "sell"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  timeframe: {
    type: Number, // minutes
    required: true,
  },
  entryPrice: Number,
  exitPrice: Number,
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
  },
  result: {
    type: String,
    enum: ["win", "lose", "draw"],
  },
  profit: Number,
  forceResult: {
    type: String, // ใช้ในระบบแอดมินบังคับ win/lose
    enum: ["win", "lose", "draw", null],
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expireAt: Date, // เวลาที่จะปิดออเดอร์อัตโนมัติ
});

module.exports = mongoose.model("Trade", tradeSchema);
