import { useEffect } from "react";

const suffix = "Salo";

/** Keep the document title in sync with the active SPA route. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${suffix}` : suffix;
  }, [title]);
}
