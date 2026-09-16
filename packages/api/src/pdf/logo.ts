import { LOGO_PNG_BASE64 } from "./logo-data.generated";

// Bytes embedded in the bundle (via scripts/generate-logo-data.ts) — no runtime fs/cwd dependency.

export const LOGO_DATA_URI = `data:image/png;base64,${LOGO_PNG_BASE64}`;

let cachedBuffer: Buffer | undefined;

export function getLogoBuffer(): Buffer {
  cachedBuffer ??= Buffer.from(LOGO_PNG_BASE64, "base64");
  return cachedBuffer;
}
