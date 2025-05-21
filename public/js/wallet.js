const API_URL = "/api";
const token = localStorage.getItem("token");

if (!token) {
  alert("กรุณาเข้าสู่ระบบก่อน");
  window.location.href = "index.html";
}

const btnActive = document.getElementById("btn-active-orders");
const btnClosed = document.getElementById("btn-closed-orders");
const balanceText = document.getElementById("balance");
const orderList = document.getElementById("order-list");

let currentTab = "active";

async function loadWallet() {
  try {
    const res = await fetch(`${API_URL}/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    balanceText.textContent = `USDT: ${parseFloat(data.balance).toFixed(2)}`;
  } catch (err) {
    console.error("โหลดยอดคงเหลือล้มเหลว:", err);
  }
}

async function loadOrders(status = "active") {
  try {
    const res = await fetch(`${API_URL}/trade/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orders = await res.json();
    orderList.innerHTML = "";
    const filtered = orders.filter(o => o.status === (status === "active" ? "open" : "closed"));
    filtered.forEach(order => {
      const el = renderOrder(order, status === "closed");
      orderList.appendChild(el);
    });
  } catch (err) {
    console.error("โหลดออเดอร์ล้มเหลว:", err);
  }
}

btnActive.addEventListener("click", () => {
  currentTab = "active";
  btnActive.classList.add("bg-orange-500");
  btnClosed.classList.remove("bg-orange-500");
  loadOrders("active");
});

btnClosed.addEventListener("click", () => {
  currentTab = "closed";
  btnClosed.classList.add("bg-orange-500");
  btnActive.classList.remove("bg-orange-500");
  loadOrders("closed");
});

document.addEventListener("DOMContentLoaded", () => {
  loadWallet();
  loadOrders(currentTab);
});

socket.on("orderUpdated", () => {
  loadWallet();
  loadOrders(currentTab);
});

setInterval(() => {
  renderBalance();
}, 5000);

// ✅ แก้เฉพาะจุด: เพิ่มฟังก์ชันนี้เพื่อให้ไม่เกิด error
function renderBalance() {
  if (!balanceText) return;
  const rawText = balanceText.textContent;
  const match = rawText.match(/[\d.]+/);
  if (match) {
    const currentBalance = parseFloat(match[0]);
    balanceText.textContent = `USDT: ${currentBalance.toFixed(2)}`;
  }
}
