const screenMeta = {
  home: { title: "Hi, CP", sub: "Salo Crew · 4 at the table", main: true },
  ledger: { title: "Ledger", sub: "Balances carry over until you settle.", main: true },
  activity: { title: "Activity", sub: "Everything that changed in Salo Crew.", main: true },
  settings: { title: "Settings", sub: "Salo Crew.", main: true },
  outing: { title: "McDo Il Corso", sub: "Nov 7, 2026 · Paid by Mai · Finalized", detail: true, back: "home" },
  new: { title: "New outing", sub: "Salo Crew · Friday, Nov 7", detail: true, back: "home" },
  draft: { title: "Jollibee Uptown", sub: "Private draft · Kent · Nov 9", detail: true, back: "home" }
};

const app = document.getElementById("app");
const screenHost = document.getElementById("screenHost");
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const topline = document.getElementById("topline");
const detailTopline = document.getElementById("detailTopline");
const tabbar = document.getElementById("tabbar");
const backButton = detailTopline.querySelector(".back");
const toast = document.getElementById("toast");
let currentScreen = "home";
let toastTimer;

function showScreen(name) {
  const meta = screenMeta[name] || screenMeta.home;
  currentScreen = name in screenMeta ? name : "home";

  document.querySelectorAll("[data-screen]").forEach((screen) => {
    screen.hidden = screen.dataset.screen !== currentScreen;
  });

  pageTitle.textContent = meta.title;
  pageSub.textContent = meta.sub;
  const isDetail = Boolean(meta.detail);
  topline.hidden = isDetail;
  detailTopline.hidden = !isDetail;
  backButton.dataset.back = meta.back || "home";
  tabbar.hidden = isDetail;
  document.body.classList.toggle("detail", isDetail);
  document.body.classList.toggle("screen-new", currentScreen === "new");

  document.querySelectorAll(".tab-item").forEach((item) => {
    const active = item.dataset.target === currentScreen;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-current", active ? "page" : "false");
  });

  screenHost.scrollTop = 0;
}

document.querySelectorAll("[data-target]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.target));
});

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.open));
});

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.back || "home"));
});

const payBackdrop = document.getElementById("payBackdrop");
const groupBackdrop = document.getElementById("groupBackdrop");
const payTitle = document.getElementById("payTitle");
const paySub = document.getElementById("paySub");
const payQr = document.getElementById("payQr");
const qrLabel = document.getElementById("qrLabel");
const payNote = payBackdrop.querySelector(".sheet-note");
const recordPayment = document.getElementById("recordPayment");
let currentPayee = "Mai";

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function drawQr(svg, seedText) {
  const size = 25;
  const seed = hashSeed(seedText);
  const random = mulberry32(seed);
  const ns = "http://www.w3.org/2000/svg";
  svg.replaceChildren();

  function module(x, y, fill) {
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", 1);
    rect.setAttribute("height", 1);
    rect.setAttribute("fill", fill);
    svg.appendChild(rect);
  }

  function finder(originX, originY) {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (edge || core) module(originX + x, originY + y, "#15221c");
      }
    }
    for (let y = 1; y < 6; y += 1) {
      for (let x = 1; x < 6; x += 1) {
        const edge = x === 0 || y === 0 || x === 5 || y === 5;
        if (!edge) module(originX + x, originY + y, "#fffdf8");
      }
    }
  }

  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);

  for (let index = 0; index < size; index += 1) {
    if (index % 2 === 0) {
      if (index > 7 && index < size - 7) {
        module(index, 6, "#15221c");
        module(6, index, "#15221c");
      }
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinder =
        (x < 8 && y < 8) ||
        (x >= size - 8 && y < 8) ||
        (x < 8 && y >= size - 8);
      const timing = x === 6 || y === 6;
      if (inFinder || timing) continue;
      if (random() > 0.53) module(x, y, "#15221c");
    }
  }
}

function drawQrThumb() {
  const thumb = document.getElementById("qrThumb");
  if (!thumb) return;
  thumb.replaceChildren();
  const thumbSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  thumbSvg.setAttribute("viewBox", "0 0 25 25");
  thumbSvg.setAttribute("aria-hidden", "true");
  thumb.appendChild(thumbSvg);
  drawQr(thumbSvg, "CP-GCash");
}

function openPay(button) {
  const payee = button.dataset.payee || "Mai";
  const amount = button.dataset.amount || "0.00";
  const label = button.dataset.label || "GCash";
  const own = button.dataset.own === "true";
  currentPayee = payee;

  if (own) {
    payTitle.textContent = "Your payment QR";
    paySub.textContent = `${label} · private to Salo Crew`;
    payNote.textContent =
      "This is the QR members see when they owe you. Only Salo Crew can see it.";
    recordPayment.hidden = true;
  } else {
    payTitle.textContent = `Pay ${payee}`;
    paySub.textContent = `₱${amount} · ${label}`;
    payNote.textContent =
      "Only Salo Crew can see this QR. Scan it with your GCash, Maya, or bank app.";
    recordPayment.hidden = false;
  }

  qrLabel.textContent = label;
  payQr.setAttribute("aria-label", `Demo payment QR for ${payee}`);
  drawQr(payQr, `${payee}-${label}`);
  drawQrThumb();

  payBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeBackdrop(backdrop) {
  backdrop.hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll('[data-modal="pay"]').forEach((button) => {
  button.addEventListener("click", () => openPay(button));
});

document.querySelectorAll('[data-modal="group"]').forEach((button) => {
  button.addEventListener("click", () => {
    groupBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.close;
    closeBackdrop(target === "pay" ? payBackdrop : groupBackdrop);
  });
});

[payBackdrop, groupBackdrop].forEach((backdrop) => {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeBackdrop(backdrop);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!payBackdrop.hidden) closeBackdrop(payBackdrop);
  if (!groupBackdrop.hidden) closeBackdrop(groupBackdrop);
});

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

recordPayment.addEventListener("click", () => {
  closeBackdrop(payBackdrop);
  showToast(`Recorded — waiting for ${currentPayee} to confirm.`);
});

document.getElementById("reviewButton").addEventListener("click", () => {
  showToast("Ready to finalize. Only the owner can finalize.");
});

document.getElementById("publishDraft").addEventListener("click", () => {
  showToast("Published — now visible to Salo Crew.");
});

document.querySelectorAll(".tab, .person, .segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.parentElement;
    if (group.classList.contains("segmented")) {
      group.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      return;
    }
    if (group.classList.contains("tabs")) {
      group.querySelectorAll(".tab").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-selected", String(item === button));
      });
      return;
    }
    const pressed = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!pressed));
    button.classList.toggle("is-on", !pressed);
  });
});

const initialScreen = new URLSearchParams(window.location.search).get("screen");
drawQrThumb();
showScreen(initialScreen && screenMeta[initialScreen] ? initialScreen : "home");

const initialSheet = new URLSearchParams(window.location.search).get("sheet");
if (initialSheet === "pay") {
  const payButton = document.querySelector('[data-modal="pay"][data-payee="Mai"]');
  if (payButton) openPay(payButton);
}
