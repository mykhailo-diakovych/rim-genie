import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@rim-genie/db";
import { invoice } from "@rim-genie/db/schema";

import { requireRole } from "../index";

const jobViewerProcedure = requireRole("admin", "floorManager", "cashier");

export const jobsRouter = {
  getByInvoice: jobViewerProcedure
    .input(z.object({ invoiceId: z.string() }))
    .handler(async ({ input }) => {
      const row = await db.query.invoice.findFirst({
        where: eq(invoice.id, input.invoiceId),
        columns: { id: true, invoiceNumber: true, status: true, createdAt: true },
        with: {
          customer: { columns: { id: true, name: true } },
          pickup: {
            columns: { pickedUpAt: true, notes: true },
            with: { pickedUpBy: { columns: { id: true, name: true } } },
          },
          jobs: {
            orderBy: (j, { asc }) => [asc(j.createdAt)],
            columns: {
              id: true,
              status: true,
              acceptedAt: true,
              startedAt: true,
              completedAt: true,
              dueDate: true,
              isOvernight: true,
              isPickedUp: true,
              specialNotes: true,
              createdAt: true,
            },
            with: {
              invoiceItem: {
                columns: {
                  itemType: true,
                  description: true,
                  comments: true,
                  vehicleSize: true,
                  vehicleType: true,
                  rimMaterial: true,
                  damageLevel: true,
                  quantity: true,
                  sortOrder: true,
                },
              },
              technician: { columns: { id: true, name: true } },
            },
          },
        },
      });

      if (!row) throw new ORPCError("NOT_FOUND", { message: "Job not found" });

      const { pickup, ...rest } = row;
      return {
        ...rest,
        jobs: row.jobs
          .map((j) => ({ ...j, pickup: j.isPickedUp ? pickup : null }))
          .sort((a, b) => a.invoiceItem.sortOrder - b.invoiceItem.sortOrder),
      };
    }),
};
