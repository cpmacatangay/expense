const screenMeta = {
  home: { title: "Hi, CP", sub: "Salo Crew · 4 at the table", main: true },
  ledger: { title: "Ledger", sub: "Balances carry over until you settle.", main: true },
  activity: { title: "Activity", sub: "Everything that changed in Salo Crew.", main: true },
  settings: { title: "Settings", sub: "Salo Crew.", main: true },
  welcome: { title: "Welcome", sub: "Shared meals, settled simply.", detail: true, back: "home" },
  empty: { title: "Your first outing", sub: "Salo Crew is ready.", detail: true, back: "home" },
  outing: { title: "McDo Il Corso", sub: "Nov 7, 2026 · Paid by Mai · Finalized", detail: true, back: "home" },
  new: { title: "New outing", sub: "Salo Crew · Friday, Nov 7", detail: true, back: "home" },
  draft: { title: "Jollibee Uptown", sub: "Private draft · Kent · Nov 9", detail: true, back: "home" }
};

const app = document.getElementById("app");
const appHead = app.querySelector(".app-head");
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
let toastHideTimer;
let lastTrigger = null;

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
  document.body.classList.toggle("onboarding", currentScreen === "welcome");

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
const confirmBackdrop = document.getElementById("confirmBackdrop");
const recordBackdrop = document.getElementById("recordBackdrop");
const membersBackdrop = document.getElementById("membersBackdrop");
const studentsBackdrop = document.getElementById("studentsBackdrop");
const itemBackdrop = document.getElementById("itemBackdrop");
const reviewBackdrop = document.getElementById("reviewBackdrop");
const recapBackdrop = document.getElementById("recapBackdrop");
const exportBackdrop = document.getElementById("exportBackdrop");
const discardBackdrop = document.getElementById("discardBackdrop");
const backdrops = {
  pay: payBackdrop,
  group: groupBackdrop,
  confirm: confirmBackdrop,
  record: recordBackdrop,
  members: membersBackdrop,
  students: studentsBackdrop,
  item: itemBackdrop,
  review: reviewBackdrop,
  recap: recapBackdrop,
  export: exportBackdrop,
  discard: discardBackdrop
};
const payTitle = document.getElementById("payTitle");
const paySub = document.getElementById("paySub");
const payQr = document.getElementById("payQr");
const qrLabel = document.getElementById("qrLabel");
const payNote = payBackdrop.querySelector(".sheet-note");
const recordPayment = document.getElementById("recordPayment");
let currentPayee = "Mai";
let currentAmount = "334.00";
let currentLabel = "GCash";
let currentConfirmation = { payer: "Kent", amount: "485.00" };

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

function openBackdrop(backdrop) {
  window.clearTimeout(backdrop.hideTimer);
  lastTrigger = document.activeElement;
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  appHead.inert = true;
  screenHost.inert = true;
  tabbar.inert = true;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => backdrop.classList.add("is-open"));
  const sheet = backdrop.querySelector(".sheet");
  if (sheet) {
    window.setTimeout(() => sheet.focus({ preventScroll: true }), 60);
  }
}

function openPay(button) {
  const payee = button.dataset.payee || "Mai";
  const amount = button.dataset.amount || "0.00";
  const label = button.dataset.label || "GCash";
  const own = button.dataset.own === "true";
  const canRecord = button.dataset.canRecord === "true";
  currentPayee = payee;
  currentAmount = amount;
  currentLabel = label;

  if (own) {
    payTitle.textContent = "Your payment QR";
    paySub.textContent = `${label} · private to Salo Crew`;
    payNote.textContent =
      "This is the QR members see when they owe you. Only Salo Crew can see it.";
    recordPayment.hidden = true;
    document.getElementById("replaceQr").hidden = false;
    document.getElementById("removeQr").hidden = false;
  } else if (canRecord) {
    payTitle.textContent = `Pay ${payee}`;
    paySub.textContent = `₱${amount} · ${label}`;
    payNote.textContent =
      "Only Salo Crew can see this QR. Scan it with your GCash, Maya, or bank app.";
    recordPayment.hidden = false;
    recordPayment.textContent = `Record ₱${amount}`;
    document.getElementById("replaceQr").hidden = true;
    document.getElementById("removeQr").hidden = true;
  } else {
    payTitle.textContent = `${payee}'s payment QR`;
    paySub.textContent = `₱${amount} · ${label}`;
    payNote.textContent = `Only Salo Crew can see this QR. It belongs to ${payee}.`;
    recordPayment.hidden = true;
    document.getElementById("replaceQr").hidden = true;
    document.getElementById("removeQr").hidden = true;
  }

  qrLabel.textContent = label;
  payQr.setAttribute("aria-label", `Demo payment QR for ${payee}`);
  drawQr(payQr, `${payee}-${label}`);
  drawQrThumb();

  openBackdrop(payBackdrop);
}

