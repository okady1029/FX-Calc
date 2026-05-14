const goldAccountProfiles = {
  standard: {
    label: "スタンダード口座",
    contractSize: 100,
    details: [
      "スタンダード口座: 1ロット = 100トロイオンス",
      "最小単位目安: 0.01ロット",
      "1ドルの価格変動 = 100pips",
      "1ロット・1ドルの値幅 = $100.00 / 1ロット・1pip = $1.00",
    ],
  },
  micro: {
    label: "マイクロ口座",
    contractSize: 1,
    details: [
      "マイクロ口座: 1ロット = 1トロイオンス（スタンダードの100分の1）",
      "最小単位目安: 0.01ロット",
      "1ドルの価格変動 = 100pips",
      "1ロット・1ドルの値幅 = $1.00 / 1ロット・1pip = $0.01",
    ],
  },
};

const instruments = {
  EURUSD: {
    label: "EUR/USD",
    contractSize: 100000,
    pipSize: 0.0001,
    quoteCurrency: "USD",
    pipValuePerLot(rate) {
      return this.contractSize * this.pipSize;
    },
    priceMoveFromPips(pips) {
      return pips * this.pipSize;
    },
    details(rate) {
      return ["1ロット = 100,000通貨", "1pip = 0.0001", "1ロット・1pip = $10.00"];
    },
  },
  USDJPY: {
    label: "USD/JPY",
    contractSize: 100000,
    pipSize: 0.01,
    quoteCurrency: "JPY",
    pipValuePerLot(rate) {
      return (this.contractSize * this.pipSize) / rate;
    },
    priceMoveFromPips(pips) {
      return pips * this.pipSize;
    },
    details(rate) {
      return [
        "1ロット = 100,000通貨",
        "1pip = 0.01",
        `1ロット・1pip = ¥1,000 ÷ ${formatNumber(rate, 3)} = ${formatCurrency(this.pipValuePerLot(rate))}`,
      ];
    },
  },
  XAUUSD: {
    label: "GOLD/USD (XAU/USD)",
    pipSize: 0.01,
    quoteCurrency: "USD",
    get contractSize() {
      return getGoldProfile().contractSize;
    },
    pipValuePerLot(rate) {
      return this.contractSize * this.pipSize;
    },
    priceMoveFromPips(pips) {
      return pips / 100;
    },
    pipsFromPriceMove(priceMove) {
      return priceMove * 100;
    },
    details(rate) {
      return [
        ...getGoldProfile().details,
        "損益 = 取引ロット × 価格変動幅（ドル） × 契約サイズ",
        "例: 2,000ドル → 2,005ドルを1ロットで取引 = 1ロット × 5ドル × 100 = $500.00",
        "適正ロット = リスク許容額 ÷（損切り幅ドル × 契約サイズ）",
      ];
    },
  },
};

const symbolSelect = document.querySelector("#symbol");
const usdJpyRateField = document.querySelector("#usdJpyRateField");
const usdJpyRateInput = document.querySelector("#usdJpyRate");
const goldAccountField = document.querySelector("#goldAccountField");
const goldAccountType = document.querySelector("#goldAccountType");
const pipsMoveInput = document.querySelector("#pipsMove");
const goldPriceMoveField = document.querySelector("#goldPriceMoveField");
const goldPriceMoveInput = document.querySelector("#goldPriceMove");
const modeTabs = document.querySelectorAll(".mode-tab");
const panels = document.querySelectorAll(".calc-form");
const profitResult = document.querySelector("#profitResult");
const pipsResult = document.querySelector("#pipsResult");
const riskResult = document.querySelector("#riskResult");
const profitDetail = document.querySelector("#profitDetail");
const pipsDetail = document.querySelector("#pipsDetail");
const riskDetail = document.querySelector("#riskDetail");
const instrumentDetails = document.querySelector("#instrumentDetails");

let lastGoldMoveInput = "pips";

pipsMoveInput.addEventListener("input", () => {
  lastGoldMoveInput = "pips";
});

goldPriceMoveInput.addEventListener("input", () => {
  lastGoldMoveInput = "price";
});

const inputs = document.querySelectorAll("input, select");
inputs.forEach((input) => input.addEventListener("input", calculate));

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedMode = tab.dataset.mode;
    if (selectedMode === "risk") {
      symbolSelect.value = "XAUUSD";
    }
    modeTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
    panels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== selectedMode));
    calculate();
  });
});

function getGoldProfile() {
  return goldAccountProfiles[goldAccountType.value];
}

