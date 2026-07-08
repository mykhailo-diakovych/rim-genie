import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { JobTypeSection } from "@rim-genie/db/schema";

import { JobTypeModal, SECTION_LABELS } from "@/components/manage/job-type-modal";
import type { JobTypeRow } from "@/components/manage/job-type-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectOption, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { client, orpc } from "@/utils/orpc";

export function JobTypesTab() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<JobTypeSection>("rims");
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<JobTypeRow | null>(null);

  const { data, isLoading } = useQuery(
    orpc.catalog.jobTypes.list.queryOptions({ input: { section, page: 1, pageSize: 200 } }),
  );
  const rows = useMemo(() => data?.items ?? [], [data]);
  const labelById = useMemo(() => new Map(rows.map((r) => [r.id, r.label])), [rows]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.catalog.jobTypes.delete({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.catalog.jobTypes.list.key() });
      toast.success("Job type deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (row: JobTypeRow) => {
    const hasChildren = rows.some((r) => r.parentId === row.id);
    const msg = hasChildren
      ? `Delete "${row.label}" and all of its sub-types? This cannot be undone.`
      : `Delete "${row.label}"? This cannot be undone.`;
    if (window.confirm(msg)) deleteMutation.mutate(row.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="w-56">
          <Select value={section} onValueChange={(val) => setSection((val ?? "rims") as JobTypeSection)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {(Object.keys(SECTION_LABELS) as JobTypeSection[]).map((s) => (
                <SelectOption key={s} value={s}>
                  {SECTION_LABELS[s]}
                </SelectOption>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          Add Job Type
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
        <table className="w-full font-rubik text-sm">
          <thead>
            <tr className="border-b border-field-line text-left text-xs text-label">
              <th className="px-3 py-2 font-normal">Label</th>
              <th className="px-3 py-2 font-normal">Key</th>
              <th className="px-3 py-2 font-normal">Parent</th>
              <th className="w-24 px-3 py-2 text-center font-normal">Active</th>
              <th className="w-32 px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="animate-pulse border-b border-field-line last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-32 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-28 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-24 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-label">
                  No job types in {SECTION_LABELS[section]} yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-field-line last:border-b-0">
                <td className="px-3 py-2.5 text-body">
                  <span className={row.parentId ? "pl-4 text-label" : "font-medium"}>{row.label}</span>
                  {row.config?.hasSubType && (
                    <span className="ml-2 rounded bg-blue/10 px-1.5 py-0.5 text-xs text-blue">group</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-label">{row.key}</td>
                <td className="px-3 py-2.5 text-label">
                  {row.parentId ? (labelById.get(row.parentId) ?? "—") : "—"}
                </td>
                <td className="px-3 py-2.5 text-center text-label">{row.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditRow(row as JobTypeRow)}>
                      <Pencil />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      color="destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(row as JobTypeRow)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JobTypeModal open={addOpen} onOpenChange={setAddOpen} defaultSection={section} />
      <JobTypeModal
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        jobType={editRow ?? undefined}
        defaultSection={section}
      />
    </div>
  );
}