function openConfirm(button) {
  currentConfirmation = {
    payer: button.dataset.payer || "Kent",
    amount: button.dataset.amount || "0.00"
  };
  const label = button.dataset.label || "Maya";
  const when = button.dataset.when || "just now";

  document.getElementById("confirmTitle").textContent = `Confirm ${currentConfirmation.payer}'s payment`;
  document.getElementById("confirmSub").textContent = `₱${currentConfirmation.amount} · ${label} · recorded ${when}`;
  document.getElementById("confirmPayer").textContent = currentConfirmation.payer;
  document.getElementById("confirmAmount").textContent = `₱${currentConfirmation.amount}`;
  document.getElementById("confirmSettlement").textContent = `Confirm ₱${currentConfirmation.amount}`;
  document.getElementById("confirmNote").value = "";

  openBackdrop(confirmBackdrop);
}

function openRecord(payee = currentPayee, amount = currentAmount, label = currentLabel) {
  currentPayee = payee;
  currentAmount = amount;
  currentLabel = label;
  document.getElementById("recordPayee").value = payee;
  document.getElementById("recordAmount").value = amount;
  document.getElementById("recordDate").value = "Nov 9, 2026";
  document.getElementById("recordNote").value = "";
  document.getElementById("recordSettlement").textContent = `Record ₱${amount}`;
  document.getElementById("recordSub").textContent = `${label} · only the payer records`;
  openBackdrop(recordBackdrop);
}

