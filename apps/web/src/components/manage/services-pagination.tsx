import { ChevronLeft, ChevronRight } from "lucide-react";

import { m } from "@/paraglide/messages";

interface ServicesPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function getVisiblePages(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function ServicesPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: ServicesPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="flex items-center justify-between px-3 py-3">
      <div className="flex items-center gap-1.5">
        <span className="font-rubik text-xs leading-3.5 text-body">{m.manage_pagination_show()}</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="flex h-8 w-14 items-center justify-between rounded-lg border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="font-rubik text-xs leading-3.5 text-body">
          {m.manage_pagination_of()}{" "}
          <strong>{total}</strong>{" "}
          {m.manage_pagination_entries()}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex size-8 items-center justify-center rounded-lg border border-field-line disabled:opacity-45"
        >
          <ChevronLeft className="size-4 text-body" />
        </button>

        {visiblePages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="flex size-8 items-center justify-center font-rubik text-[13px] font-semibold text-body"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={
                p === page
                  ? "flex size-8 items-center justify-center rounded-lg bg-blue font-rubik text-[13px] font-semibold text-white"
                  : "flex size-8 items-center justify-center rounded-lg border border-field-line font-rubik text-[13px] font-semibold text-body"
              }
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex size-8 items-center justify-center rounded-lg border border-field-line disabled:opacity-45"
        >
          <ChevronRight className="size-4 text-body" />
        </button>
      </div>
    </div>
  );
}
