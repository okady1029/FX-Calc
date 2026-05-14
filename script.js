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
const usdJpyRateHint = document.querySelector("#usdJpyRateHint");
const goldAccountField = document.querySelector("#goldAccountField");
const goldAccountType = document.querySelector("#goldAccountType");
const pipsMoveInput = document.querySelector("#pipsMove");
const goldPriceMoveField = document.querySelector("#goldPriceMoveField");
const goldPriceMoveInput = document.querySelector("#goldPriceMove");
const modeTabs = document.querySelectorAll(".mode-tab");
const profitCurrencyButtons = document.querySelectorAll(".profit-currency-button");
const targetCurrencyButtons = document.querySelectorAll(".target-currency-button");
const panels = document.querySelectorAll(".calc-form");
const profitResult = document.querySelector("#profitResult");
const pipsResult = document.querySelector("#pipsResult");
const riskResult = document.querySelector("#riskResult");
const targetProfitInput = document.querySelector("#targetProfit");
const targetProfitLabel = document.querySelector("#targetProfitLabel");
const profitDetail = document.querySelector("#profitDetail");
const pipsDetail = document.querySelector("#pipsDetail");
const riskDetail = document.querySelector("#riskDetail");
const instrumentDetails = document.querySelector("#instrumentDetails");

let lastGoldMoveInput = "pips";
let profitCurrency = "USD";
let targetCurrency = "USD";

pipsMoveInput.addEventListener("input", () => {
  lastGoldMoveInput = "pips";
});

goldPriceMoveInput.addEventListener("input", () => {
  lastGoldMoveInput = "price";
});

const inputs = document.querySelectorAll("input, select");
inputs.forEach((input) => input.addEventListener("input", calculate));

profitCurrencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    profitCurrency = button.dataset.currency;
    updateCurrencyButtons(profitCurrencyButtons, button);
    calculate();
  });
});

targetCurrencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTargetCurrency(button.dataset.currency);
    updateCurrencyButtons(targetCurrencyButtons, button);
    calculate();
  });
});

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

