import { z } from "zod";

import { adminProcedure, cashierProcedure } from "../index";
import * as InvoiceModificationService from "../services/invoice-modification.service";
import { runEffect } from "../services/run-effect";

export const invoiceModificationRouter = {
  admins: cashierProcedure.handler(async () => {
    return runEffect(InvoiceModificationService.listActiveAdmins());
  }),

  request: cashierProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        assignedAdminId: z.string().min(1),
        reason: z.string().max(500).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return runEffect(
        InvoiceModificationService.requestModification({
          ...input,
          requestedById: context.session.user.id,
        }),
      );
    }),

  pendingForInvoice: cashierProcedure
    .input(z.object({ invoiceId: z.string() }))
    .handler(async ({ input }) => {
      return runEffect(InvoiceModificationService.getPendingForInvoice(input.invoiceId));
    }),

  history: cashierProcedure
    .input(z.object({ invoiceId: z.string() }))
    .handler(async ({ input }) => {
      return runEffect(InvoiceModificationService.listHistory(input.invoiceId));
    }),

  get: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    return runEffect(InvoiceModificationService.getById(input.id, context.session.user.id));
  }),

  respond: adminProcedure
    .input(z.object({ id: z.string(), approve: z.boolean() }))
    .handler(async ({ input, context }) => {
      return runEffect(
        InvoiceModificationService.respond({
          requestId: input.id,
          adminId: context.session.user.id,
          approve: input.approve,
        }),
      );
    }),
};