function parseMoney(value) {
  const number = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function peso(value) {
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const newItemsList = document.getElementById("newItemsList");
let editingItem = null;

function recalcNewOuting() {
  const rows = [...newItemsList.querySelectorAll(".item")];
  const total = rows.reduce((sum, row) => sum + parseMoney(row.querySelector(".amount").textContent), 0);
  document.getElementById("newTotal").textContent = peso(total);
  document.getElementById("newItemCount").textContent =
    `Following ${rows.length} item${rows.length === 1 ? "" : "s"}`;
  return { total, count: rows.length };
}

function updateItemAmount() {
  const qty = Math.max(0, Number(document.getElementById("itemQty").value) || 0);
  const price = Math.max(0, parseMoney(document.getElementById("itemPrice").value));
  const amount = qty * price;
  document.getElementById("itemAmount").textContent = peso(amount);
  document.getElementById("saveItem").textContent = editingItem
    ? `Save ${peso(amount)}`
    : `Add ${peso(amount)} to the outing`;
  return { qty, price, amount };
}

function openItem(row = null) {
  editingItem = row;
  document.getElementById("itemTitle").textContent = row ? "Edit item" : "Add item";
  document.getElementById("itemSub").textContent = row
    ? "Changes update the item sum."
    : "Split across the people who share it.";

  const name = row ? row.querySelector(".row-title").textContent : "";
  const sub = row ? row.querySelector(".row-sub").textContent : "";
  const match = sub.match(/([\d.]+)\s*×\s*₱([\d,.]+)/);
  document.getElementById("itemName").value = name;
  document.getElementById("itemQty").value = match ? match[1] : "1";
  document.getElementById("itemPrice").value = match ? match[2].replace(/,/g, "") : "";
  document.querySelectorAll("#itemPeople .person").forEach((person) => {
    person.classList.add("is-on");
    person.setAttribute("aria-pressed", "true");
  });
  updateItemAmount();
  openBackdrop(itemBackdrop);
}

function saveItem() {
  const name = document.getElementById("itemName").value.trim() || "Item";
  const { qty, price, amount } = updateItemAmount();
  if (amount <= 0) {
    showToast("Add a quantity and unit price.");
    return;
  }

  if (editingItem) {
    editingItem.querySelector(".row-title").textContent = name;
    editingItem.querySelector(".row-sub").textContent = `${qty} × ${peso(price)} · shared`;
    editingItem.querySelector(".amount").textContent = peso(amount);
  } else {
    const row = document.createElement("button");
    row.className = "row item";
    row.type = "button";
    row.dataset.item = "";
    row.innerHTML =
      '<span class="row-main"><span class="row-title"></span><span class="row-sub"></span></span><span class="amount"></span>';
    row.querySelector(".row-title").textContent = name;
    row.querySelector(".row-sub").textContent = `${qty} × ${peso(price)} · shared`;
    row.querySelector(".amount").textContent = peso(amount);
    newItemsList.appendChild(row);
  }

  closeBackdrop(itemBackdrop);
  recalcNewOuting();
  showToast(editingItem ? "Item updated." : "Item added.");
  editingItem = null;
}

function openReview() {
  const { total, count } = recalcNewOuting();
  document.getElementById("reviewTotal").textContent = peso(total);
  document.getElementById("reviewMeta").textContent =
    `${count} item${count === 1 ? "" : "s"} · 4 adults · 2 students`;
  openBackdrop(reviewBackdrop);
}

const offlineBanner = document.getElementById("offlineBanner");
const forcedOffline = new URLSearchParams(window.location.search).get("offline") === "1";

function isOffline() {
  return forcedOffline || !navigator.onLine;
}

function syncConnectivity() {
  const offline = isOffline();
  document.body.classList.toggle("is-offline", offline);
  offlineBanner.hidden = !offline;
}

function blockOffline() {
  if (!isOffline()) return false;
  showToast("You're offline. This shared change needs a connection.");
  return true;
}

function showOnboardStep(step) {
  document.querySelectorAll("[data-onboard-step]").forEach((section) => {
    section.hidden = Number(section.dataset.onboardStep) !== step;
  });
}

window.addEventListener("online", syncConnectivity);
window.addEventListener("offline", syncConnectivity);

function closeBackdrop(backdrop, immediate = false) {
  backdrop.classList.remove("is-open");
  document.body.style.overflow = "";
  appHead.inert = false;
  screenHost.inert = false;
  tabbar.inert = false;
  document.body.classList.remove("sheet-open");
  window.clearTimeout(backdrop.hideTimer);
  if (immediate) {
    backdrop.hidden = true;
  } else {
    backdrop.hideTimer = window.setTimeout(() => {
      backdrop.hidden = true;
    }, 200);
  }
  if (lastTrigger && document.contains(lastTrigger)) {
    lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }
}

document.querySelectorAll('[data-modal="pay"]').forEach((button) => {
  button.addEventListener("click", () => openPay(button));
});

document.querySelectorAll('[data-modal="confirm"]').forEach((button) => {
  button.addEventListener("click", () => openConfirm(button));
});

document.querySelectorAll('[data-modal="record"]').forEach((button) => {
  button.addEventListener("click", () => {
    openRecord(button.dataset.payee, button.dataset.amount, button.dataset.label);
  });
});

document.querySelectorAll('[data-modal="group"]').forEach((button) => {
  button.addEventListener("click", () => openBackdrop(groupBackdrop));
});

document.querySelectorAll('[data-modal="members"]').forEach((button) => {
  button.addEventListener("click", () => openBackdrop(membersBackdrop));
});

document.querySelectorAll('[data-modal="students"]').forEach((button) => {
  button.addEventListener("click", () => openBackdrop(studentsBackdrop));
});

document.querySelectorAll('[data-modal="item"]').forEach((button) => {
  button.addEventListener("click", () => openItem());
});

document.querySelectorAll('[data-modal="review"]').forEach((button) => {
  button.addEventListener("click", openReview);
});

document.querySelectorAll('[data-modal="recap"]').forEach((button) => {
  button.addEventListener("click", () => openBackdrop(recapBackdrop));
});

document.querySelectorAll('[data-modal="export"]').forEach((button) => {
  button.addEventListener("click", () => openBackdrop(exportBackdrop));
});

document.querySelectorAll('[data-modal="discard"]').forEach((button) => {
  button.addEventListener("click", () => openBackdrop(discardBackdrop));
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const backdrop = backdrops[button.dataset.close];
    if (backdrop) closeBackdrop(backdrop);
  });
});

Object.values(backdrops).forEach((backdrop) => {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeBackdrop(backdrop);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  Object.values(backdrops).forEach((backdrop) => {
    if (!backdrop.hidden) closeBackdrop(backdrop);
  });
});

