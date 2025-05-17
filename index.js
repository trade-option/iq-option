const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const kycRoutes = require("./routes/kyc");
const transactionRoutes = require("./routes/transactions");
const tradeRoutes = require("./routes/trade-new");
const walletRoutes = require("./routes/wallet");
const withdrawRoutes = require("./routes/withdraw");
const profileRoutes = require("./routes/profile");
const ordersRoutes = require("./routes/orders");

const path = require("path");
require("dotenv").config();

const app = express();
const viewsPath = path.join(__dirname, "views");

// ✅ Connect to MongoDB
connectDB()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// ✅ Middleware to attach `io` to every request for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const allowedOrigins = [
  "https://website-bc4t.onrender.com",
  "http://localhost:4000"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

// ✅ Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/orders", ordersRoutes);

// ✅ HTML view routes
app.get("/", (req, res) => res.sendFile(path.join(viewsPath, "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(viewsPath, "index.html")));
app.get("/wallet", (req, res) => res.sendFile(path.join(viewsPath, "wallet.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(viewsPath, "profile.html")));
app.get("/binary-trade-v2", (req, res) => res.sendFile(path.join(viewsPath, "binary-trade-v2.html")));
app.get("/deposit", (req, res) => res.sendFile(path.join(viewsPath, "deposit.html")));
app.get("/withdraw", (req, res) => res.sendFile(path.join(viewsPath, "withdraw.html")));
app.get("/kyc", (req, res) => res.sendFile(path.join(viewsPath, "kyc.html")));
app.get("/transaction-history", (req, res) => res.sendFile(path.join(viewsPath, "transaction-history.html")));
app.get("/personal-info", (req, res) => res.sendFile(path.join(viewsPath, "personal-info.html")));
app.get("/admin-dashboard", (req, res) => res.sendFile(path.join(viewsPath, "admin-dashboard.html")));

// ✅ Test API route
app.get("/api/kyc/test", (req, res) => {
  res.json({ message: "✅ KYC API is working!" });
});

// ✅ Socket.IO connection and event handlers
io.on("connection", (socket) => {
  console.log("✅ Client connected to WebSocket!");
  // Listen for withdraw-related events from clients and broadcast updates
  socket.on("withdrawRequest", () => io.emit("refreshWithdraws"));
  socket.on("withdrawApproved", () => io.emit("refreshWithdraws"));
  socket.on("withdrawRejected", () => io.emit("refreshWithdraws"));
  socket.on("withdrawCompleted", () => io.emit("refreshWithdraws"));

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected from WebSocket.");
  });
});

// ✅ 404 handler for unknown routes
app.use((req, res, next) => {
  if (req.path.endsWith(".html")) {
    return res.status(404).sendFile(path.join(viewsPath, "index.html"));
  }
  res.status(404).json({ message: "❌ API endpoint not found" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);
  res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์!" });
});

// ✅ Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
