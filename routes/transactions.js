const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const WithdrawRequest = require('../models/WithdrawRequest');
const authenticate = require("../middleware/authenticate"); 
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey123';

// ✅ Middleware ตรวจสอบ Token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.userId = decoded.id;
        next();
    });
};

// ✅ Middleware ตรวจสอบสิทธิ์ Admin
const verifyAdmin = async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Unauthorized' });
    }
};

// ✅ ดึงข้อมูลยอดคงเหลือของผู้ใช้ (ใช้ API `/wallet/balance`)
router.get('/wallet/balance', verifyToken, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.userId });
        if (!wallet) return res.status(404).json({ message: 'ไม่พบกระเป๋าเงิน' });

        res.json({
            balance: wallet.balance,
            totalDeposits: wallet.totalDeposits,
            totalWithdrawals24h: wallet.totalWithdrawals24h,
            availableToWithdraw24h: wallet.availableToWithdraw24h
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงยอดคงเหลือ' });
    }
});

// ✅ API ดึงข้อมูลประวัติการฝาก-ถอนของผู้ใช้ (ฝาก + ถอน)
router.get("/user-history", authenticate, async (req, res) => {
    try {
        // ✅ ดึงข้อมูลจาก transactions (เฉพาะการฝากเงิน)
        const deposits = await Transaction.find({ userId: req.user.id, type: "deposit" }).sort({ createdAt: -1 });

        // ✅ ดึงข้อมูลจาก withdrawrequests (เฉพาะการถอนเงิน)
        const withdrawals = await WithdrawRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });

        // ✅ รวมข้อมูลทั้งสองประเภท
        const transactions = [
            ...deposits.map(d => ({
                type: "deposit",
                amount: d.amount,
                status: d.status,
                createdAt: d.createdAt
            })),
            ...withdrawals.map(w => ({
                type: "withdraw",
                amount: w.amount,
                status: w.status,
                createdAt: w.createdAt
            }))
        ];

        // ✅ เรียงข้อมูลจากใหม่ไปเก่า
        transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching user transactions:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลธุรกรรม" });
    }
});

// ✅ สร้างคำขอถอนเงิน (บันทึกลง `WithdrawRequest` แทน `Transaction`)
router.post('/withdraw', verifyToken, async (req, res) => {
    try {
        const { amount, walletAddress, network } = req.body;
        const userId = req.userId;

        // ✅ ตรวจสอบยอดคงเหลือ
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: 'ไม่พบกระเป๋าเงิน' });
        }

        if (wallet.balance < amount) {
            return res.status(400).json({ message: 'ยอดคงเหลือไม่เพียงพอ' });
        }

        // ✅ ลดยอดคงเหลือในกระเป๋า
        wallet.balance -= amount;
        wallet.totalWithdrawals24h += amount;
        wallet.availableToWithdraw24h = Math.max(wallet.totalDeposits - wallet.totalWithdrawals24h, 0);
        await wallet.save();

        // ✅ บันทึกข้อมูลการถอนลง `WithdrawRequest`
        const newWithdrawRequest = new WithdrawRequest({
            userId,
            amount,
            walletAddress,
            network,
            status: 'pending', // ✅ สถานะเริ่มต้นเป็น `pending`
            createdAt: new Date()
        });

        await newWithdrawRequest.save();
        res.json({ message: 'คำขอถอนเงินถูกสร้างเรียบร้อยแล้ว!', withdrawRequest: newWithdrawRequest });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างคำขอถอนเงิน' });
    }
});

module.exports = router;
