import { useState } from "react";
import { Check, Info, X } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectOption,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobType = "bend-fix" | "crack-fix" | "straighten" | "twist" | "reconstruct" | "general";

export type JobTypeEntry = {
  type: JobType;
  input?: string;
};

export interface QuoteGeneratorSheetData {
  vehicleSize: string | null;
  sideOfVehicle: string | null;
  damageLevel: string | null;
  quantity: number;
  unitCost: number;
  jobTypes: JobTypeEntry[];
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const JOB_TYPES: {
  value: JobType;
  label: string;
  hasInput?: boolean;
  inputPlaceholder?: string;
}[] = [
  { value: "bend-fix", label: "Bend Fix", hasInput: true, inputPlaceholder: "No. of Bends" },
  { value: "crack-fix", label: "Crack Fix" },
  { value: "straighten", label: "Straighten" },
  { value: "twist", label: "Twist" },
  { value: "reconstruct", label: "Reconstruct", hasInput: true, inputPlaceholder: "No. of Bends" },
  { value: "general", label: "General" },
];

// ─── FloorCheckbox ────────────────────────────────────────────────────────────

export function FloorCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.2px] border-[#cdcfd1] bg-white transition-colors outline-none data-checked:border-blue data-checked:bg-blue"
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

// ─── QuoteGeneratorSheet ──────────────────────────────────────────────────────

export interface QuoteGeneratorEditItem {
  id: string;
  vehicleSize: string | null;
  sideOfVehicle: string | null;
  damageLevel: string | null;
  quantity: number;
  unitCost: number;
  jobTypes: JobTypeEntry[];
  description: string | null;
}

interface QuoteGeneratorSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: QuoteGeneratorSheetData) => void;
  onEdit?: (itemId: string, data: QuoteGeneratorSheetData) => void;
  editItem?: QuoteGeneratorEditItem | null;
  isAdding?: boolean;
}

