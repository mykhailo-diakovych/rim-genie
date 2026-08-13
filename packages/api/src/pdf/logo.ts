import { existsSync } from "node:fs";
import path from "node:path";

const CANDIDATES = [
  path.resolve(process.cwd(), "public/logo.png"),
  path.resolve(process.cwd(), "apps/web/public/logo.png"),
  path.resolve(process.cwd(), "../../apps/web/public/logo.png"),
];

let cached: string | null | undefined;

export function resolveLogoPath(): string | null {
  if (cached !== undefined) return cached;
  cached = CANDIDATES.find(existsSync) ?? null;
  return cached;
}