function updateCurrencyButtons(buttons, activeButton) {
  buttons.forEach((item) => {
    const isActive = item === activeButton;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
}

function setTargetCurrency(nextCurrency) {
  if (targetCurrency === nextCurrency) {
    return;
  }

  const currentValue = Number.parseFloat(targetProfitInput.value) || 0;
  targetProfitInput.value = nextCurrency === "JPY"
    ? formatInputNumber(currentValue * getRate(), 0)
    : formatInputNumber(currentValue / getRate(), 2);
  targetCurrency = nextCurrency;
  updateTargetCurrencyUi();
}

function updateTargetCurrencyUi() {
  const isYen = targetCurrency === "JPY";
  targetProfitLabel.textContent = isYen ? "目標利益（JPY）" : "目標利益（USD）";
  targetProfitInput.step = isYen ? "100" : "1";
}

function calculateProfit() {
  syncGoldMoveInputs();

  const lots = Number.parseFloat(document.querySelector("#lotsProfit").value) || 0;
  const pips = getProfitPips();
  const profit = lots * pips * getPipValue();

  profitResult.querySelector("strong").textContent = formatProfit(profit);
  profitDetail.textContent = getProfitDetail(lots, pips, profit);
}

function calculateRequiredPips() {
  const lots = Number.parseFloat(document.querySelector("#lotsPips").value) || 0;
  const targetProfit = getTargetProfitUsd();
  const pipValue = lots * getPipValue();
  const requiredPips = pipValue === 0 ? 0 : targetProfit / pipValue;

  pipsResult.querySelector("strong").textContent = `${formatNumber(requiredPips, 2)} pips`;
  pipsDetail.textContent = getRequiredPipsDetail(requiredPips, targetProfit);
}

function getTargetProfitUsd() {
  const targetProfit = Number.parseFloat(targetProfitInput.value) || 0;
  return targetCurrency === "JPY" ? targetProfit / getRate() : targetProfit;
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
  const convertedProfit = getProfitConversionDetail(profit);

  if (symbolSelect.value !== "XAUUSD") {
    return `1ロットあたり${formatCurrency(getPipValue())} × ${formatNumber(lots, 2)}ロット × ${formatNumber(pips, 2)}pips = ${formatCurrency(profit)}。${convertedProfit}`;
  }

  const priceMove = instruments.XAUUSD.priceMoveFromPips(pips);
  return `${formatNumber(pips, 2)}pips = ${formatNumber(priceMove, 2)}ドルの値幅。${formatNumber(priceMove, 2)}ドル × ${formatNumber(lots, 2)}ロット × ${getGoldProfile().contractSize}oz = ${formatCurrency(profit)}。${convertedProfit}`;
}

function getProfitConversionDetail(profit) {
  if (profitCurrency !== "JPY") {
    return "";
  }

  return ` 円表示: ${formatCurrency(profit, "USD")} × USD/JPY ${formatNumber(getRate(), 3)} = ${formatCurrency(profit * getRate(), "JPY")}。`;
}

function getRequiredPipsDetail(requiredPips, targetProfitUsd) {
  const targetDetail = getTargetProfitConversionDetail(targetProfitUsd);

  if (symbolSelect.value !== "XAUUSD") {
    return `${targetDetail}必要pipsは、目標利益（USD） ÷（ロット数 × 1ロットあたりのpips価値）で計算します。`;
  }

  const priceMove = instruments.XAUUSD.priceMoveFromPips(requiredPips);
  return `${targetDetail}${formatNumber(requiredPips, 2)}pips = ${formatNumber(priceMove, 2)}ドルの値幅です。GOLD/USDは1ドルの値幅を100pipsとして換算します。`;
}

function getTargetProfitConversionDetail(targetProfitUsd) {
  if (targetCurrency !== "JPY") {
    return `目標利益 ${formatCurrency(targetProfitUsd, "USD")}。`;
  }

  const targetProfitJpy = Number.parseFloat(targetProfitInput.value) || 0;
  return `目標利益 ${formatCurrency(targetProfitJpy, "JPY")} ÷ USD/JPY ${formatNumber(getRate(), 3)} = ${formatCurrency(targetProfitUsd, "USD")}。`;
}

function updateInstrumentUi() {
  const selectedMode = document.querySelector(".mode-tab.active").dataset.mode;
  if (selectedMode === "risk" && symbolSelect.value !== "XAUUSD") {
    symbolSelect.value = "XAUUSD";
  }

  const instrument = getInstrument();
  const needsProfitRate = selectedMode === "profit" && profitCurrency === "JPY";
  const needsTargetRate = selectedMode === "pips" && targetCurrency === "JPY";
  const needsRate = symbolSelect.value === "USDJPY" || needsProfitRate || needsTargetRate;
  const isGold = symbolSelect.value === "XAUUSD";
  usdJpyRateField.hidden = !needsRate;
  if (needsTargetRate) {
    usdJpyRateHint.textContent = "円入力の目標利益を、このUSD/JPYレートでドル建て目標利益に換算します。";
  } else if (needsProfitRate) {
    usdJpyRateHint.textContent = "円表示では、計算したドル建て損益をこのUSD/JPYレートで円換算します。";
  } else {
    usdJpyRateHint.textContent = "USD/JPYは1pipの価値をドル換算するため、現在レートを入力してください。";
  }
  goldAccountField.hidden = !(isGold || selectedMode === "risk");
  goldPriceMoveField.hidden = !isGold;
  instrumentDetails.innerHTML = instrument
    .details(getRate())
    .map((detail) => `<li>${detail}</li>`)
    .join("");
}

function calculate() {
  updateTargetCurrencyUi();
  updateInstrumentUi();
  calculateProfit();
  calculateRequiredPips();
  calculateRiskLot();
}

function formatInputNumber(value, digits) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatProfit(profitUsd) {
  if (profitCurrency === "JPY") {
    return formatCurrency(profitUsd * getRate(), "JPY");
  }

  return formatCurrency(profitUsd, "USD");
}

function formatCurrency(value, currency = "USD") {
  const isYen = currency === "JPY";
  return new Intl.NumberFormat(isYen ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: isYen ? 0 : 2,
    minimumFractionDigits: isYen ? 0 : 2,
  }).format(value);
}

function formatNumber(value, digits) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

calculate();
