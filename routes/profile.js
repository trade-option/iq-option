const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const KYC = require("../models/KYC");
require("dotenv").config();

// Middleware ตรวจสอบ Token
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "❌ กรุณาเข้าสู่ระบบ" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "❌ Token ไม่ถูกต้อง" });
        req.user = decoded;
        next();
    });
};

// ✅ ดึงข้อมูลโปรไฟล์
router.get("/", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "❌ ไม่พบผู้ใช้" });

        const kyc = await KYC.findOne({ userId: req.user.id });

        res.json({
            uid: user.uid,
            email: user.email,
            kycStatus: kyc ? kyc.status : "not_verified"
        });
    } catch (err) {
        console.error("❌ Profile Error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
    }
});

module.exports = router;
