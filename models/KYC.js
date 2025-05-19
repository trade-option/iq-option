const mongoose = require('mongoose');

const KYCSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true },
    idCard: { type: String, required: true, unique: true },
    idCardFront: { type: String, required: true },
    idCardBack: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KYC', KYCSchema);
