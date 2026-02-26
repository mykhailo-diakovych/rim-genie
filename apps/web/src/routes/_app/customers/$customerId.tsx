import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CustomerModal } from "@/components/customers/customer-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppRouterClient } from "@rim-genie/api/routers/index";

import { requireRoles } from "@/lib/route-permissions";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/customers/$customerId")({
  beforeLoad: requireRoles(["admin", "floorManager", "cashier"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Customer" }],
  }),
  component: CustomerProfilePage,
});

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatBirthday(day: number | null, month: number | null) {
  if (!day || !month) return "—";
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

function formatTotal(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type CustomerDetail = Awaited<ReturnType<AppRouterClient["floor"]["customers"]["getById"]>>;
type QuoteStatus = NonNullable<CustomerDetail>["quotes"][number]["status"];

const STATUS_BG: Record<QuoteStatus, string> = {
  draft: "bg-ghost",
  pending: "bg-blue",
  in_progress: "bg-badge-orange",
  completed: "bg-green",
};

function StatusBadge({ status }: { status: QuoteStatus }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center justify-center rounded ${STATUS_BG[status]} px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white`}
    >
      {label}
    </span>
  );
}

function IconSendQuote({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.33357 4.66667L2.52103 5.20835C1.93855 5.59667 1.64731 5.79083 1.48948 6.08694C1.33165 6.38305 1.33282 6.73107 1.33515 7.42707C1.33797 8.265 1.34576 9.1188 1.36733 9.98273C1.41849 12.0325 1.44407 13.0573 2.19767 13.8109C2.95127 14.5646 3.98998 14.5905 6.06739 14.6425C7.3598 14.6747 8.64073 14.6747 9.93307 14.6425C12.0105 14.5905 13.0492 14.5646 13.8028 13.8109C14.5564 13.0573 14.582 12.0325 14.6331 9.98273C14.6547 9.1188 14.6625 8.265 14.6653 7.42707C14.6677 6.73107 14.6688 6.38304 14.511 6.08694C14.3531 5.79083 14.0619 5.59667 13.4794 5.20835L12.6669 4.66667M1.33333 6.66667L5.94201 9.43187C6.94467 10.0335 7.446 10.3343 8 10.3343C8.554 10.3343 9.05533 10.0335 10.058 9.43187L14.6667 6.66667M3.33332 8V4C3.33332 2.74292 3.33332 2.11438 3.72385 1.72386C4.11437 1.33333 4.74291 1.33333 5.99999 1.33333H10C11.2571 1.33333 11.8856 1.33333 12.2761 1.72386C12.6667 2.11438 12.6667 2.74292 12.6667 4V8M6.66667 6.66667H9.33333M6.66667 4H9.33333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSignedDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M9.987 4.67704C9.987 4.67704 10.3203 5.01037 10.6537 5.67704C10.6537 5.67704 11.7125 4.01037 12.6537 3.67704M6.66327 1.34756C4.99763 1.27704 3.71079 1.46892 3.71079 1.46892C2.89822 1.52702 1.34101 1.98257 1.34103 4.64303C1.34104 7.28087 1.3238 10.5329 1.34103 11.8293C1.34103 12.6213 1.83144 14.4689 3.52888 14.5679C5.59211 14.6883 9.30853 14.7139 11.0137 14.5679C11.4701 14.5421 12.9898 14.1838 13.1821 12.5304C13.3814 10.8175 13.3417 9.62713 13.3417 9.3438M4.65369 8.67707H7.32033M4.65369 11.3437H9.987M14.6666 4.67704C14.6666 6.51799 13.1728 8.0104 11.3301 8.0104C9.48733 8.0104 7.99353 6.51799 7.99353 4.67704C7.99353 2.83609 9.48733 1.34371 11.3301 1.34371C13.1728 1.34371 14.6666 2.83609 14.6666 4.67704Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCashier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M14 10H12.333C12.068 10 11.814 10.105 11.626 10.293C11.438 10.48 11.333 10.735 11.333 11C11.333 11.265 11.438 11.52 11.626 11.707C11.814 11.895 12.068 12 12.333 12H13C13.265 12 13.52 12.105 13.707 12.293C13.895 12.48 14 12.735 14 13C14 13.265 13.895 13.52 13.707 13.707C13.52 13.895 13.265 14 13 14H11.333M12.667 14V14.667M12.667 9.333V10M8.667 14H4C3.647 14 3.307 13.86 3.057 13.61C2.807 13.36 2.667 13.02 2.667 12.667V6C2.667 5.647 2.807 5.307 3.057 5.057C3.307 4.807 3.647 4.667 4 4.667H5.333M13.333 6.747V6C13.333 5.647 13.193 5.307 12.943 5.057C12.693 4.807 12.353 4.667 12 4.667H10.667M10.667 6.667V2.667C10.667 2.313 10.527 1.974 10.276 1.724C10.026 1.474 9.687 1.333 9.333 1.333H6.667C6.313 1.333 5.974 1.474 5.724 1.724C5.474 1.974 5.333 2.313 5.333 2.667V6.667M10.667 6.667H5.333M10.667 6.667H11.333M5.333 6.667H4.667M5.333 9.333V9.34M5.333 11.333V11.34M8 9.327V9.333M8 11.333V11.34"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteProfileDialog({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => client.floor.customers.delete({ id: customerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.list.key() });
      toast.success("Customer deleted");
      void navigate({ to: "/customers" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" color="destructive" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete Profile
      </Button>

      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-3 pt-3 pb-3">
          <p className="font-rubik text-sm leading-4.5 text-label">
            Are you sure you want to delete <strong className="text-body">{customerName}</strong>?
            This will permanently remove all their quotes and job history.
          </p>
          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button
              color="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerProfilePage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery(
    orpc.floor.customers.getById.queryOptions({ input: { id: customerId } }),
  );

  const quotes = customer?.quotes ?? [];
  const latestQuotes = quotes.slice(0, 10);
  const latestJobs = quotes
    .filter((q) => q.status === "completed" || q.status === "in_progress")
    .slice(0, 10);

  return (
    <div className="flex flex-1 flex-col gap-3 p-5">
      {/* Back button */}
      <div>
        <Button variant="outline" nativeButton={false} render={<Link to="/customers" />}>
          <ChevronLeft />
          Back to list
        </Button>
      </div>

      {/* Profile Card */}
      <div className="flex flex-col gap-3 overflow-clip rounded-xl border border-card-line bg-white p-3 shadow-card">
        {isLoading ? (
          <ProfileCardSkeleton />
        ) : customer ? (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
                {customer.name}
              </h1>
              <div className="flex items-center gap-2">
                <CustomerModal
                  customer={customer}
                  trigger={
                    <Button>
                      <Pencil />
                      Edit Profile
                    </Button>
                  }
                />
                <DeleteProfileDialog customerId={customer.id} customerName={customer.name} />
              </div>
            </div>

            <div className="h-px bg-field-line" />

            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <span className="font-rubik text-xs leading-3.5 text-label">Email:</span>
                <div className="flex items-center gap-1.5">
                  <Mail className="size-4 shrink-0 text-ghost" />
                  <span className="font-rubik text-sm leading-4.5 text-body">
                    {customer.email ?? "—"}
                  </span>
                </div>
              </div>

              <div className="w-px self-stretch bg-field-line" />

              <div className="flex w-[144px] flex-col gap-2">
                <span className="font-rubik text-xs leading-3.5 text-label">Mobile:</span>
                <div className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0 text-ghost" />
                  <span className="font-rubik text-sm leading-4.5 text-body">{customer.phone}</span>
                </div>
              </div>

              <div className="w-px self-stretch bg-field-line" />

              <div className="flex w-[144px] flex-col gap-2 font-rubik">
                <span className="text-xs leading-3.5 text-label">Birthday:</span>
                <span className="text-sm leading-4.5 text-body">
                  {formatBirthday(customer.birthdayDay, customer.birthdayMonth)}
                </span>
              </div>

              <div className="w-px self-stretch bg-field-line" />

              <div className="flex w-[144px] flex-col gap-2">
                <span className="font-rubik text-xs leading-3.5 text-label">Communication:</span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-1.5">
                    <span className="flex size-4 items-center justify-center rounded-full border border-blue">
                      <span className="size-2 rounded-full bg-blue" />
                    </span>
                    <span className="font-rubik text-sm leading-4.5 text-body">SMS</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="size-4 rounded-full border border-[#cdcfd1]" />
                    <span className="font-rubik text-sm leading-4.5 text-body">Email</span>
                  </label>
                </div>
              </div>

              <div className="w-px self-stretch bg-field-line" />

              <div className="flex w-[144px] flex-col gap-2">
                <span className="font-rubik text-xs leading-3.5 text-label">VIP Status:</span>
                {customer.isVip ? (
                  <span className="inline-flex w-fit items-center rounded bg-badge-orange px-1.5 py-0.5 font-rubik text-xs text-white">
                    VIP{customer.discount ? ` (${customer.discount}% off)` : ""}
                  </span>
                ) : (
                  <span className="font-rubik text-sm leading-4.5 text-label">Standard</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="py-4 text-center font-rubik text-sm text-label">Customer not found</p>
        )}
      </div>

      {/* Latest Quotes Card */}
      <div className="flex flex-col gap-3 overflow-clip rounded-xl border border-card-line bg-white p-3 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-rubik text-base leading-5 font-medium text-body">Latest Quotes</h2>
          <Button
            onClick={() =>
              void navigate({
                to: "/floor/new-quote",
                search: { customerId },
              })
            }
          >
            <Plus />
            Add Quote
          </Button>
        </div>

        <QuotesTable quotes={latestQuotes} />
      </div>

      {/* Latest Jobs Card */}
      <div className="flex flex-col gap-3 overflow-clip rounded-xl border border-card-line bg-white p-3 shadow-card">
        <h2 className="font-rubik text-base leading-5 font-medium text-body">Latest Jobs</h2>
        <JobsTable jobs={latestJobs} />
      </div>
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-[26px] w-40 animate-pulse rounded bg-page" />
        <div className="flex gap-2">
          <div className="h-9 w-[128px] animate-pulse rounded-lg bg-page" />
          <div className="h-9 w-[128px] animate-pulse rounded-lg bg-page" />
        </div>
      </div>
      <div className="h-px bg-field-line" />
      <div className="flex items-center gap-3">
        <div className="h-10 flex-1 animate-pulse rounded bg-page" />
        <div className="h-10 w-[144px] animate-pulse rounded bg-page" />
        <div className="h-10 w-[144px] animate-pulse rounded bg-page" />
        <div className="h-10 w-[144px] animate-pulse rounded bg-page" />
      </div>
    </div>
  );
}

interface QuoteRow {
  id: string;
  quoteNumber: number;
  total: number;
  status: QuoteStatus;
  createdAt: Date | string;
  items: { id: string; description: string | null; quantity: number; jobTypes: unknown[] }[];
}

function QuotesTable({ quotes }: { quotes: QuoteRow[] }) {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full font-rubik text-xs">
        <thead>
          <tr className="text-left text-label">
            <th className="h-8 border-t border-l border-field-line px-2 py-1.5 font-normal">
              Date
            </th>
            <th className="h-8 border-t border-l border-field-line px-2 py-1.5 font-normal">
              Quote #
            </th>
            <th className="h-8 border-t border-l border-field-line px-2 py-1.5 font-normal">
              Total
            </th>
            <th className="h-8 border-t border-l border-field-line px-2 py-1.5 font-normal">
              Status
            </th>
            <th className="h-8 w-[120px] border-t border-r border-l border-field-line px-2 py-1.5 font-normal" />
          </tr>
        </thead>
        <tbody>
          {quotes.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="border border-field-line px-2 py-6 text-center text-sm text-label"
              >
                No quotes yet
              </td>
            </tr>
          )}
          {quotes.map((q, idx) => {
            const isLast = idx === quotes.length - 1;
            const borderB = isLast ? "border-b" : "";
            return (
              <tr key={q.id}>
                <td
                  className={`border-t border-l border-field-line p-2 text-sm leading-4.5 text-body ${borderB}`}
                >
                  {formatDate(q.createdAt)}
                </td>
                <td
                  className={`border-t border-l border-field-line p-2 text-sm leading-4.5 ${borderB}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } })
                    }
                    className="cursor-pointer text-blue underline"
                  >
                    {q.quoteNumber}
                  </button>
                </td>
                <td
                  className={`border-t border-l border-field-line p-2 text-sm leading-4.5 text-body ${borderB}`}
                >
                  {formatTotal(q.total)}
                </td>
                <td className={`border-t border-l border-field-line p-2 ${borderB}`}>
                  <StatusBadge status={q.status} />
                </td>
                <td className={`border-t border-r border-l border-field-line p-2 ${borderB}`}>
                  <div className="flex flex-col items-stretch gap-2">
                    <Button size="sm">
                      <IconSendQuote />
                      Send Quote
                    </Button>
                    {q.status === "completed" && (
                      <Button size="sm" variant="outline" color="success">
                        <IconCashier />
                        To Cashier
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } })
                      }
                    >
                      <Pencil />
                      Edit Quote
                    </Button>
                    {q.status === "completed" && (
                      <Button size="sm" variant="outline">
                        <IconSignedDoc />
                        Signed Doc
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JobsTable({ jobs }: { jobs: QuoteRow[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full font-rubik text-xs">
        <thead>
          <tr className="text-left text-label">
            <th className="h-8 w-[144px] border-t border-l border-field-line px-2 py-1.5 font-normal">
              Completion Date
            </th>
            <th className="h-8 w-[104px] border-t border-l border-field-line px-2 py-1.5 font-normal">
              Job #
            </th>
            <th className="h-8 border-t border-l border-field-line px-2 py-1.5 font-normal">
              Description
            </th>
            <th className="h-8 w-[104px] border-t border-l border-field-line px-2 py-1.5 font-normal">
              Status
            </th>
            <th className="h-8 w-[120px] border-t border-r border-l border-field-line px-2 py-1.5 font-normal" />
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="border border-field-line px-2 py-6 text-center text-sm text-label"
              >
                No jobs yet
              </td>
            </tr>
          )}
          {jobs.map((job, idx) => {
            const isLast = idx === jobs.length - 1;
            const borderB = isLast ? "border-b" : "";
            const description = buildJobDescription(job.items);
            const jobNumber = String(job.quoteNumber).padStart(7, "0");

            return (
              <tr key={job.id}>
                <td
                  className={`h-12 w-[144px] border-t border-l border-field-line p-2 text-sm leading-4.5 text-body ${borderB}`}
                >
                  {formatDate(job.createdAt)}
                </td>
                <td
                  className={`h-12 w-[104px] border-t border-l border-field-line p-2 text-sm leading-4.5 ${borderB}`}
                >
                  <span className="text-blue underline">{jobNumber}</span>
                </td>
                <td
                  className={`h-12 border-t border-l border-field-line p-2 text-sm leading-4.5 text-body ${borderB}`}
                >
                  {description}
                </td>
                <td className={`h-12 w-[104px] border-t border-l border-field-line p-2 ${borderB}`}>
                  <StatusBadge status={job.status} />
                </td>
                <td
                  className={`h-12 w-[120px] border-t border-r border-l border-field-line p-2 ${borderB}`}
                >
                  <div className="flex flex-col items-stretch">
                    {job.status === "completed" && (
                      <Button size="sm" variant="outline">
                        <IconSignedDoc />
                        Signed Doc
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildJobDescription(
  items: { description: string | null; quantity: number; jobTypes: unknown[] }[],
) {
  if (items.length === 0) return "—";

  const parts: string[] = [];
  for (const item of items) {
    if (item.description) {
      parts.push(item.description);
    }
  }

  return parts.length > 0 ? parts.join(", ") : `${items.length} item(s)`;
}
