import { z } from "zod";

import { protectedProcedure } from "../index";
import * as NotificationService from "../services/notification.service";
import { runEffect } from "../services/run-effect";

export const notificationRouter = {
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }))
    .handler(async ({ input, context }) => {
      return runEffect(NotificationService.listForUser(context.session.user.id, input.unreadOnly));
    }),

  unreadCount: protectedProcedure.handler(async ({ context }) => {
    return runEffect(NotificationService.unreadCount(context.session.user.id));
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      return runEffect(NotificationService.markRead(input.id, context.session.user.id));
    }),

  markAllRead: protectedProcedure.handler(async ({ context }) => {
    return runEffect(NotificationService.markAllRead(context.session.user.id));
  }),
};
