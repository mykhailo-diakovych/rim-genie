import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileCheck, Mail, Pencil, Phone, Plus, Send, Trash2 } from "lucide-react";

import { CustomerModal } from "@/components/customers/customer-modal";
import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/customers/$customerId")({
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

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "completed"
      ? "Complete"
      : status === "in_progress"
        ? "In Progress"
        : status === "pending"
          ? "Pending"
          : "Draft";

  const bg =
    status === "completed"
      ? "bg-[#55ce63]"
      : status === "in_progress"
        ? "bg-[#f9b62e]"
        : status === "pending"
          ? "bg-blue"
          : "bg-ghost";

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white ${bg}`}
    >
      {label}
    </span>
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
        <Button variant="outline" render={<Link to="/customers" />}>
          <ArrowLeft />
          Back to list
        </Button>
      </div>

      {/* Profile Card */}
      <div className="flex flex-col gap-3 overflow-clip rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        {isLoading ? (
          <ProfileCardSkeleton />
        ) : customer ? (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
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
                <Button variant="outline" color="destructive">
                  <Trash2 />
                  Delete Profile
                </Button>
              </div>
            </div>

            <div className="h-px bg-field-line" />

            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <span className="font-rubik text-xs leading-3.5 text-label">Email:</span>
                <div className="flex items-center gap-1.5">
                  <Mail className="size-4 shrink-0 text-label" />
                  <span className="font-rubik text-sm leading-[18px] text-body">
                    {customer.email ?? "—"}
                  </span>
                </div>
              </div>

              <div className="w-px self-stretch bg-field-line" />

              <div className="flex w-[144px] flex-col gap-2">
                <span className="font-rubik text-xs leading-3.5 text-label">Mobile:</span>
                <div className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0 text-label" />
                  <span className="font-rubik text-sm leading-[18px] text-body">
                    {customer.phone}
                  </span>
                </div>
              </div>

              <div className="w-px self-stretch bg-field-line" />

              <div className="flex w-[144px] flex-col gap-2 font-rubik">
                <span className="text-xs leading-3.5 text-label">Birthday:</span>
                <span className="text-sm leading-[18px] text-body">
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
                    <span className="font-rubik text-sm leading-[18px] text-body">SMS</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="size-4 rounded-full border border-[#cdcfd1]" />
                    <span className="font-rubik text-sm leading-[18px] text-body">Email</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="py-4 text-center font-rubik text-sm text-label">Customer not found</p>
        )}
      </div>

      {/* Latest Quotes Card */}
      <div className="flex flex-col gap-3 overflow-clip rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
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
      <div className="flex flex-col gap-3 overflow-clip rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
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
  status: string;
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
                  className={`border-t border-l border-field-line p-2 text-sm leading-[18px] text-body ${borderB}`}
                >
                  {formatDate(q.createdAt)}
                </td>
                <td
                  className={`border-t border-l border-field-line p-2 text-sm leading-[18px] ${borderB}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } })
                    }
                    className="text-blue underline"
                  >
                    {q.quoteNumber}
                  </button>
                </td>
                <td
                  className={`border-t border-l border-field-line p-2 text-sm leading-[18px] text-body ${borderB}`}
                >
                  {formatTotal(q.total)}
                </td>
                <td className={`border-t border-l border-field-line p-2 ${borderB}`}>
                  <StatusBadge status={q.status} />
                </td>
                <td className={`border-t border-r border-l border-field-line p-2 ${borderB}`}>
                  <div className="flex flex-col items-end gap-2">
                    <Button>
                      <Send />
                      Send Quote
                    </Button>
                    {q.status === "completed" && (
                      <Button variant="outline" color="success">
                        <IconCashier />
                        To Cashier
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() =>
                        void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } })
                      }
                    >
                      <Pencil />
                      Edit Quote
                    </Button>
                    {q.status === "completed" && (
                      <Button variant="outline">
                        <FileCheck />
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
                  className={`h-12 w-[144px] border-t border-l border-field-line p-2 text-sm leading-[18px] text-body ${borderB}`}
                >
                  {formatDate(job.createdAt)}
                </td>
                <td
                  className={`h-12 w-[104px] border-t border-l border-field-line p-2 text-sm leading-[18px] ${borderB}`}
                >
                  <span className="text-blue underline">{jobNumber}</span>
                </td>
                <td
                  className={`h-12 border-t border-l border-field-line p-2 text-sm leading-[18px] text-body ${borderB}`}
                >
                  {description}
                </td>
                <td className={`h-12 w-[104px] border-t border-l border-field-line p-2 ${borderB}`}>
                  <StatusBadge status={job.status} />
                </td>
                <td
                  className={`h-12 w-[120px] border-t border-r border-l border-field-line p-2 ${borderB}`}
                >
                  {job.status === "completed" && (
                    <Button variant="outline">
                      <FileCheck />
                      Signed Doc
                    </Button>
                  )}
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
