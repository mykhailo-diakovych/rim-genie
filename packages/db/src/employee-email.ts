const PLACEHOLDER_EMAIL_DOMAIN = "staff.rimgenie.invalid";

// Better Auth requires `user.email` to be a non-null, unique string, but staff
// sign in with employeeId + PIN and often have no real email. `.invalid` is the
// reserved TLD (RFC 2606) that can never resolve or be mailed, and the address is
// derived from the already-unique normalized username, so it can never collide.
export function makePlaceholderEmail(normalizedUsername: string): string {
  return `${normalizedUsername}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}
