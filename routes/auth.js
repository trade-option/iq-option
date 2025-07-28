// routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const verifyToken = require("../middleware/authenticate");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// ✅ สมัครสมาชิกใหม่
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ รายชื่อสินทรัพย์ที่รองรับ
    const defaultAssets = [
        "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "DOTUSDT",
        "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT",
        "AAPL", "TSLA", "AMZN", "NVDA",
       "XAUUSD", "SILVUSD", "PLATINUM", "COPPER",
      "USDJPY", "EURUSD", "AUDUSD", "GBPUSD", "NZDUSD", "USDCHF"
];

    // ✅ ตั้งค่า winSettings ของแต่ละสินทรัพย์ให้เป็น "random"
    const defaultWinSettings = {};
    defaultAssets.forEach(asset => {
        defaultWinSettings[asset] = "lose";
    });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้ไปแล้ว กรุณาใช้อีเมลอื่น' });
        }

        const user = new User({
            email,
            password: hashedPassword,
            winSettings: defaultWinSettings
        });

        const savedUser = await user.save();

        const wallet = new Wallet({
            userId: savedUser._id,
            balance: 0,
            totalDeposits: 0,
            totalWithdrawals24h: 0,
            availableToWithdraw24h: 0
        });
        await wallet.save();

        const initialTransaction = new Transaction({
            userId: savedUser._id,
            type: 'deposit',
            amount: 0,
            status: 'success',
            address: "N/A",
            network: "N/A",
            createdAt: new Date()
        });
        await initialTransaction.save();

        // ✅ ส่ง token กลับไป
        const token = jwt.sign({ id: savedUser._id, isAdmin: false }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!", token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
    }
});

// ✅ เข้าสู่ระบบ
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'ไม่พบผู้ใช้นี้' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
});

// ✅ ดึงข้อมูลโปรไฟล์
router.get('/profile', verifyToken, async (req, res) => {
        res.json({ email: req.user.email });
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });

        const wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) return res.status(404).json({ message: 'ไม่พบข้อมูลกระเป๋าเงิน' });

        res.json({
            email: user.email,
            uid: user.uid,
            balance: wallet.balance,
            totalDeposits: wallet.totalDeposits,
            totalWithdrawals24h: wallet.totalWithdrawals24h,
            availableToWithdraw24h: wallet.availableToWithdraw24h,
            status: 'Verified',
            message: 'ดึงข้อมูลโปรไฟล์สำเร็จ'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
    }
});

// ✅ ดึงข้อมูลกระเป๋าเงิน
router.get('/wallet/info', verifyToken, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.userId });
        if (!wallet) return res.status(404).json({ message: 'ไม่พบข้อมูลกระเป๋าเงิน' });

        res.json({
            balance: wallet.balance,
            totalDeposits: wallet.totalDeposits,
            totalWithdrawals24h: wallet.totalWithdrawals24h,
            availableToWithdraw24h: wallet.availableToWithdraw24h
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกระเป๋าเงิน' });
    }
});

// ✅ อัปเดตยอดเงินกระเป๋า
router.put('/wallet/update', verifyToken, async (req, res) => {
    try {
        const { balance, totalDeposits, totalWithdrawals24h, availableToWithdraw24h } = req.body;
        const wallet = await Wallet.findOne({ userId: req.userId });

        if (!wallet) return res.status(404).json({ message: 'ไม่พบข้อมูลกระเป๋าเงิน' });

        if (balance !== undefined) wallet.balance = balance;
        if (totalDeposits !== undefined) wallet.totalDeposits = totalDeposits;
        if (totalWithdrawals24h !== undefined) wallet.totalWithdrawals24h = totalWithdrawals24h;
        if (availableToWithdraw24h !== undefined) wallet.availableToWithdraw24h = availableToWithdraw24h;

        await wallet.save();
        res.json({ message: 'อัปเดตข้อมูลกระเป๋าเงินสำเร็จ!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตกระเป๋าเงิน' });
    }
});

// ✅ ประวัติเทรด
router.get('/trades/history', verifyToken, async (req, res) => {
    try {
        const trades = await Trade.find({ userId: req.userId });
        if (!trades || trades.length === 0) {
            return res.status(404).json({ message: 'ไม่พบประวัติการเทรด' });
        }

        res.json({ trades });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเทรด' });
    }
});

module.exports = router;
