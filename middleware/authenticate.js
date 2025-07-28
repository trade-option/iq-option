// middleware/authenticate.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "ไม่พบ token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("✅ decoded token:", decoded); // ✅ เพิ่ม log นี้
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token decode failed:", err.message);
    return res.status(401).json({ message: "token ไม่ถูกต้อง" });
  }
};