import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { JobTypeSection, ServiceCategory } from "@rim-genie/db/schema";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

export const SECTION_LABELS: Record<JobTypeSection, string> = {
  rims: "Rims",
  "tire-service": "Tire Service",
  "brake-service": "Brake Service",
  "other-welding": "Other Welding",
  "powder-coating": "Powder Coating",
  "spot-polish": "Spot Polish",
};

const SECTION_TO_CATEGORY: Record<JobTypeSection, ServiceCategory> = {
  rims: "rim",
  "tire-service": "general",
  "brake-service": "general",
  "other-welding": "welding",
  "powder-coating": "powder_coating",
  "spot-polish": "rim",
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export interface JobTypeRow {
  id: string;
  category: ServiceCategory;
  section: JobTypeSection;
  parentId: string | null;
  key: string;
  label: string;
  description: string | null;
  config: { hasSubType?: boolean } | null;
  sortOrder: number;
  isActive: boolean;
}

interface JobTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobType?: JobTypeRow;
  defaultSection: JobTypeSection;
}

export function JobTypeModal({ open, onOpenChange, jobType, defaultSection }: JobTypeModalProps) {
  const isEdit = !!jobType;
  const queryClient = useQueryClient();

  const [section, setSection] = useState<JobTypeSection>(defaultSection);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [hasSubType, setHasSubType] = useState(false);
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (jobType) {
      setSection(jobType.section);
      setLabel(jobType.label);
      setKey(jobType.key);
      setKeyTouched(true);
      setParentId(jobType.parentId ?? "");
      setHasSubType(jobType.config?.hasSubType ?? false);
      setDescription(jobType.description ?? "");
      setSortOrder(String(jobType.sortOrder));
      setIsActive(jobType.isActive);
    } else {
      setSection(defaultSection);
      setLabel("");
      setKey("");
      setKeyTouched(false);
      setParentId("");
      setHasSubType(false);
      setDescription("");
      setSortOrder("0");
      setIsActive(true);
    }
  }, [open, jobType, defaultSection]);

  // Candidate parents = top-level job types in the selected section (excluding self).
  const { data: sectionRows } = useQuery({
    ...orpc.catalog.jobTypes.list.queryOptions({
      input: { section, page: 1, pageSize: 200 },
    }),
    enabled: open,
  });
  const parentOptions = (sectionRows?.items ?? []).filter(
    (r) => !r.parentId && r.id !== jobType?.id,
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.catalog.jobTypes.list.key() });

  const create = useMutation({
    ...orpc.catalog.jobTypes.create.mutationOptions(),
    onSuccess: async () => {
      await invalidate();
      toast.success("Job type created");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    ...orpc.catalog.jobTypes.update.mutationOptions(),
    onSuccess: async () => {
      await invalidate();
      toast.success("Job type updated");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isPending = create.isPending || update.isPending;
  const effectiveKey = keyTouched ? key : slug(label);

  const handleSubmit = () => {
    if (!label.trim() || !effectiveKey) return;
    const payload = {
      category: SECTION_TO_CATEGORY[section],
      section,
      parentId: parentId || null,
      key: effectiveKey,
      label: label.trim(),
      description: description.trim() || null,
      config: { hasSubType: parentId ? false : hasSubType },
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      isActive,
    };
    if (isEdit) update.mutate({ id: jobType.id, ...payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Job Type" : "Add Job Type"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-6 p-3"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Section</Label>
              <Select
                value={section}
                onValueChange={(val) => {
                  setSection((val ?? "rims") as JobTypeSection);
                  setParentId("");
                }}
              >
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
              <span className="font-rubik text-xs text-label">
                Category: {SECTION_TO_CATEGORY[section]}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Label</Label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Bend Fix"
                className="flex h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Key</Label>
              <input
                value={effectiveKey}
                onChange={(e) => {
                  setKeyTouched(true);
                  setKey(e.target.value);
                }}
                placeholder="auto from label"
                className="flex h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
              />
              <span className="font-rubik text-xs text-label">
                Stable identifier used to link pricing. Avoid changing it after prices exist.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Parent group (optional)</Label>
              <Select value={parentId} onValueChange={(val) => setParentId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectOption value="">None (top-level)</SelectOption>
                  {parentOptions.map((p) => (
                    <SelectOption key={p.id} value={p.id}>
                      {p.label}
                    </SelectOption>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            {!parentId && (
              <label className="flex items-center gap-2">
                <Checkbox checked={hasSubType} onCheckedChange={(c) => setHasSubType(c === true)} />
                <span className="font-rubik text-xs text-body">
                  Group header — reveals sub-types when selected
                </span>
              </label>
            )}

            <div className="flex flex-col gap-1">
              <Label>Description (optional)</Label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label>Sort order</Label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="flex h-9 w-24 rounded-md border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none"
                />
              </div>
              <label className="flex h-9 items-center gap-2">
                <Checkbox checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
                <span className="font-rubik text-xs text-body">Active</span>
              </label>
            </div>
          </div>

          <DialogFooter className="p-0">
            <DialogClose
              render={
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              }
            />
            <Button
              color="success"
              className="w-32"
              type="submit"
              disabled={isPending || !label.trim() || !effectiveKey}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
