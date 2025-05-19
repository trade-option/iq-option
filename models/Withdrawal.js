const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    transactionHash: { type: String, default: null }, // ถ้ามีธุรกรรม blockchain จะเก็บ TXID
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
