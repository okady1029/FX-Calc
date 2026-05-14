const instruments = {
  EURUSD: {
    label: "EUR/USD",
    contractSize: 100000,
    pipSize: 0.0001,
    quoteCurrency: "USD",
    pipValuePerLot(rate) {
      return this.contractSize * this.pipSize;
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
    contractSize: 100,
    pipSize: 0.01,
    quoteCurrency: "USD",
    pipValuePerLot(rate) {
      return this.contractSize * this.pipSize;
    },
    details(rate) {
      return ["1ロット = 100トロイオンス", "1pip = $0.01", "1ロット・1pip = $1.00"];
    },
  },
};

const symbolSelect = document.querySelector("#symbol");
const usdJpyRateField = document.querySelector("#usdJpyRateField");
const usdJpyRateInput = document.querySelector("#usdJpyRate");
const modeTabs = document.querySelectorAll(".mode-tab");
const panels = document.querySelectorAll(".calc-form");
const profitResult = document.querySelector("#profitResult");
const pipsResult = document.querySelector("#pipsResult");
const instrumentDetails = document.querySelector("#instrumentDetails");

const inputs = document.querySelectorAll("input, select");
inputs.forEach((input) => input.addEventListener("input", calculate));

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

function getRate() {
  const rate = Number.parseFloat(usdJpyRateInput.value);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function getPipValue() {
  const instrument = instruments[symbolSelect.value];
  return instrument.pipValuePerLot(getRate());
}

function calculateProfit() {
  const lots = Number.parseFloat(document.querySelector("#lotsProfit").value) || 0;
  const pips = Number.parseFloat(document.querySelector("#pipsMove").value) || 0;
  const profit = lots * pips * getPipValue();

  profitResult.querySelector("strong").textContent = formatCurrency(profit);
}

function calculateRequiredPips() {
  const lots = Number.parseFloat(document.querySelector("#lotsPips").value) || 0;
  const targetProfit = Number.parseFloat(document.querySelector("#targetProfit").value) || 0;
  const pipValue = lots * getPipValue();
  const requiredPips = pipValue === 0 ? 0 : targetProfit / pipValue;

  pipsResult.querySelector("strong").textContent = `${formatNumber(requiredPips, 2)} pips`;
}

function updateInstrumentUi() {
  const instrument = instruments[symbolSelect.value];
  const needsRate = symbolSelect.value === "USDJPY";
  usdJpyRateField.hidden = !needsRate;
  instrumentDetails.innerHTML = instrument
    .details(getRate())
    .map((detail) => `<li>${detail}</li>`)
    .join("");
}

function calculate() {
  updateInstrumentUi();
  calculateProfit();
  calculateRequiredPips();
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
