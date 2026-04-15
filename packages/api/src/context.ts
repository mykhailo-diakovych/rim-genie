import { and, eq } from "drizzle-orm";

import { auth } from "@rim-genie/auth";
import { db } from "@rim-genie/db";
import { user, userLocation } from "@rim-genie/db/schema";

function parseCookie(headers: Headers, name: string): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

async function resolveLocation(
  userId: string,
  role: string | null | undefined,
  cookieLocation: string | null,
  fallbackLocation: string | null,
): Promise<string | null> {
  if (role === "admin") {
    return cookieLocation ?? fallbackLocation;
  }

  if (cookieLocation) {
    const [assignment] = await db
      .select({ locationId: userLocation.locationId })
      .from(userLocation)
      .where(and(eq(userLocation.userId, userId), eq(userLocation.locationId, cookieLocation)))
      .limit(1);
    if (assignment) return cookieLocation;
  }

  return fallbackLocation;
}

export async function createContext({ req }: { req: Request }) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  let locationId: string | null = null;

  if (session?.user) {
    const cookieLocation = parseCookie(req.headers, "rim-genie-location");
    const userRow = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { locationId: true },
    });
    locationId = await resolveLocation(
      session.user.id,
      (session.user as { role?: string | null }).role ?? null,
      cookieLocation,
      userRow?.locationId ?? null,
    );
  }

  return {
    session,
    headers: req.headers,
    locationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
