const express = require("express");
const router = express.Router();
const WithdrawRequest = require("../models/WithdrawRequest");
const Wallet = require("../models/Wallet");
const authenticate = require("../middleware/authenticate");

// ✅ POST: ส่งคำขอถอนเงิน
router.post("/request", authenticate, async (req, res) => {
  try {
    const { walletAddress, network, amount } = req.body;
    const userId = req.user.id;

    if (!walletAddress || !network || !amount || amount <= 0) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: "ยอดเงินไม่เพียงพอ" });
    }

    wallet.balance -= amount;
    await wallet.save();

    const withdraw = await WithdrawRequest.create({
      userId,
      walletAddress,
      network,
      amount,
      status: "pending",
    });
    // ✅ ส่ง event เพื่ออัปเดตข้อมูลรายการถอนแบบเรียลไทม์
    req.io.emit("refreshWithdraws");
    // ✅ ส่ง event เพื่ออัปเดตยอดเงินแบบเรียลไทม์
    req.io.emit("orderUpdated");
    return res.json({ message: "✅ คำขอถอนถูกส่งแล้ว", withdraw });
  } catch (err) {
    console.error("❌ Error sending withdraw request:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งคำขอถอน" });
  }
});

// ✅ 2. API ดึงยอดคงเหลือของผู้ใช้
router.get("/balance", authenticate, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user.id });

        if (!wallet) {
            return res.status(404).json({ message: "ไม่พบข้อมูลกระเป๋าเงิน" });
        }

        res.json({ balance: wallet.balance });
    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดยอดคงเหลือ" });
    }
});

// ✅ 3. API ดึงข้อมูลรายการถอนเงินของผู้ใช้
router.get("/user-requests", authenticate, async (req, res) => {
    try {
        const userRequests = await WithdrawRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });

        if (!userRequests.length) {
            return res.status(404).json({ message: "ไม่พบประวัติการถอนเงิน" });
        }

        res.json(userRequests);
    } catch (error) {
        console.error("Error fetching user's withdrawal requests:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประวัติการถอนเงิน" });
    }
});

// ✅ 4. API ดึงข้อมูลรายการถอนเงินทั้งหมด (เฉพาะ Admin)
router.get("/requests", async (req, res) => {
    try {
        const requests = await WithdrawRequest.find()
            .populate("userId", "email")
            .sort({ createdAt: -1 })
            .lean();

        requests.forEach(req => {
            req.createdAt = moment(req.createdAt).tz("Asia/Bangkok").format("DD-MM-YYYY HH:mm:ss");
        });

        res.json(requests);
    } catch (error) {
        console.error("Error fetching withdrawal requests:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดรายการถอนเงิน" });
    }
});

// ✅ 5. API อนุมัติคำขอถอนเงิน (Admin ใช้)
router.post("/approve/:id", async (req, res) => {
    try {
        const request = await WithdrawRequest.findById(req.params.id);
        if (!request || request.status !== "pending") {
            return res.status(400).json({ message: "คำขอถอนเงินไม่ถูกต้อง" });
        }

        request.status = "succeed";
        request.updatedAt = moment().tz("Asia/Bangkok").format("DD-MM-YYYY HH:mm:ss");
        await request.save();
        // ✅ ส่ง event เพื่ออัปเดตข้อมูลรายการถอนแบบเรียลไทม์
        req.io.emit("refreshWithdraws");
        res.json({ message: "✅ อนุมัติคำขอถอนเงินเรียบร้อย!", request });
    } catch (error) {
        console.error("Error approving withdrawal:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอนุมัติคำขอถอนเงิน" });
    }
});

// ✅ 6. API ปฏิเสธคำขอถอนเงิน (Admin ใช้)
router.post("/reject/:id",  async (req, res) => {
    try {
        const request = await WithdrawRequest.findById(req.params.id);
        if (!request || request.status !== "pending") {
            return res.status(400).json({ message: "คำขอถอนเงินไม่ถูกต้อง" });
        }

        const wallet = await Wallet.findOne({ userId: request.userId });
        if (wallet) {
            wallet.balance += request.amount;
            await wallet.save();
        }

        request.status = "rejected";
        request.updatedAt = moment().tz("Asia/Bangkok").format("DD-MM-YYYY HH:mm:ss");
        await request.save();
        // ✅ ส่ง event เพื่ออัปเดตข้อมูลรายการถอนแบบเรียลไทม์
        req.io.emit("refreshWithdraws");
        // ✅ ส่ง event เพื่ออัปเดตยอดเงินแบบเรียลไทม์
        req.io.emit("orderUpdated");
        res.json({ message: "❌ ปฏิเสธคำขอถอนเงิน และคืนยอดเงินเรียบร้อย!", request });
    } catch (error) {
        console.error("Error rejecting withdrawal:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการปฏิเสธคำขอถอนเงิน" });
    }
});

// ✅ 7. API ให้ผู้ใช้ดูประวัติการถอนของตัวเอง
router.get("/user-requests", authenticate, async (req, res) => {
    try {
        const userRequests = await WithdrawRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });

        if (!userRequests.length) {
            return res.status(404).json({ message: "ไม่พบประวัติการถอนเงิน" });
        }

        res.json(userRequests);
    } catch (error) {
        console.error("Error fetching user's withdrawal requests:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประวัติการถอนเงิน" });
    }
});

module.exports = router;
