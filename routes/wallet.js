const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Deposit = require("../models/Deposit");
const Transaction = require("../models/Transaction");
const authenticate = require("../middleware/authenticate");

// ✅ ดึงยอดคงเหลือของผู้ใช้
router.get("/", authenticate, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) return res.status(404).json({ balance: 0 });
        res.json({ balance: wallet.balance });
    } catch (err) {
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงยอดคงเหลือ" });
    }
});

// ✅ ดึงข้อมูลกระเป๋าเงินของผู้ใช้
router.get("/info", authenticate, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            return res.status(404).json({ message: "ไม่พบข้อมูลกระเป๋าเงินของผู้ใช้" });
        }

        res.json({
            balance: wallet.balance,
            totalDeposits: wallet.totalDeposits,
            totalWithdrawals24h: wallet.totalWithdrawals24h,
            availableToWithdraw24h: wallet.availableToWithdraw24h
        });
    } catch (error) {
        console.error("Error fetching wallet info:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลกระเป๋าเงิน" });
    }
});

// ✅ ดึงประวัติการฝาก-ถอนของผู้ใช้
router.get("/user-requests", authenticate, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ userId: req.user.id }).sort({ createdAt: -1 });
        const deposits = await Transaction.find({ userId: req.user.id, type: "deposit" }).sort({ createdAt: -1 });

        const transactions = [
            ...withdrawals.map(w => ({
                type: "withdraw",
                amount: w.amount,
                status: w.status,
                createdAt: w.createdAt
            })),
            ...deposits.map(d => ({
                type: "deposit",
                amount: d.amount,
                status: d.status,
                createdAt: d.createdAt
            }))
        ];

        transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(transactions);
    } catch (error) {
        console.error("Error fetching user transactions:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลธุรกรรม" });
    }
});

// ✅ ดึงยอดคงเหลือ
router.get("/balance", authenticate, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) return res.status(404).json({ message: "ไม่พบกระเป๋าเงินของผู้ใช้" });
        res.json({ balance: wallet.balance });
    } catch (error) {
        console.error("❌ Error fetching balance:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงยอดคงเหลือ" });
    }
});

// ✅ ดึงประวัติการถอนเงินของผู้ใช้
router.get("/withdrawals", authenticate, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลการถอนเงิน" });
    }
});

// ✅ ฝากเงิน
router.post("/deposit", authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: "จำนวนเงินฝากต้องมากกว่า 0" });

        let wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            wallet = new Wallet({
                userId: req.user.id,
                balance: 0,
                totalDeposits: 0,
                totalWithdrawals24h: 0,
                availableToWithdraw24h: 0
            });
        }

        wallet.balance += amount;
        wallet.totalDeposits += amount;
        wallet.availableToWithdraw24h += amount;
        await wallet.save();

        const newDeposit = new Deposit({
            userId: req.user.id,
            amount,
            status: "pending",
            createdAt: new Date()
        });

        await newDeposit.save();
        res.json({ message: "ฝากเงินสำเร็จ!", deposit: newDeposit });
    } catch (error) {
        console.error("Error depositing:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการฝากเงิน" });
    }
});

// ✅ ถอนเงิน
router.post("/withdraw", authenticate, async (req, res) => {
    try {
        const { amount, withdrawalMethod, withdrawalAddress, network } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: "จำนวนเงินถอนต้องมากกว่า 0" });

        let wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) return res.status(400).json({ message: "ไม่พบกระเป๋าเงินของผู้ใช้" });

        if (wallet.balance < amount) return res.status(400).json({ message: "ยอดเงินคงเหลือไม่เพียงพอ" });

        wallet.balance -= amount;
        await wallet.save();

        const newWithdrawal = new Withdrawal({
            userId: req.user.id,
            amount,
            withdrawalMethod,
            withdrawalAddress,
            network,
            status: "pending",
            createdAt: new Date()
        });

        await newWithdrawal.save();

        const withdrawTransaction = new Transaction({
            userId: req.user.id,
            type: "withdraw",
            amount,
            network,
            status: "pending",
            createdAt: new Date()
        });

        await withdrawTransaction.save();

        res.json({ message: "คำขอถอนเงินถูกสร้างขึ้นแล้ว!", withdrawal: newWithdrawal });
    } catch (error) {
        console.error("Error withdrawing:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการถอนเงิน" });
    }
});

// ✅ อนุมัติ/ปฏิเสธการถอน (สำหรับแอดมิน เรียกใช้ตรงผ่าน API)
router.post("/withdrawals/approve/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) return res.status(404).json({ message: "ไม่พบคำขอถอนเงิน" });
        if (withdrawal.status !== "pending") return res.status(400).json({ message: "คำขอถอนเงินนี้ดำเนินการแล้ว" });

        if (action === "approve") {
            withdrawal.status = "approved";
        } else if (action === "reject") {
            withdrawal.status = "rejected";
            const wallet = await Wallet.findOne({ userId: withdrawal.userId });
            if (wallet) {
                wallet.balance += withdrawal.amount;
                await wallet.save();
            }
        } else {
            return res.status(400).json({ message: "action ต้องเป็น approve หรือ reject เท่านั้น" });
        }

        await withdrawal.save();
        res.json({ message: `คำขอถอนเงินถูก${action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}`, withdrawal });
    } catch (error) {
        console.error("Error processing withdrawal:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอนุมัติ/ปฏิเสธการถอนเงิน" });
    }
});

module.exports = router;
