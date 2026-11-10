import { settleTransfers } from "@/domain/ledger/computeLedger";
import { formatPeso } from "@/domain/money/format";
import type { Adult } from "@/features/groups/types";
import type { Outing } from "@/features/outings/types";
import { formatDate } from "@/lib/dates";

export type RecapShare = {
  adultId: string;
  totalCentavos: number;
};

export type RecapInput = {
  groupName: string;
  outing: Outing;
  shares: RecapShare[];
  adults: Adult[];
};

export type Recap = {
  groupName: string;
  dateLabel: string;
  place: string | null;
  title: string;
  totalCentavos: number;
  totalLabel: string;
  payerName: string | null;
  shares: { name: string; totalCentavos: number; totalLabel: string }[];
  transfers: {
    fromName: string;
    toName: string;
    amountCentavos: number;
    amountLabel: string;
  }[];
  text: string;
};

export function buildRecap(input: RecapInput): Recap {
  const adultById = new Map(input.adults.map((adult) => [adult.id, adult]));
  const nameOf = (adultId: string) =>
    adultById.get(adultId)?.display_name ?? "Removed adult";

  const dateLabel = formatDate(input.outing.date);
  const place = input.outing.place;
  const totalCentavos = input.outing.total_centavos;
  const payerName = input.outing.payer_adult_id
    ? nameOf(input.outing.payer_adult_id)
    : null;

  const shares = input.shares.map((share) => ({
    name: nameOf(share.adultId),
    totalCentavos: share.totalCentavos,
    totalLabel: formatPeso(share.totalCentavos)
  }));

  const net: Record<string, number> = {};
  for (const share of input.shares) {
    net[share.adultId] = (net[share.adultId] ?? 0) - share.totalCentavos;
  }
  if (input.outing.payer_adult_id) {
    net[input.outing.payer_adult_id] =
      (net[input.outing.payer_adult_id] ?? 0) + totalCentavos;
  }

  const transfers = settleTransfers(net).map((transfer) => ({
    fromName: nameOf(transfer.fromAdultId),
    toName: nameOf(transfer.toAdultId),
    amountCentavos: transfer.amountCentavos,
    amountLabel: formatPeso(transfer.amountCentavos)
  }));

  const when = place ? `${dateLabel} · ${place}` : dateLabel;
  const lines = [
    `Salo · ${input.groupName}`,
    when,
    `Total ${formatPeso(totalCentavos)}`,
    "",
    "Shares",
    ...shares.map((share) => `${share.name} — ${share.totalLabel}`),
    "",
    payerName ? `Paid by ${payerName}` : "No payer recorded",
    "",
    "Settle up",
    ...(transfers.length > 0
      ? transfers.map(
          (transfer) => `${transfer.fromName} pays ${transfer.toName} ${transfer.amountLabel}`
        )
      : ["Everyone is square."])
  ];

  return {
    groupName: input.groupName,
    dateLabel,
    place,
    title: place ? `${place} · ${dateLabel}` : dateLabel,
    totalCentavos,
    totalLabel: formatPeso(totalCentavos),
    payerName,
    shares,
    transfers,
    text: lines.join("\n")
  };
}
