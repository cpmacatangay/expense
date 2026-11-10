import { strToU8, zipSync } from "fflate";
import { todayInManila } from "@/features/outings/api";
import { slugifyFilename } from "@/lib/download";
import type { ExportData } from "./load";

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let cell: string;
  if (typeof value === "object") {
    cell = JSON.stringify(value);
  } else {
    cell = String(value);
  }

  if (/[",\r\n]/.test(cell)) {
    cell = `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  }
  return lines.join("\r\n");
}

function readme(data: ExportData): string {
  const scope =
    data.scope === "group"
      ? "Full group export"
      : `Member export for ${data.member.profile.display_name}`;

  return [
    "Salo export",
    `Group: ${data.group.name}`,
    `Exported: ${data.exported_at}`,
    `Scope: ${scope}`,
    "",
    "Amounts are integer centavos (1 peso = 100 centavos).",
    "Payment QR images are never included in exports.",
    data.scope === "group"
      ? "This archive contains every outing, item, share, settlement, activity event, adult, and student in the group."
      : "This archive contains only your shares, settlements, and activity, plus the outings those shares belong to."
  ].join("\r\n");
}

export function buildCsvFiles(data: ExportData): Record<string, string> {
  if (data.scope === "group") {
    return {
      "README.txt": readme(data),
      "group.csv": toCsv([data.group as unknown as Record<string, unknown>]),
      "profiles.csv": toCsv(data.profiles as unknown as Record<string, unknown>[]),
      "adults.csv": toCsv(data.adults),
      "students.csv": toCsv(data.students),
      "outings.csv": toCsv(data.outings),
      "outing_adults.csv": toCsv(data.outing_adults),
      "outing_students.csv": toCsv(data.outing_students),
      "items.csv": toCsv(data.items),
      "shares.csv": toCsv(data.shares),
      "settlements.csv": toCsv(data.settlements),
      "activity.csv": toCsv(data.activity_events)
    };
  }

  const memberRow: Record<string, unknown> = {
    profile_id: data.member.profile.id,
    email: data.member.profile.email,
    display_name: data.member.profile.display_name,
    adult_id: data.member.adult?.id ?? "",
    group_adult_name: data.member.adult?.display_name ?? "",
    status: data.member.adult?.status ?? "",
    color: data.member.adult?.color ?? ""
  };

  return {
    "README.txt": readme(data),
    "member.csv": toCsv([memberRow]),
    "outings.csv": toCsv(data.outings),
    "shares.csv": toCsv(data.shares),
    "settlements.csv": toCsv(data.settlements),
    "activity.csv": toCsv(data.activity_events)
  };
}

export function zipCsvFiles(files: Record<string, string>): Blob {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    entries[name] = strToU8(content);
  }

  const zipped = zipSync(entries, { level: 6 });
  const buffer = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(buffer).set(zipped);

  return new Blob([buffer], { type: "application/zip" });
}

export function exportBaseName(data: ExportData): string {
  const date = todayInManila();
  if (data.scope === "group") {
    return `salo-${slugifyFilename(data.group.name)}-${date}`;
  }
  return `salo-${slugifyFilename(data.group.name)}-${slugifyFilename(
    data.member.profile.display_name
  )}-${date}`;
}