export function QuoteGeneratorSheet({
  open,
  onClose,
  onAdd,
  onEdit,
  editItem,
  isAdding,
}: QuoteGeneratorSheetProps) {
  const [tab, setTab] = useState("rims");
  const [vehicleSize, setVehicleSize] = useState<string | null>(null);
  const [sideOfVehicle, setSideOfVehicle] = useState<string | null>(null);
  const [damageLevel, setDamageLevel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [checkedJobs, setCheckedJobs] = useState<Partial<Record<JobType, boolean>>>({});
  const [jobInputs, setJobInputs] = useState<Partial<Record<JobType, string>>>({});
  const [initialized, setInitialized] = useState<string | null>(null);

  if (editItem && initialized !== editItem.id) {
    setVehicleSize(editItem.vehicleSize);
    setSideOfVehicle(editItem.sideOfVehicle);
    setDamageLevel(editItem.damageLevel);
    setQuantity(String(editItem.quantity));
    const checked: Partial<Record<JobType, boolean>> = {};
    const inputs: Partial<Record<JobType, string>> = {};
    for (const jt of editItem.jobTypes) {
      checked[jt.type] = true;
      if (jt.input) inputs[jt.type] = jt.input;
    }
    setCheckedJobs(checked);
    setJobInputs(inputs);
    setInitialized(editItem.id);
  }

  if (!editItem && initialized !== null) {
    setInitialized(null);
  }

  function toggleJob(type: JobType, checked: boolean) {
    setCheckedJobs((prev) => ({ ...prev, [type]: checked }));
  }

  function resetForm() {
    setVehicleSize(null);
    setSideOfVehicle(null);
    setDamageLevel(null);
    setQuantity("1");
    setCheckedJobs({});
    setJobInputs({});
    setInitialized(null);
  }

  function handleSubmit() {
    const selectedJobs = JOB_TYPES.filter((j) => checkedJobs[j.value]);
    if (selectedJobs.length === 0) return;

    const jobTypes: JobTypeEntry[] = selectedJobs.map((j) => ({
      type: j.value,
      input: jobInputs[j.value],
    }));

    const description = [
      vehicleSize ? `Vehicle: ${vehicleSize}` : null,
      sideOfVehicle ? `Side: ${sideOfVehicle}` : null,
      damageLevel ? `Damage: ${damageLevel.toUpperCase()}` : null,
      ...selectedJobs.map((j) => {
        const input = jobInputs[j.value];
        return input ? `${j.label}: ${input}` : j.label;
      }),
    ]
      .filter(Boolean)
      .join(", ");

    const data: QuoteGeneratorSheetData = {
      vehicleSize,
      sideOfVehicle,
      damageLevel,
      quantity: parseInt(quantity, 10) || 1,
      unitCost: editItem?.unitCost ?? 0,
      jobTypes,
      description,
    };

    if (editItem && onEdit) {
      onEdit(editItem.id, data);
    } else {
      onAdd(data);
    }

    resetForm();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/75 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col bg-[#fafbfc] shadow-[-4px_0px_24px_0px_rgba(42,44,45,0.08)] transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 -left-9 flex items-center justify-center rounded-tl-[8px] rounded-bl-[8px] bg-blue p-2 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Close"
        >
          <X className="size-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-0.5 border-b border-field-line p-3">
          <p className="font-rubik text-[16px] leading-[20px] font-medium text-body">
            {editItem ? "Edit Item" : "Quote Generator"}
          </p>
          <p className="font-rubik text-xs leading-4 text-label">
            {editItem ? "Modify the item details below" : "Use options below to generate quote"}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <TabsList>
              <TabsTrigger value="rims">Rims</TabsTrigger>
              <TabsTrigger value="other-welding">Other Welding</TabsTrigger>
            </TabsList>

            <TabsContent value="rims" className="flex flex-col gap-4 pt-4">
              {/* Info banner */}
              <div className="flex items-center gap-3 rounded-md bg-[#ebf5ff] px-3 py-2">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                  <Info className="size-5 text-blue" />
                </div>
                <p className="font-rubik text-xs leading-3.5 text-body">
                  Enter description of rim job below and then tap{" "}
                  <span className="font-medium">Add to Quote</span>
                </p>
              </div>

              {/* Form */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="font-rubik text-xs leading-3.5 text-label">
                      Vehicle Size:
                    </label>
                    <Select value={vehicleSize} onValueChange={setVehicleSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Small cars" />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectOption value="sedan">Sedan / Small cars</SelectOption>
                        <SelectOption value="mid-suv">Mid-Size SUV / Pick-up</SelectOption>
                        <SelectOption value="full-suv">Full-Size SUV / Pick-up</SelectOption>
                      </SelectPopup>
                    </Select>
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="font-rubik text-xs leading-3.5 text-label">
                      Side of Vehicle:
                    </label>
                    <Select value={sideOfVehicle} onValueChange={setSideOfVehicle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Left" />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectOption value="left">Left</SelectOption>
                        <SelectOption value="right">Right</SelectOption>
                        <SelectOption value="front">Front</SelectOption>
                        <SelectOption value="rear">Rear</SelectOption>
                        <SelectOption value="all">All</SelectOption>
                      </SelectPopup>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="font-rubik text-xs leading-3.5 text-label">
                      Damage Level:
                    </label>
                    <Select value={damageLevel} onValueChange={setDamageLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Medium" />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectOption value="low">Low</SelectOption>
                        <SelectOption value="medium">Medium</SelectOption>
                        <SelectOption value="high">High</SelectOption>
                      </SelectPopup>
                    </Select>
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="font-rubik text-xs leading-3.5 text-label">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body transition-colors outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Job Types */}
              <div className="flex flex-col gap-1">
                <p className="font-rubik text-xs leading-3.5 font-medium text-body">Job Type:</p>
                <div className="flex flex-col gap-2">
                  {JOB_TYPES.map((job) => (
                    <div key={job.value} className="flex h-9 items-center gap-3">
                      <div className="flex flex-1 items-center gap-1.5">
                        <FloorCheckbox
                          checked={!!checkedJobs[job.value]}
                          onCheckedChange={(c) => toggleJob(job.value, !!c)}
                        />
                        <span className="font-rubik text-sm leading-4.5 text-body">
                          {job.label}
                        </span>
                      </div>
                      {job.hasInput && (
                        <input
                          type="text"
                          placeholder={job.inputPlaceholder}
                          value={jobInputs[job.value] ?? ""}
                          onChange={(e) =>
                            setJobInputs((prev) => ({ ...prev, [job.value]: e.target.value }))
                          }
                          className="flex h-9 w-[172px] shrink-0 rounded-md border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body transition-colors outline-none placeholder:text-ghost"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="other-welding" className="flex flex-col gap-4 pt-4">
              <p className="font-rubik text-xs leading-3.5 text-label">
                Other welding options coming soon.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 border-t border-field-line bg-white p-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button color="success" onClick={handleSubmit} disabled={isAdding} className="w-32">
            {isAdding
              ? editItem
                ? "Updating..."
                : "Adding..."
              : editItem
                ? "Update Item"
                : "Add to Quote"}
          </Button>
        </div>
      </div>
    </>
  );
}
