const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authenticate = require("../middleware/authenticate");
const KYC = require("../models/KYC");

// 📁 ตั้งค่า multer สำหรับจัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/kyc/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage: storage });

// ✅ POST /api/kyc
router.post("/", authenticate, upload.fields([
  { name: "idCardFront", maxCount: 1 },
  { name: "idCardBack", maxCount: 1 }
]), async (req, res) => {
  try {
    const { fullName, idCard } = req.body;

    if (!fullName || !idCard || !req.files["idCardFront"] || !req.files["idCardBack"]) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    const idCardFrontPath = req.files["idCardFront"][0].path;
    const idCardBackPath = req.files["idCardBack"][0].path;

    const kycData = new KYC({
      userId: req.user.id,
      fullName,
      idCard,
      idCardFront: idCardFrontPath,
      idCardBack: idCardBackPath,
      status: "pending", // เริ่มต้นรอตรวจสอบ
      submittedAt: new Date()
    });

    await kycData.save();

    res.json({ message: "ส่งเอกสารเรียบร้อยแล้ว รอตรวจสอบ", kycId: kycData._id });
  } catch (err) {
    console.error("❌ KYC submit error:", err);
    res.status(500).json({ message: "ไม่สามารถส่งเอกสารได้" });
  }
});

module.exports = router;
