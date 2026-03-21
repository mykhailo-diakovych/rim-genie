import { z } from "zod";

import { adminProcedure, floorManagerProcedure, protectedProcedure } from "../index";
import * as DiscountService from "../services/discount.service";
import { runEffect } from "../services/run-effect";

export const discountRouter = {
  requestQuoteDiscount: floorManagerProcedure
    .input(
      z.object({
        quoteId: z.string(),
        requestedPercent: z.number().int().min(0).max(100),
        reason: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return runEffect(
        DiscountService.requestQuoteDiscount({
          ...input,
          requestedById: context.session.user.id,
        }),
      );
    }),

  requestCustomerDiscount: floorManagerProcedure
    .input(
      z.object({
        customerId: z.string(),
        requestedPercent: z.number().int().min(1).max(100),
        reason: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return runEffect(
        DiscountService.requestCustomerDiscount({
          ...input,
          requestedById: context.session.user.id,
        }),
      );
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    return runEffect(DiscountService.getById(input.id));
  }),

  approve: adminProcedure
    .input(
      z.object({
        id: z.string(),
        approvedPercent: z.number().int().min(0).max(100).optional(),
        adminNote: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return runEffect(
        DiscountService.approve({
          requestId: input.id,
          adminId: context.session.user.id,
          approvedPercent: input.approvedPercent,
          adminNote: input.adminNote,
        }),
      );
    }),

  reject: adminProcedure
    .input(
      z.object({
        id: z.string(),
        adminNote: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return runEffect(
        DiscountService.reject({
          requestId: input.id,
          adminId: context.session.user.id,
          adminNote: input.adminNote,
        }),
      );
    }),

  pendingForQuote: protectedProcedure
    .input(z.object({ quoteId: z.string() }))
    .handler(async ({ input }) => {
      return runEffect(DiscountService.getPendingForQuote(input.quoteId));
    }),

  pendingForCustomer: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .handler(async ({ input }) => {
      return runEffect(DiscountService.getPendingForCustomer(input.customerId));
    }),
};
