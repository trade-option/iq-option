const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");

// ✅ ดึงรายชื่อผู้ใช้ทั้งหมด พร้อม winSettings
router.get("/users", authenticate, async (req, res) => {
  try {
    const users = await User.find({}, "_id email winSettings");
    res.json(users);
  } catch (err) {
    console.error("❌ ไม่สามารถดึงรายชื่อผู้ใช้:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงผู้ใช้" });
  }
});

// ✅ อัปเดต winSettings เฉพาะผู้ใช้
router.post("/set-win", authenticate,  async (req, res) => {
  const { uid, winSettings } = req.body;

  if (!uid || !winSettings) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
  }

  try {
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    user.winSettings = winSettings;
    await user.save();

    res.json({ message: "✅ บันทึกการตั้งค่าแพ้/ชนะเรียบร้อย" });
  } catch (err) {
    console.error("❌ อัปเดต winSettings ล้มเหลว:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึก" });
  }
});

module.exports = router;
