export function greetingName(
  profile: { display_name?: string | null; nickname?: string | null } | null | undefined,
  email?: string | null
): string {
  const nickname = profile?.nickname?.trim();
  if (nickname) return nickname;

  const firstName = profile?.display_name?.trim().split(/\s+/)[0];
  if (firstName) return firstName;

  return email?.split("@")[0]?.trim() || "there";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}
