// Only same-origin paths survive, so a crafted link cannot bounce a fresh sign-in off-site.
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}

export function validateRedirectSearch(search: Record<string, unknown>): { redirect?: string } {
  return { redirect: safeRedirect(search.redirect) };
}
