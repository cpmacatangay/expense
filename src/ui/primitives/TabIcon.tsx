type IconName = "home" | "ledger" | "activity" | "settings";

const paths: Record<IconName, string> = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
  ledger: "M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 14h13M8 8h7M8 12h7",
  activity: "M3 12h4l2.5-6 5 12 2.5-6h4",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 13.5a7.8 7.8 0 0 0 0-3l1.8-1.4-2-3.4-2.1.8a7.8 7.8 0 0 0-2.6-1.5L14.2 2h-4l-.3 2.3a7.8 7.8 0 0 0-2.6 1.5l-2.1-.8-2 3.4 1.8 1.4a7.8 7.8 0 0 0 0 3l-1.8 1.4 2 3.4 2.1-.8a7.8 7.8 0 0 0 2.6 1.5l.3 2.3h4l.3-2.3a7.8 7.8 0 0 0 2.6-1.5l2.1.8 2-3.4-1.8-1.4Z"
};

export function TabIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

