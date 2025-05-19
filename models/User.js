// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ฟังก์ชันสร้าง UID แบบสุ่ม 9 หลัก
const generateUID = async () => {
  let uid = Math.floor(100000000 + Math.random() * 900000000).toString();
  const existingUser = await User.findOne({ uid });
  while (existingUser) {
    uid = Math.floor(100000000 + Math.random() * 900000000).toString();
  }
  return uid;
};

const userSchema = new Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  uid: { type: String, unique: true },
  balance: { type: Number, default: 0 },                   // ✅ ยอดเงิน
  totalDeposits: { type: Number, default: 0 },              // ✅ ยอดฝากสะสม
  totalWithdrawals24h: { type: Number, default: 0 },        // ✅ ยอดถอน 24 ชม.
  availableToWithdraw24h: { type: Number, default: 0 },     // ✅ วงเงินถอนคงเหลือ

  // ✅ winSettings เก็บค่าเป็น Object (Mixed Type)
  winSettings: { type: Schema.Types.Mixed, default: {} },

  // ✅ สามารถเพิ่ม isAdmin หรือ field อื่นๆได้ตามต้องการ
});

// ✅ สร้าง UID อัตโนมัติถ้ายังไม่มี
userSchema.pre('save', async function (next) {
  if (!this.uid) {
    this.uid = await generateUID();
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
