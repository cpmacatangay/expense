import { formatPeso } from "@/domain/money/format";
import type { Adult, Student } from "@/features/groups/types";
import type { Settlement } from "@/features/ledger/types";
import type { Outing } from "@/features/outings/types";
import { formatDate } from "@/lib/dates";
import type { ActivityEvent } from "./types";

export type ActivityContext = {
  adults: Adult[];
  students: Student[];
  outings: Outing[];
  settlements: Settlement[];
};

export type ActivityDiff = {
  label: string;
  before?: string;
  after?: string;
};

export type ActivityDescription = {
  text: string;
  link: string | null;
  tag: string;
  diff: ActivityDiff[];
};

const fieldLabels: Record<string, string> = {
  name: "Name",
  displayName: "Name",
  adultName: "Adult",
  status: "Status",
  date: "Date",
  place: "Place",
  notes: "Notes",
  payerAdultId: "Payer",
  totalCentavos: "Total",
  totalMode: "Total mode",
  shareCount: "Shares",
  quantity: "Quantity",
  unitAmountCentavos: "Unit price",
  assignmentType: "Split",
  assignedAdultId: "Adult",
  assignedStudentId: "Student",
  amountCentavos: "Amount",
  fromAdultId: "From",
  toAdultId: "To",
  note: "Note",
  expiresAt: "Expires",
  acceptedAt: "Accepted",
  revokedAt: "Revoked",
  outingId: "Outing"
};

const entityTags: Record<ActivityEvent["entity_type"], string> = {
  group: "Group",
  adult: "Member",
  invitation: "Invitation",
  student: "Student",
  outing: "Outing",
  item: "Item",
  settlement: "Settlement"
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function formatStamp(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

export function describeActivity(
  event: ActivityEvent,
  context: ActivityContext
): ActivityDescription {
  const before = event.before_json ?? {};
  const after = event.after_json ?? {};

  const adultById = new Map(context.adults.map((adult) => [adult.id, adult]));
  const studentById = new Map(context.students.map((student) => [student.id, student]));
  const outingById = new Map(context.outings.map((outing) => [outing.id, outing]));

  function adultName(value: unknown): string {
    const id = typeof value === "string" ? value : "";
    return adultById.get(id)?.display_name ?? "a removed adult";
  }

  function studentName(value: unknown): string {
    const id = typeof value === "string" ? value : "";
    return studentById.get(id)?.name ?? "a removed student";
  }

  function outingLabel(value: unknown): string {
    const id = typeof value === "string" ? value : "";
    const outing = outingById.get(id);
    if (!outing) return "an outing";
    return outing.place ? outing.place : formatDate(outing.date);
  }

  const settlement = context.settlements.find((row) => row.id === event.entity_id);
  const settlementAmount = formatPeso(
    settlement?.amount_centavos ?? number(after.amountCentavos)
  );
  const settlementFrom = adultName(settlement?.from_adult_id ?? after.fromAdultId);
  const settlementTo = adultName(settlement?.to_adult_id ?? after.toAdultId);

  const outingId =
    event.entity_type === "outing"
      ? event.entity_id
      : text(after.outingId) || text(before.outingId) || null;

  let description = event.action.replace(/[._]/g, " ");

  switch (event.action) {
    case "group.created":
      description = "created the group";
      break;
    case "group.updated":
      description = "updated the group";
      break;
    case "group.archived":
      description = "archived the group";
      break;
    case "group.soft_deleted":
      description = "soft-deleted the group";
      break;
    case "group.restored":
      description = "restored the group";
      break;
    case "adult.invited":
      description = `invited ${text(after.displayName, "an adult")}`;
      break;
    case "adult.joined":
      description = "joined the group";
      break;
    case "adult.removed":
      description = `removed ${text(before.displayName, "an adult")}`;
      break;
    case "adult.restored":
      description = `restored ${text(after.displayName, "an adult")}`;
      break;
    case "adult.renamed":
      description = `renamed ${text(before.displayName, "an adult")} to ${text(
        after.displayName,
        "a new name"
      )}`;
      break;
    case "adult.updated":
      description = "updated a member";
      break;
    case "invitation.created":
      description = `created an invite for ${text(after.adultName, "an adult")}`;
      break;
    case "invitation.claimed":
      description = "joined from an invite";
      break;
    case "invitation.revoked":
      description = `revoked the invite for ${text(after.adultName, "an adult")}`;
      break;
    case "invitation.updated":
      description = "updated an invitation";
      break;
    case "student.created":
      description = `added student ${text(after.name, "")}`.trim();
      break;
    case "student.updated":
      description = `updated student ${text(after.name, "")}`.trim();
      break;
    case "student.archived":
      description = `archived student ${text(after.name, "")}`.trim();
      break;
    case "student.restored":
      description = `restored student ${text(after.name, "")}`.trim();
      break;
    case "student.deleted":
      description = `removed student ${text(before.name, "")}`.trim();
      break;
    case "outing.created":
      description = `started ${outingLabel(event.entity_id)}`;
      break;
    case "outing.updated":
      description = `updated ${outingLabel(event.entity_id)}`;
      break;
    case "outing.published":
      description = `published ${outingLabel(event.entity_id)}`;
      break;
    case "outing.deleted":
      description = `deleted ${outingLabel(event.entity_id)}`;
      break;
    case "outing.finalized":
      description = `finalized ${outingLabel(event.entity_id)}`;
      break;
    case "outing.reopened":
      description = `reopened ${outingLabel(event.entity_id)}`;
      break;
    case "item.created":
      description = `added ${text(after.name, "an item")} to ${outingLabel(outingId)}`;
      break;
    case "item.updated":
      description = `edited ${text(after.name) || text(before.name, "an item")}`;
      break;
    case "item.deleted":
      description = `removed ${text(before.name, "an item")}`;
      break;
    case "settlement.recorded":
      description = `recorded ${settlementAmount} to ${settlementTo}`;
      break;
    case "settlement.confirmed":
      description = `confirmed ${settlementAmount} from ${settlementFrom}`;
      break;
    case "settlement.declined":
      description = `declined ${settlementAmount} from ${settlementFrom}`;
      break;
    case "settlement.voided":
      description = `voided ${settlementAmount}`;
      break;
  }

  function displayValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";

    switch (key) {
      case "payerAdultId":
      case "assignedAdultId":
      case "fromAdultId":
      case "toAdultId":
        return adultName(value);
      case "assignedStudentId":
        return studentName(value);
      case "outingId":
        return outingLabel(value);
      case "totalCentavos":
      case "unitAmountCentavos":
      case "amountCentavos":
        return formatPeso(number(value));
      case "date":
        return typeof value === "string" ? formatDate(value) : String(value);
      case "expiresAt":
      case "acceptedAt":
      case "revokedAt":
        return formatStamp(value);
      case "status":
      case "totalMode":
      case "assignmentType":
        return capitalize(String(value));
      default:
        return String(value);
    }
  }

  const diff: ActivityDiff[] = [];
  for (const [key, label] of Object.entries(fieldLabels)) {
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
    if (!hasBefore && !hasAfter) continue;

    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue;

    diff.push({
      label,
      before: hasBefore ? displayValue(key, beforeValue) : undefined,
      after: hasAfter ? displayValue(key, afterValue) : undefined
    });
  }

  return {
    text: description,
    link: outingId ? `/outings/${outingId}` : null,
    tag: entityTags[event.entity_type] ?? "Activity",
    diff
  };
}
