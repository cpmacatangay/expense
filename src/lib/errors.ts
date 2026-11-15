const NETWORK_PATTERN =
  /failed to fetch|load failed|networkerror|err_internet_disconnected|fetch failed|network request failed/i;
const CHUNK_PATTERN = /dynamically imported module|importing a module script failed/i;
const TIMEOUT_PATTERN = /timed out|timeout/i;

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return null;
}

export function isNetworkError(error: unknown) {
  const raw = messageOf(error);
  return Boolean(
    raw && (NETWORK_PATTERN.test(raw) || CHUNK_PATTERN.test(raw) || TIMEOUT_PATTERN.test(raw))
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const raw = messageOf(error);

  if (raw) {
    if (CHUNK_PATTERN.test(raw)) {
      return "This screen did not load. Check your connection and try again.";
    }
    if (NETWORK_PATTERN.test(raw)) {
      return "No connection. Check your network and try again.";
    }
    if (TIMEOUT_PATTERN.test(raw)) {
      return "The request timed out. Try again.";
    }
    return raw;
  }

  return fallback;
}

