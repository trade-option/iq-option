const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const Trade = require("../models/Trade");

// ✅ ดึงออเดอร์ที่เปิดอยู่
router.get("/active", authenticate, async (req, res) => {
  try {
    const orders = await Trade.find({ userId: req.user._id, status: "open" });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดออเดอร์เปิดอยู่" });
  }
});

// ✅ ดึงออเดอร์ที่ปิดแล้ว
router.get("/closed", authenticate, async (req, res) => {
  try {
    const orders = await Trade.find({ userId: req.user._id, status: "closed" });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดออเดอร์ที่ปิดแล้ว" });
  }
});

module.exports = router;
