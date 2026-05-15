const goldAccountProfiles = {
  standard: {
    label: "スタンダード口座",
    contractSize: 100,
    details: [
      "スタンダード口座: 1ロット = 100トロイオンス",
      "最小単位目安: 0.01ロット",
      "1ドルの価格変動 = 10pips",
      "1ロット・1ドルの値幅 = $100.00 / 1ロット・1pip = $10.00",
    ],
  },
  micro: {
    label: "マイクロ口座",
    contractSize: 1,
    details: [
      "マイクロ口座: 1ロット = 1トロイオンス（スタンダードの100分の1）",
      "最小単位目安: 0.01ロット",
      "1ドルの価格変動 = 10pips",
      "1ロット・1ドルの値幅 = $1.00 / 1ロット・1pip = $0.10",
    ],
  },
};

const instruments = {
  XAUUSD: {
    label: "GOLD/USD (XAU/USD)",
    pipSize: 0.1,
    quoteCurrency: "USD",
    get contractSize() {
      return getGoldProfile().contractSize;
    },
    pipValuePerLot(rate) {
      return this.contractSize * this.pipSize;
    },
    priceMoveFromPips(pips) {
      return pips / 10;
    },
    pipsFromPriceMove(priceMove) {
      return priceMove * 10;
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
const fetchUsdJpyRateButton = document.querySelector("#fetchUsdJpyRate");
const usdJpyRateStatus = document.querySelector("#usdJpyRateStatus");
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

fetchUsdJpyRateButton.addEventListener("click", () => {
  fetchUsdJpyRate();
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

function getQuoteCurrency() {
  return getInstrument().quoteCurrency;
}

function convertFromQuoteCurrency(value, currency) {
  const quoteCurrency = getQuoteCurrency();
  if (currency === quoteCurrency) {
    return value;
  }

  return quoteCurrency === "JPY" ? value / getRate() : value * getRate();
}

function convertToQuoteCurrency(value, currency) {
  const quoteCurrency = getQuoteCurrency();
  if (currency === quoteCurrency) {
    return value;
  }

  return quoteCurrency === "JPY" ? value * getRate() : value / getRate();
}

async function fetchUsdJpyRate() {
  const previousStatus = usdJpyRateStatus.textContent;
  fetchUsdJpyRateButton.disabled = true;
  fetchUsdJpyRateButton.textContent = "取得中";
  usdJpyRateStatus.textContent = "USD/JPYレートを取得しています。";

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("rate request failed");
    }

    const data = await response.json();
    const rate = Number(data?.rates?.JPY);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("JPY rate is missing");
    }

    usdJpyRateInput.value = formatInputNumber(rate, 3);
    usdJpyRateStatus.textContent = `自動取得済み: USD/JPY ${formatNumber(rate, 3)}（${formatRateUpdateTime(data)}）`;
    calculate();
  } catch (error) {
    usdJpyRateStatus.textContent = `${previousStatus} 自動取得に失敗したため、現在の手入力値を使っています。`;
  } finally {
    fetchUsdJpyRateButton.disabled = false;
    fetchUsdJpyRateButton.textContent = "自動取得";
  }
}

function formatRateUpdateTime(data) {
  if (data?.time_last_update_utc) {
    return `更新: ${data.time_last_update_utc}`;
  }

  if (data?.time_last_update_unix) {
    return `更新: ${new Date(data.time_last_update_unix * 1000).toLocaleString("ja-JP")}`;
  }

  return "更新時刻不明";
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
  const targetProfit = getTargetProfitInQuoteCurrency();
  const pipValue = lots * getPipValue();
  const requiredPips = pipValue === 0 ? 0 : targetProfit / pipValue;

  pipsResult.querySelector("strong").textContent = `${formatNumber(requiredPips, 2)} pips`;
  pipsDetail.textContent = getRequiredPipsDetail(requiredPips, targetProfit);
}

function getTargetProfitInQuoteCurrency() {
  const targetProfit = Number.parseFloat(targetProfitInput.value) || 0;
  return convertToQuoteCurrency(targetProfit, targetCurrency);
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
  if (lastGoldMoveInput === "pips") {
    return Number.parseFloat(pipsMoveInput.value) || 0;
  }

  const priceMove = Number.parseFloat(goldPriceMoveInput.value) || 0;
  return instruments.XAUUSD.pipsFromPriceMove(priceMove);
}

function syncGoldMoveInputs() {
  goldPriceMoveField.hidden = false;

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
  const priceMove = instruments.XAUUSD.priceMoveFromPips(pips);
  return `${formatNumber(pips, 2)}pips = ${formatNumber(priceMove, 2)}ドルの値幅。${formatNumber(priceMove, 2)}ドル × ${formatNumber(lots, 2)}ロット × ${getGoldProfile().contractSize}oz = ${formatCurrency(profit)}。${convertedProfit}`;
}

function getProfitConversionDetail(profit) {
  const quoteCurrency = getQuoteCurrency();
  if (profitCurrency === quoteCurrency) {
    return "";
  }

  return ` 円表示: ${formatCurrency(profit, "USD")} × USD/JPY ${formatNumber(getRate(), 3)} = ${formatCurrency(convertFromQuoteCurrency(profit, "JPY"), "JPY")}。`;
}

function getRequiredPipsDetail(requiredPips, targetProfit) {
  const targetDetail = getTargetProfitConversionDetail(targetProfit);
  const priceMove = instruments.XAUUSD.priceMoveFromPips(requiredPips);
  return `${targetDetail}${formatNumber(requiredPips, 2)}pips = ${formatNumber(priceMove, 2)}ドルの値幅です。GOLD/USDは1ドルの値幅を10pipsとして換算します。`;
}

function getTargetProfitConversionDetail(targetProfit) {
  const quoteCurrency = getQuoteCurrency();
  if (targetCurrency === quoteCurrency) {
    return `目標利益 ${formatCurrency(targetProfit, quoteCurrency)}。`;
  }

  const inputTargetProfit = Number.parseFloat(targetProfitInput.value) || 0;
  return `目標利益 ${formatCurrency(inputTargetProfit, targetCurrency)} ÷ USD/JPY ${formatNumber(getRate(), 3)} = ${formatCurrency(targetProfit, quoteCurrency)}。`;
}

function updateInstrumentUi() {
  const selectedMode = document.querySelector(".mode-tab.active").dataset.mode;
  const instrument = getInstrument();
  const needsProfitRate = selectedMode === "profit" && profitCurrency !== instrument.quoteCurrency;
  const needsTargetRate = selectedMode === "pips" && targetCurrency !== instrument.quoteCurrency;
  const needsRate = needsProfitRate || needsTargetRate;
  usdJpyRateField.hidden = !needsRate;
  if (needsTargetRate) {
    usdJpyRateHint.textContent = "入力した目標利益を、このUSD/JPYレートで計算通貨に換算します。";
  } else if (needsProfitRate) {
    usdJpyRateHint.textContent = "表示通貨が計算通貨と異なるため、このUSD/JPYレートで換算します。";
  } else {
    usdJpyRateHint.textContent = "USD/JPYレートはドル円換算が必要な場合に使います。";
  }
  goldAccountField.hidden = false;
  goldPriceMoveField.hidden = false;
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

function formatProfit(profit) {
  return formatCurrency(convertFromQuoteCurrency(profit, profitCurrency), profitCurrency);
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
fetchUsdJpyRate();
