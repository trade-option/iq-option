function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

const logos = {
  BTCUSDT: "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png",
  XRPUSDT: "https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg",
  ETHUSDT: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",
  BNBUSDT: "https://assets.coingecko.com/coins/images/825/thumb/binance-coin-logo.png",
  SOLUSDT: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png",
  DOTUSD: "https://s3-symbol-logo.tradingview.com/crypto/XTVCDOT--big.svg",
  XAUUSD: "https://s3-symbol-logo.tradingview.com/metal/gold--big.svg",
  SILVER: "https://s3-symbol-logo.tradingview.com/metal/silver--big.svg",
  EURUSD: "https://s3-symbol-logo.tradingview.com/country/US.svg",
  PLATINUM: "https://s3-symbol-logo.tradingview.com/metal/platinum--big.svg",
  COPPER: "https://s3-symbol-logo.tradingview.com/metal/copper--big.svg",
  USDJPY: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg",
  ADAUSDT: "https://assets.coingecko.com/coins/images/975/thumb/cardano.png",
  GBPUSD: "https://s3-symbol-logo.tradingview.com/country/GB.svg",
  AUDUSD: "https://s3-symbol-logo.tradingview.com/country/AU--big.svg",
  NZDUSD: "https://s3-symbol-logo.tradingview.com/country/NZ.svg",
  USDCHF: "https://s3-symbol-logo.tradingview.com/country/CH.svg",
  DOGEUSDT: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png",
  AVAXUSDT: "https://assets.coingecko.com/coins/images/12559/thumb/coin-round-red.png",
  NVIDIA: "https://s3-symbol-logo.tradingview.com/nvidia.svg",
  AMZN: "https://s3-symbol-logo.tradingview.com/amazon.svg",
  TSLA: "https://s3-symbol-logo.tradingview.com/tesla--big.svg",
  AAPL: "https://s3-symbol-logo.tradingview.com/apple--big.svg",
};

function getLogo(asset) {
  return logos[asset] || "https://via.placeholder.com/40";
}

function renderOrder(order, isClosed = false) {
  const percent = { 2: 6, 5: 9, 15: 11, 30: 14, 60: 17 }[order.timeframe] || 0;
  const logo = getLogo(order.asset);
  const isBuy = order.direction === "buy";
  const directionColor = isBuy ? "text-green-400" : "text-red-400";
  const resultColor = order.result === "win" ? "text-green-400" : "text-red-400";

  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center justify-between bg-[#1e293b] p-3 rounded-xl text-sm mb-2";

  wrapper.innerHTML = `
    <div class="flex items-center gap-3">
      <img src="${logo}" class="w-9 h-9 rounded-full" />
      <div>
        <p class="font-bold text-white text-base">${order.asset.replace("USDT", "/USDT")}</p>
        <p class="text-gray-400 text-xs">ไบนารี</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <div class="flex items-center justify-center w-10 h-10 rounded-full border border-gray-500 text-sm text-white mb-1" id="cd-${order._id}">
        ${order.timeframe * 60}s
      </div>
      <div class="text-right">
        <p class="text-white text-sm">USDT: ${order.amount}</p>
        <p class="text-sm ${resultColor}" id="profit-${order._id}">
          ${isClosed ? `${order.profit >= 0 ? "+" : "-"}${Math.abs(order.profit).toFixed(2)}` : "0.00"}
        </p>
      </div>
    </div>
    <div class="text-right">
      <p class="${directionColor} font-bold text-sm">${order.direction.toUpperCase()}</p>
      ${!isClosed ? `<p class="${directionColor} text-sm">+${percent}%</p>` : ""}
    </div>
  `;

  if (!isClosed) {
    let seconds = Math.max(0, Math.floor((new Date(order.expireAt) - Date.now()) / 1000));
    const cdEl = wrapper.querySelector(`#cd-${order._id}`);
    const pfEl = wrapper.querySelector(`#profit-${order._id}`);
  
    const interval = setInterval(() => {
      seconds--;
      cdEl.textContent = `${seconds}s`;
  
      if (seconds > 0) {
        const profit = (Math.random() * (order.amount * percent / 100)).toFixed(2);
        pfEl.textContent = `${seconds % 2 === 0 ? "+" : "-"}${profit}`;
        pfEl.className = `text-sm ${seconds % 2 === 0 ? "text-green-400" : "text-red-400"}`;
      } else {
        clearInterval(interval);
        wrapper.remove(); // ✅ ลบออเดอร์ออกจาก DOM ทันทีเมื่อหมดเวลา
      }
    }, 1000);
  } else {
    wrapper.style.cursor = "pointer";
    wrapper.onclick = () => {
      window.location.href = `order-detail.html?orderId=${order._id}`;
    };
  }

  return wrapper;
}

window.getLogo = getLogo;
window.logos = logos;
