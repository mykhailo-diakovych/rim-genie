import { Effect } from "effect";
import { and, eq, desc } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { notification, user } from "@rim-genie/db/schema";
import type { NotificationType } from "@rim-genie/db/schema";

export function create(input: {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  referenceId?: string;
  referenceType?: string;
}) {
  return Effect.tryPromise(() => db.insert(notification).values(input).returning()).pipe(
    Effect.map((rows) => rows[0]!),
  );
}

export function notifyAdmins(input: {
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
}) {
  return Effect.gen(function* () {
    const admins = yield* Effect.tryPromise(() =>
      db.query.user.findMany({
        where: eq(user.role, "admin"),
        columns: { id: true },
      }),
    );

    if (admins.length === 0) return [];

    const values = admins.map((admin) => ({
      type: input.type,
      title: input.title,
      message: input.message,
      recipientId: admin.id,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
    }));

    return yield* Effect.tryPromise(() => db.insert(notification).values(values).returning());
  });
}

export function listForUser(recipientId: string, unreadOnly?: boolean) {
  return Effect.tryPromise(() =>
    db.query.notification.findMany({
      where: unreadOnly
        ? and(eq(notification.recipientId, recipientId), eq(notification.isRead, false))
        : eq(notification.recipientId, recipientId),
      orderBy: [desc(notification.createdAt)],
      limit: 50,
    }),
  );
}

export function unreadCount(recipientId: string) {
  return Effect.tryPromise(() =>
    db.query.notification.findMany({
      where: and(eq(notification.recipientId, recipientId), eq(notification.isRead, false)),
      columns: { id: true },
    }),
  ).pipe(Effect.map((rows) => rows.length));
}

export function markRead(id: string, recipientId: string) {
  return Effect.tryPromise(() =>
    db
      .update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.id, id), eq(notification.recipientId, recipientId)))
      .returning(),
  ).pipe(Effect.map((rows) => rows[0]));
}

export function markAllRead(recipientId: string) {
  return Effect.tryPromise(() =>
    db
      .update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.recipientId, recipientId), eq(notification.isRead, false)))
      .returning(),
  );
}