function showToast(message) {
  window.clearTimeout(toastTimer);
  window.clearTimeout(toastHideTimer);
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("is-open"));
  toastTimer = window.setTimeout(hideToast, 2400);
}

function hideToast() {
  toast.classList.remove("is-open");
  window.clearTimeout(toastHideTimer);
  toastHideTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 160);
}

recordPayment.addEventListener("click", () => {
  closeBackdrop(payBackdrop, true);
  openRecord(currentPayee, currentAmount, currentLabel);
});

document.getElementById("confirmSettlement").addEventListener("click", () => {
  if (blockOffline()) return;
  closeBackdrop(confirmBackdrop);
  showToast(`Confirmed. ₱${currentConfirmation.amount} added to your balance.`);
});

document.getElementById("declineSettlement").addEventListener("click", () => {
  if (blockOffline()) return;
  const note = document.getElementById("confirmNote");
  if (!note.value.trim()) {
    showToast("Add a note before declining.");
    note.focus();
    return;
  }
  closeBackdrop(confirmBackdrop);
  showToast(`Declined. ${currentConfirmation.payer} will see your note.`);
});

document.getElementById("recordSettlement").addEventListener("click", () => {
  if (blockOffline()) return;
  const payee = document.getElementById("recordPayee").value.trim() || currentPayee;
  const amount = document.getElementById("recordAmount").value.trim() || currentAmount;
  closeBackdrop(recordBackdrop);
  showToast(`Recorded ₱${amount} to ${payee}. Waiting for confirmation.`);
});

document.getElementById("inviteAdult").addEventListener("click", () => {
  showToast("Invite link copied. Share it with one adult.");
});

document.getElementById("addStudent").addEventListener("click", () => {
  showToast("Student added. No account needed.");
});

document.getElementById("itemQty").addEventListener("input", updateItemAmount);
document.getElementById("itemPrice").addEventListener("input", updateItemAmount);
document.getElementById("saveItem").addEventListener("click", saveItem);

newItemsList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-item]");
  if (row) openItem(row);
});

document.getElementById("finalizeOuting").addEventListener("click", () => {
  if (blockOffline()) return;
  closeBackdrop(reviewBackdrop);
  showScreen("outing");
  showToast("Finalized. Shares are now fixed.");
});

document.querySelectorAll("[data-onboard-next]").forEach((button) => {
  button.addEventListener("click", () => {
    const current = [...document.querySelectorAll("[data-onboard-step]")].find((section) => !section.hidden);
    const step = Number(current?.dataset.onboardStep || 1);
    if (step < 3) showOnboardStep(step + 1);
  });
});

document.querySelectorAll("[data-onboard-back]").forEach((button) => {
  button.addEventListener("click", () => showOnboardStep(1));
});

document.querySelectorAll("[data-onboard-done]").forEach((button) => {
  button.addEventListener("click", () => {
    showOnboardStep(1);
    showScreen("home");
    showToast("Salo Crew is ready.");
  });
});

document.getElementById("signOut").addEventListener("click", () => {
  showOnboardStep(1);
  showScreen("welcome");
});

document.getElementById("replaceQr").addEventListener("click", () => {
  showToast("QR replaced. Only Salo Crew can see the new code.");
});

document.getElementById("removeQr").addEventListener("click", () => {
  showToast("QR removed. Members will see 'Ask CP for a payment QR'.");
});

document.getElementById("copyRecap").addEventListener("click", () => {
  showToast("Recap copied. Paste it into your group chat.");
});

document.getElementById("saveRecap").addEventListener("click", () => {
  showToast("Recap image saved to Photos.");
});

document.getElementById("prepareExport").addEventListener("click", () => {
  showToast("Export ready. Check your downloads.");
});

document.getElementById("confirmDiscard").addEventListener("click", () => {
  closeBackdrop(discardBackdrop);
  showScreen("home");
  showToast("Draft discarded.");
});

document.getElementById("publishDraft").addEventListener("click", () => {
  showToast("Published. Now visible to Salo Crew.");
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
syncConnectivity();
showOnboardStep(1);
recalcNewOuting();
drawQrThumb();
showScreen(initialScreen && screenMeta[initialScreen] ? initialScreen : "home");

const initialSheet = new URLSearchParams(window.location.search).get("sheet");
if (initialSheet === "pay") {
  const payButton = document.querySelector('[data-modal="pay"][data-payee="Mai"]');
  if (payButton) openPay(payButton);
}