function getRate() {
  const rate = Number.parseFloat(usdJpyRateInput.value);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function getInstrument() {
  return instruments[symbolSelect.value];
}

function getPipValue() {
  return getInstrument().pipValuePerLot(getRate());
}

function calculateProfit() {
  syncGoldMoveInputs();

  const lots = Number.parseFloat(document.querySelector("#lotsProfit").value) || 0;
  const pips = getProfitPips();
  const profit = lots * pips * getPipValue();

  profitResult.querySelector("strong").textContent = formatCurrency(profit);
  profitDetail.textContent = getProfitDetail(lots, pips, profit);
}

function calculateRequiredPips() {
  const lots = Number.parseFloat(document.querySelector("#lotsPips").value) || 0;
  const targetProfit = Number.parseFloat(document.querySelector("#targetProfit").value) || 0;
  const pipValue = lots * getPipValue();
  const requiredPips = pipValue === 0 ? 0 : targetProfit / pipValue;

  pipsResult.querySelector("strong").textContent = `${formatNumber(requiredPips, 2)} pips`;
  pipsDetail.textContent = getRequiredPipsDetail(requiredPips);
}

function calculateRiskLot() {
  const equity = Number.parseFloat(document.querySelector("#equity").value) || 0;
  const riskPercent = Number.parseFloat(document.querySelector("#riskPercent").value) || 0;
  const stopLossDollars = Number.parseFloat(document.querySelector("#stopLossDollars").value) || 0;
  const riskAmount = equity * (riskPercent / 100);
  const contractSize = getGoldProfile().contractSize;
  const lossPerLot = stopLossDollars * contractSize;
  const lots = lossPerLot === 0 ? 0 : riskAmount / lossPerLot;
  const stopLossPips = instruments.XAUUSD.pipsFromPriceMove(stopLossDollars);
  const minimumLotNote = lots > 0 && lots < 0.01 ? " 最小単位0.01ロット未満のため、実取引では口座条件を確認してください。" : "";

  riskResult.querySelector("strong").textContent = `${formatNumber(lots, 2)} lots`;
  riskDetail.textContent = `リスク許容額 ${formatCurrency(riskAmount)} ÷ 1ロットの損失額 ${formatCurrency(lossPerLot)}（${formatNumber(stopLossDollars, 2)}ドル × ${contractSize}oz） = ${formatNumber(lots, 2)}ロット。損切り幅は${formatNumber(stopLossPips, 0)}pipsです。${minimumLotNote}`;
}

function getProfitPips() {
  if (symbolSelect.value !== "XAUUSD" || lastGoldMoveInput === "pips") {
    return Number.parseFloat(pipsMoveInput.value) || 0;
  }

  const priceMove = Number.parseFloat(goldPriceMoveInput.value) || 0;
  return instruments.XAUUSD.pipsFromPriceMove(priceMove);
}

function syncGoldMoveInputs() {
  const isGold = symbolSelect.value === "XAUUSD";
  goldPriceMoveField.hidden = !isGold;

  if (!isGold) {
    return;
  }

  if (lastGoldMoveInput === "price") {
    const priceMove = Number.parseFloat(goldPriceMoveInput.value) || 0;
    pipsMoveInput.value = formatInputNumber(instruments.XAUUSD.pipsFromPriceMove(priceMove), 2);
    return;
  }

  const pips = Number.parseFloat(pipsMoveInput.value) || 0;
  goldPriceMoveInput.value = formatInputNumber(instruments.XAUUSD.priceMoveFromPips(pips), 2);
}

function getProfitDetail(lots, pips, profit) {
  if (symbolSelect.value !== "XAUUSD") {
    return `1ロットあたり${formatCurrency(getPipValue())} × ${formatNumber(lots, 2)}ロット × ${formatNumber(pips, 2)}pips = ${formatCurrency(profit)}。`;
  }

  const priceMove = instruments.XAUUSD.priceMoveFromPips(pips);
  return `${formatNumber(pips, 2)}pips = ${formatNumber(priceMove, 2)}ドルの値幅。${formatNumber(priceMove, 2)}ドル × ${formatNumber(lots, 2)}ロット × ${getGoldProfile().contractSize}oz = ${formatCurrency(profit)}。`;
}

function getRequiredPipsDetail(requiredPips) {
  if (symbolSelect.value !== "XAUUSD") {
    return `必要pipsは、目標利益 ÷（ロット数 × 1ロットあたりのpips価値）で計算します。`;
  }

  const priceMove = instruments.XAUUSD.priceMoveFromPips(requiredPips);
  return `${formatNumber(requiredPips, 2)}pips = ${formatNumber(priceMove, 2)}ドルの値幅です。GOLD/USDは1ドルの値幅を100pipsとして換算します。`;
}

function updateInstrumentUi() {
  const selectedMode = document.querySelector(".mode-tab.active").dataset.mode;
  if (selectedMode === "risk" && symbolSelect.value !== "XAUUSD") {
    symbolSelect.value = "XAUUSD";
  }

  const instrument = getInstrument();
  const needsRate = symbolSelect.value === "USDJPY";
  const isGold = symbolSelect.value === "XAUUSD";
  usdJpyRateField.hidden = !needsRate;
  goldAccountField.hidden = !(isGold || selectedMode === "risk");
  goldPriceMoveField.hidden = !isGold;
  instrumentDetails.innerHTML = instrument
    .details(getRate())
    .map((detail) => `<li>${detail}</li>`)
    .join("");
}

function calculate() {
  updateInstrumentUi();
  calculateProfit();
  calculateRequiredPips();
  calculateRiskLot();
}

function formatInputNumber(value, digits) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value, digits) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

calculate();
