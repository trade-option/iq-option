
// binary-trade-v2.js (พร้อมระบบเลือกสินทรัพย์แบบ modal + ค้นหา + TradingView)
let selectedAsset = null;
let activeAssets = [];
let currentInterval = "1";
 
const timeframeConfig = {
  2: { min: 100, percent: 6 },
  5: { min: 3000, percent: 9 },
  15: { min: 7000, percent: 11 },
  30: { min: 24000, percent: 14 },
  60: { min: 73000, percent: 17 },
};

// รายการสินทรัพย์ทั้งหมด
window.assetList = [
  { id: "AAPL", name: "Apple(AAPL)", symbol: "NASDAQ:AAPL", logo: "https://s3-symbol-logo.tradingview.com/apple--big.svg" },
  { id: "TSLA", name: "Tesla(TSLA)", symbol: "NASDAQ:TSLA", logo: "https://s3-symbol-logo.tradingview.com/tesla--big.svg" },
  { id: "AMZN", name: "Amazon(AMZN)", symbol: "NASDAQ:AMZN", logo: "https://s3-symbol-logo.tradingview.com/amazon.svg" },
  { id: "NVIDIA", name: "Nvidia(NVIDIA)", symbol: "NASDAQ:NVIDIA", logo: "https://s3-symbol-logo.tradingview.com/nvidia.svg" },
  { id: "BTCUSDT", name: "BTC/USD", symbol: "BINANCE:BTCUSDT", logo: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png" },
  { id: "XRPUSDT", name: "XRP/USD", symbol: "BINANCE:XRPUSDT", logo: "https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg" },
  { id: "ETHUSDT", name: "ETH/USD", symbol: "BINANCE:ETHUSDT", logo: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png" },
  { id: "BNBUSDT", name: "BNB/USD", symbol: "BINANCE:BNBUSDT", logo: "https://assets.coingecko.com/coins/images/825/thumb/binance-coin-logo.png" },
  { id: "SOLUSDT", name: "SOL/USD", symbol: "BINANCE:SOLUSDT", logo: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png" },
  { id: "DOTUSD", name: "DOT/USD", symbol: "BINANCE:DOTUSDT", logo: "https://s3-symbol-logo.tradingview.com/crypto/XTVCDOT--big.svg" },
  { id: "XAUUSD", name: "Gold/USD", symbol: "OANDA:XAUUSD", logo: "https://s3-symbol-logo.tradingview.com/metal/gold--big.svg" },
  { id: "SILVER",name: "Silver/USD",symbol:"COMEX:SI1!", logo: "https://s3-symbol-logo.tradingview.com/metal/silver--big.svg" },
  { id: "EURUSD", name: "EUR/USD", symbol: "OANDA:EURUSD", logo: "https://s3-symbol-logo.tradingview.com/country/US.svg" },
  { id: "PLATINUM",name: "Platinum/USD",symbol: "COMEX:PL1!", logo: "https://s3-symbol-logo.tradingview.com/metal/platinum--big.svg" },
  { id: "COPPER", name: "Copper/USD", symbol: "COMEX:HG1!", logo: "https://s3-symbol-logo.tradingview.com/metal/copper--big.svg" },
  { id: "USDJPY", name: "USD/JPY", symbol: "OANDA:USDJPY", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg" },
  { id: "ADAUSDT", name: "ADA/USD", symbol: "BINANCE:ADAUSDT", logo: "https://assets.coingecko.com/coins/images/975/thumb/cardano.png" },
  { id: "GBPUSD", name: "GBP/USD", symbol: "OANDA:GBPUSD", logo: "https://s3-symbol-logo.tradingview.com/country/GB.svg" },
  { id: "AUDUSD", name: "AUD/USD", symbol: "OANDA:AUDUSD", logo: "https://s3-symbol-logo.tradingview.com/country/AU--big.svg" },
  { id: "NZDUSD", name: "NZD/USD", symbol: "OANDA:NZDUSD", logo: "https://s3-symbol-logo.tradingview.com/country/NZ.svg" },
  { id: "USDCHF", name: "USD/CHF", symbol: "OANDA:USDCHF", logo: "https://s3-symbol-logo.tradingview.com/country/CH.svg" },
  { id: "DOGEUSDT", name: "DOGE/USD", symbol: "BINANCE:DOGEUSDT", logo: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png" },
  { id: "AVAXUSDT", name: "AVAX/USD", symbol: "BINANCE:AVAXUSDT", logo: "https://assets.coingecko.com/coins/images/12559/thumb/coin-round-red.png" }
];

function renderTradingView(symbol) {
  const chartContainer = document.getElementById("chartContainer");
  chartContainer.innerHTML = "";
  new TradingView.widget({
    container_id: "chartContainer",
    width: "100%",
    height: 300,
    symbol: symbol,
    interval: currentInterval,
    timezone: "Asia/Bangkok",
    theme: "dark",
    style: "1",
    locale: "th",
    toolbar_bg: "#1e293b",
    enable_publishing: false,
    allow_symbol_change: false,
    hide_top_toolbar: false,
    hide_legend: false
  });
}

function renderTimeframeSelector() {
  const container = document.getElementById("timeframeSelector");
  if (!container) return;
  const times = [1, 5, 15, 30, 60];
  container.innerHTML = times.map(min => `
    <button onclick="changeInterval('${min}')" class="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded mr-2 ${currentInterval === String(min) ? 'bg-orange-500' : ''}">
      ${min}m
    </button>
  `).join("");
}

function changeInterval(min) {
  currentInterval = min;
  if (selectedAsset) renderTradingView(selectedAsset.symbol);
  renderTimeframeSelector();
}
function renderBalance() {
  fetch("/api/wallet", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then((res) => res.json())
    .then((data) => {
      const balance = data.balance || 0;
      document.getElementById("balanceDisplay").textContent = `$${balance.toLocaleString()}`;
    })
    .catch(() => {
      document.getElementById("balanceDisplay").textContent = "$0.00";
    });
}

function selectAsset(asset) {
  selectedAsset = asset;
  renderTradingView(asset.symbol);
}

function renderAssetBar() {
  const assetBar = document.getElementById("assetBar");
  assetBar.innerHTML = "";

  activeAssets.forEach((asset, index) => {
    const item = document.createElement("div");
    item.className = "flex items-center bg-[#1a1f2e] rounded-lg px-3 py-2 space-x-2 max-w-[180px]";

    const img = document.createElement("img");
    img.src = asset.logo;
    img.className = "w-6 h-6";

    const info = document.createElement("div");
    info.className = "flex flex-col flex-grow";
    info.innerHTML = `<span class="text-white font-semibold text-base">${asset.name}</span><span class="text-[#7a7a7a] text-xs">ไบนารี</span>`;

    const remove = document.createElement("button");
    remove.className = "text-[#7a7a7a] hover:text-white";
    remove.innerHTML = `<i class="fas fa-times"></i>`;
    remove.onclick = (e) => {
      e.stopPropagation();
      activeAssets.splice(index, 1);
      if (selectedAsset?.id === asset.id) {
        selectedAsset = activeAssets[0] || null;
        if (selectedAsset) renderTradingView(selectedAsset.symbol);
      }
      renderAssetBar();
    };

    item.onclick = () => selectAsset(asset);
    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(remove);
    assetBar.appendChild(item);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "w-10 h-10 rounded-lg border border-[#2a2f42] flex items-center justify-center text-white text-2xl font-bold";
  addBtn.innerHTML = "+";
  addBtn.onclick = showAssetSelectionModal;
  assetBar.appendChild(addBtn);
}

function showAssetSelectionModal() {
  const modal = document.createElement("div");
  modal.id = "assetModal";
  modal.className = "fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center";
  modal.innerHTML = `
    <div class="bg-[#1e293b] p-4 rounded-lg w-[300px] max-h-[80vh] overflow-y-auto">
      <input type="text" placeholder="ค้นหา..." class="w-full mb-3 px-3 py-2 rounded bg-gray-800 text-white" oninput="filterAssets(this.value)" id="searchAssetInput">
      <div id="assetListContainer" class="space-y-2">
        ${window.assetList.map(a => `
          <button onclick='addAssetFromList("${a.id}")' class='flex items-center gap-2 p-2 w-full hover:bg-gray-700'>
            <img src="${a.logo}" class="w-5 h-5"> <span>${a.name}</span>
          </button>`).join("")}
      </div>
    </div>
  `;
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}

function filterAssets(keyword) {
  const container = document.getElementById("assetListContainer");
  const filtered = window.assetList.filter(a => a.name.toLowerCase().includes(keyword.toLowerCase()) || a.id.toLowerCase().includes(keyword.toLowerCase()));
  container.innerHTML = filtered.map(a => `
    <button onclick='addAssetFromList("${a.id}")' class='flex items-center gap-2 p-2 w-full hover:bg-gray-700'>
      <img src="${a.logo}" class="w-5 h-5"> <span>${a.name}</span>
    </button>`).join("");
}

function addAssetFromList(id) {
  const asset = window.assetList.find(a => a.id === id);
  if (!asset) return;
  if (activeAssets.find(a => a.id === id)) return;
  if (activeAssets.length >= 4) activeAssets.shift();
  activeAssets.push(asset);
  selectedAsset = asset;
  renderAssetBar();
  renderTradingView(asset.symbol);
  const modal = document.getElementById("assetModal");
  if (modal) modal.remove();
}

function updateExpectedReturn() {
  const amountInput = document.getElementById("amount");
  const timeframe = parseInt(document.getElementById("timeframe").value);
  const amount = parseFloat(amountInput.value) || 0;
  const resultEl = document.getElementById("expectedReturn");

  const config = timeframeConfig[timeframe];
  if (!config || amount <= 0) {
    resultEl.textContent = "+$0.00 (+0%)";
    return;
  }

  const profit = amount * config.percent / 100;
  resultEl.textContent = `+$${profit.toFixed(2)} (+${config.percent}%)`;
}

function handleTrade(direction) {
  const amount = parseFloat(document.getElementById("amount").value);
  const duration = parseInt(document.getElementById("timeframe").value);
  if (!selectedAsset || isNaN(amount) || amount <= 0) return alert("ข้อมูลไม่ครบถ้วน");

  fetch("/api/trade/place-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({
      asset: selectedAsset.id,
      amount,
      timeframe: duration,
      direction
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("เปิดออเดอร์สำเร็จ");
        renderBalance(); // ✅ เพิ่มบรรทัดนี้
      } else {
        alert(data.message || "เกิดข้อผิดพลาด");
      }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  renderBalance();
  activeAssets.push(window.assetList[0]);
  selectedAsset = activeAssets[0];
  renderAssetBar();
  renderTimeframeSelector();
  renderTradingView(selectedAsset.symbol);

  document.getElementById("buyBtn").onclick = () => handleTrade("buy");
  document.getElementById("sellBtn").onclick = () => handleTrade("sell");

  document.getElementById("timeframe").addEventListener("change", () => {
    const tf = parseInt(document.getElementById("timeframe").value);
    const config = timeframeConfig[tf];
    if (config) document.getElementById("amount").placeholder = `ขั้นต่ำ ${config.min} USDT`;
    updateExpectedReturn();
  });

  document.getElementById("amount").addEventListener("input", updateExpectedReturn);
});

setInterval(() => {
  renderBalance();
}, 5000);
  
