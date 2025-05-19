const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    type: { type: String, enum: ["deposit", "withdraw"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], required: true }, // ✅ แก้ให้ตรงกับ Enum
    address: { type: String, required: true },
    network: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
