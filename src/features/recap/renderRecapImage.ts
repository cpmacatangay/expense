import type { Recap } from "./buildRecap";

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 72;
const FONT = '"Geist", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"Geist Mono", ui-monospace, "SFMono-Regular", monospace';

const ink = "#171512";
const muted = "#625E55";
const green = "#1F5C45";
const greenSoft = "#DCEBE1";
const ground = "#F2F1ED";
const card = "#FBFAF7";
const line = "#D9D5CC";

let symbolLoader: Promise<HTMLImageElement | null> | null = null;

function loadSymbol(): Promise<HTMLImageElement | null> {
  if (!symbolLoader) {
    symbolLoader = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = "/brand/salo-symbol-mono-1f5c45.svg";
    });
  }
  return symbolLoader;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function setFont(context: CanvasRenderingContext2D, size: number, weight: number, family = FONT) {
  context.font = `${weight} ${size}px ${family}`;
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (context.measureText(value).width <= maxWidth) return value;

  let trimmed = value;
  while (trimmed.length > 1 && context.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function text(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  align: CanvasTextAlign = "left",
  family = FONT
) {
  setFont(context, size, weight, family);
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  context.fillText(value, x, y);
}

export async function renderRecapImage(recap: Recap): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Recap images need a browser");
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw a recap image");

  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load("600 46px Geist"),
      document.fonts.load('500 84px "Geist Mono"')
    ]);
  } catch {
    // The system fallback keeps the recap readable if the faces are unavailable.
  }

  const symbol = await loadSymbol();

  context.fillStyle = ground;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  if (symbol) {
    context.drawImage(symbol, MARGIN, 52, 92, 92);
  } else {
    context.fillStyle = greenSoft;
    context.beginPath();
    context.arc(MARGIN + 46, 98, 46, 0, Math.PI * 2);
    context.fill();
    text(context, "S", MARGIN + 46, 122, 56, 700, green, "center");
  }

  text(context, "Salo", MARGIN + 112, 120, 42, 700, ink);
  text(context, "Shared meal", WIDTH - MARGIN, 120, 20, 400, muted, "right");

  setFont(context, 46, 600);
  text(context, fitText(context, recap.groupName, WIDTH - MARGIN * 2), MARGIN, 224, 46, 600, ink);

  const when = recap.place ? `${recap.dateLabel} · ${recap.place}` : recap.dateLabel;
  setFont(context, 26, 400);
  text(context, fitText(context, when, WIDTH - MARGIN * 2), MARGIN, 268, 26, 400, muted);

  roundRect(context, MARGIN, 320, WIDTH - MARGIN * 2, 236, 32);
  context.fillStyle = greenSoft;
  context.fill();

  text(context, "Total", MARGIN + 40, 382, 24, 600, green);
  setFont(context, 84, 700);
  text(
    context,
    fitText(context, recap.totalLabel, WIDTH - MARGIN * 2 - 80),
    MARGIN + 40,
    496,
    84,
    700,
    green,
    "left",
    MONO
  );

  const cardTop = 620;
  const visibleShares = recap.shares.slice(0, 12);
  const twoColumns = visibleShares.length > 6;
  const columnWidth = twoColumns ? (WIDTH - MARGIN * 2 - 64 - 36) / 2 : WIDTH - MARGIN * 2 - 64;
  const rowsPerColumn = twoColumns ? 6 : Math.max(1, visibleShares.length);
  const rowHeight = twoColumns ? 44 : 48;
  const cardHeight = Math.max(260, 104 + Math.max(0, rowsPerColumn - 1) * rowHeight + 24);

  roundRect(context, MARGIN, cardTop, WIDTH - MARGIN * 2, cardHeight, 28);
  context.fillStyle = card;
  context.fill();
  context.strokeStyle = line;
  context.lineWidth = 1;
  context.stroke();

  text(context, "Shares", MARGIN + 32, 670, 24, 600, muted);

  const firstBaseline = cardTop + 104;

  visibleShares.forEach((share, index) => {
    const column = twoColumns && index >= 6 ? 1 : 0;
    const row = twoColumns ? index % 6 : index;
    const x = MARGIN + 32 + column * (columnWidth + 36);
    const amountX = x + columnWidth;
    const y = firstBaseline + row * rowHeight;

    if (row > 0) {
      context.strokeStyle = line;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y - 30);
      context.lineTo(amountX, y - 30);
      context.stroke();
    }

    text(context, fitText(context, share.name, columnWidth - 150), x, y, 28, 400, ink);
    text(context, share.totalLabel, amountX, y, 28, 600, ink, "right", MONO);
  });

  const cust = cardTop + cardHeight;
  const paidBy = recap.payerName ? `Paid by ${recap.payerName}` : "No payer recorded";
  const payerY = Math.max(cust + 90, 1040);
  text(context, paidBy, MARGIN, payerY, 28, 500, ink);

  const settleY = payerY + 56;
  text(context, "Settle up", MARGIN, settleY, 24, 600, muted);

  const transfersStart = settleY + 48;

  if (recap.transfers.length === 0) {
    text(context, "Everyone is square.", MARGIN, transfersStart, 28, 500, ink);
  } else {
    const visibleTransfers = recap.transfers.slice(0, 4);
    visibleTransfers.forEach((transfer, index) => {
      const y = transfersStart + index * 36;
      text(context, `${transfer.fromName} pays ${transfer.toName}`, MARGIN, y, 28, 400, ink);
      text(context, transfer.amountLabel, WIDTH - MARGIN, y, 28, 600, ink, "right", MONO);
    });

    if (recap.transfers.length > visibleTransfers.length) {
      text(
        context,
        `and ${recap.transfers.length - visibleTransfers.length} more`,
        MARGIN,
        transfersStart + visibleTransfers.length * 36,
        24,
        400,
        muted
      );
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the recap image"));
    }, "image/png");
  });
}
