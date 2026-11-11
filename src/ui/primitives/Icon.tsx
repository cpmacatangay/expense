export type IconName =
  | "home"
  | "ledger"
  | "activity"
  | "settings"
  | "plus"
  | "check"
  | "x"
  | "chevron-left"
  | "chevron-right"
  | "arrow-right"
  | "upload"
  | "download"
  | "share"
  | "copy"
  | "pencil"
  | "archive"
  | "restore"
  | "trash"
  | "user-plus"
  | "qr"
  | "users"
  | "log-out"
  | "log-in"
  | "mail";

const paths: Record<IconName, string> = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
  ledger: "M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 14h13M8 8h7M8 12h7",
  activity: "M3 12h4l2.5-6 5 12 2.5-6h4",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 13.5a7.8 7.8 0 0 0 0-3l1.8-1.4-2-3.4-2.1.8a7.8 7.8 0 0 0-2.6-1.5L14.2 2h-4l-.3 2.3a7.8 7.8 0 0 0-2.6 1.5l-2.1-.8-2 3.4 1.8 1.4a7.8 7.8 0 0 0 0 3l-1.8 1.4 2 3.4 2.1-.8a7.8 7.8 0 0 0 2.6 1.5l.3 2.3h4l.3-2.3a7.8 7.8 0 0 0 2.6-1.5l2.1.8 2-3.4-1.8-1.4Z",
  plus: "M12 5v14M5 12h14",
  check: "m5 12.5 4.2 4.2L19 6.5",
  x: "m6 6 12 12M18 6 6 18",
  "chevron-left": "m14.5 5-7 7 7 7",
  "chevron-right": "m9.5 5 7 7-7 7",
  "arrow-right": "M4 12h15m-5-5 5 5-5 5",
  upload:
    "M12 16V4m0 0L7 9m5-5 5 5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
  download:
    "M12 4v12m0 0 5-5m-5 5-5-5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
  share:
    "M12 15V4m0 0L8 8m4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7",
  copy: "M9 9h9a1 1 0 0 1 1 1v9H9V9Zm-3 6H5V5h10v1",
  pencil: "m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z",
  archive: "M4 7h16M6 7v12h12V7M9 4h6l1 3H8l1-3Zm1 8h4",
  restore: "M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5",
  trash: "M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5",
  "user-plus":
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M19 8v6m-3-3h6",
  qr: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v6h-6v-2",
  users:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 20a6 6 0 0 0-2-4.5",
  "log-out": "M9 5H5v14h4M14 8l4 4-4 4m4-4H9",
  "log-in": "M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l4 4-4 4m4-4H4",
  mail: "M4 6h16v12H4V6Zm0 0 8 7 8-7"
};

export function Icon({
  name,
  size = 20,
  className
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={paths[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
