import { eq } from "drizzle-orm";

import { auth } from "@rim-genie/auth";
import { db } from "@rim-genie/db";
import { user } from "@rim-genie/db/schema";

function parseCookie(headers: Headers, name: string): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export async function createContext({ req }: { req: Request }) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  let locationId: string | null = null;

  if (session?.user) {
    const cookieLocation = parseCookie(req.headers, "rim-genie-location");

    if (cookieLocation) {
      locationId = cookieLocation;
    } else {
      const userRow = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { locationId: true },
      });
      locationId = userRow?.locationId ?? null;
    }
  }

  return {
    session,
    headers: req.headers,
    locationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
