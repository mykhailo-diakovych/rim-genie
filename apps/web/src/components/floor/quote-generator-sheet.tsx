import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Check, Info, X } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectOption,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobType =
  | "bend-fix"
  | "crack-fix"
  | "straighten"
  | "twist"
  | "reconstruct"
  | "general"
  | "welding";

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
  inches?: number;
  itemType?: "rim" | "welding";
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

// ─── Schemas ──────────────────────────────────────────────────────────────────

const rimsSchema = z.object({
  vehicleSize: z.string().min(1, "Vehicle size is required"),
  sideOfVehicle: z.string().min(1, "Side of vehicle is required"),
  damageLevel: z.string().min(1, "Damage level is required"),
  quantity: z.string().refine((v) => parseInt(v, 10) >= 1, "Quantity must be at least 1"),
});

const weldingSchema = z.object({
  weldingDesc: z.string(),
  weldingInches: z.string().refine((v) => parseInt(v, 10) > 0, "Inches is required"),
  weldingPricePerInch: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, "Price per inch is required"),
});

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
  itemType: string;
  vehicleSize: string | null;
  sideOfVehicle: string | null;
  damageLevel: string | null;
  quantity: number;
  unitCost: number;
  inches: number | null;
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

const RIM_DEFAULTS = { vehicleSize: "", sideOfVehicle: "", damageLevel: "", quantity: "1" };
const WELDING_DEFAULTS = { weldingDesc: "", weldingInches: "", weldingPricePerInch: "" };

export function QuoteGeneratorSheet({
  open,
  onClose,
  onAdd,
  onEdit,
  editItem,
  isAdding,
}: QuoteGeneratorSheetProps) {
  const [tab, setTab] = useState("rims");
  const [checkedJobs, setCheckedJobs] = useState<Partial<Record<JobType, boolean>>>({});
  const [jobInputs, setJobInputs] = useState<Partial<Record<JobType, string>>>({});
  const [jobTypeError, setJobTypeError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [rimSelects, setRimSelects] = useState({ vehicleSize: "", sideOfVehicle: "", damageLevel: "" });

  const { data: rimServices } = useQuery(
    orpc.floor.services.list.queryOptions({ input: { type: "rim" } }),
  );

  const rimForm = useForm({
    defaultValues: RIM_DEFAULTS,
    onSubmit: ({ value }) => {
      const hasJob = JOB_TYPES.some((j) => checkedJobs[j.value]);
      if (!hasJob) {
        setJobTypeError("Select at least one job type");
        return;
      }

      const selectedJobs = JOB_TYPES.filter((j) => checkedJobs[j.value]);
      const jobTypes: JobTypeEntry[] = selectedJobs.map((j) => ({
        type: j.value,
        input: jobInputs[j.value],
      }));

      const description = [
        value.vehicleSize ? `Vehicle: ${value.vehicleSize}` : null,
        value.sideOfVehicle ? `Side: ${value.sideOfVehicle}` : null,
        value.damageLevel ? `Damage: ${value.damageLevel.toUpperCase()}` : null,
        ...selectedJobs.map((j) => {
          const input = jobInputs[j.value];
          return input ? `${j.label}: ${input}` : j.label;
        }),
      ]
        .filter(Boolean)
        .join(", ");

      const selectedService = rimServices?.find((s) => s.id === selectedServiceId);
      const unitCost = selectedService ? selectedService.unitCost : (editItem?.unitCost ?? 0);

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.vehicleSize,
        sideOfVehicle: value.sideOfVehicle,
        damageLevel: value.damageLevel,
        quantity: parseInt(value.quantity, 10) || 1,
        unitCost,
        itemType: "rim",
        jobTypes,
        description,
      };

      if (editItem && onEdit) {
        onEdit(editItem.id, data);
      } else {
        onAdd(data);
      }

      handleClose();
    },
    validators: { onSubmit: rimsSchema },
  });

  const weldingForm = useForm({
    defaultValues: WELDING_DEFAULTS,
    onSubmit: ({ value }) => {
      const inches = parseInt(value.weldingInches, 10);
      const pricePerInchCents = Math.round(parseFloat(value.weldingPricePerInch) * 100);

      const desc =
        value.weldingDesc.trim() ||
        `Welding: ${inches}" @ $${(pricePerInchCents / 100).toFixed(2)}/in`;

      const data: QuoteGeneratorSheetData = {
        vehicleSize: null,
        sideOfVehicle: null,
        damageLevel: null,
        quantity: 1,
        unitCost: pricePerInchCents,
        inches,
        itemType: "welding",
        jobTypes: [{ type: "welding" }],
        description: desc,
      };

      if (editItem && onEdit) {
        onEdit(editItem.id, data);
      } else {
        onAdd(data);
      }

      handleClose();
    },
    validators: { onSubmit: weldingSchema },
  });

  useEffect(() => {
    if (!editItem) {
      setInitialized(null);
      return;
    }
    if (initialized === editItem.id) return;

    if (editItem.itemType === "welding") {
      setTab("other-welding");
      weldingForm.reset({
        weldingDesc: editItem.description ?? "",
        weldingInches: String(editItem.inches ?? ""),
        weldingPricePerInch: editItem.unitCost ? (editItem.unitCost / 100).toFixed(2) : "",
      });
      setSelectedServiceId(null);
    } else {
      setTab("rims");
      const vs = editItem.vehicleSize ?? "";
      const sv = editItem.sideOfVehicle ?? "";
      const dl = editItem.damageLevel ?? "";
      setRimSelects({ vehicleSize: vs, sideOfVehicle: sv, damageLevel: dl });
      rimForm.setFieldValue("vehicleSize", vs);
      rimForm.setFieldValue("sideOfVehicle", sv);
      rimForm.setFieldValue("damageLevel", dl);
      rimForm.setFieldValue("quantity", String(editItem.quantity));
      const matchedService = rimServices?.find((s) => s.unitCost === editItem.unitCost);
      setSelectedServiceId(matchedService?.id ?? null);
    }

    const checked: Partial<Record<JobType, boolean>> = {};
    const inputs: Partial<Record<JobType, string>> = {};
    for (const jt of editItem.jobTypes) {
      checked[jt.type] = true;
      if (jt.input) inputs[jt.type] = jt.input;
    }
    setCheckedJobs(checked);
    setJobInputs(inputs);
    setInitialized(editItem.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  function toggleJob(type: JobType, checked: boolean) {
    setCheckedJobs((prev) => ({ ...prev, [type]: checked }));
    if (checked) setJobTypeError(null);
  }

  function handleClose() {
    rimForm.reset();
    weldingForm.reset();
    setCheckedJobs({});
    setJobInputs({});
    setJobTypeError(null);
    setInitialized(null);
    setSelectedServiceId(null);
    setRimSelects({ vehicleSize: "", sideOfVehicle: "", damageLevel: "" });
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/75 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col bg-[#fafbfc] shadow-[-4px_0px_24px_0px_rgba(42,44,45,0.08)] transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  rimForm.handleSubmit();
                }}
                id="rim-form"
                className="flex flex-col gap-3"
              >
                <div className="flex gap-3">
                  <rimForm.Field name="vehicleSize">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-[12px] leading-[14px] text-label">
                          Vehicle Size:
                        </label>
                        <Select
                          value={rimSelects.vehicleSize || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setRimSelects((prev) => ({ ...prev, vehicleSize: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Small cars" />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectOption value="sedan">Sedan / Small cars</SelectOption>
                            <SelectOption value="mid-suv">Mid-Size SUV / Pick-up</SelectOption>
                            <SelectOption value="full-suv">Full-Size SUV / Pick-up</SelectOption>
                          </SelectPopup>
                        </Select>
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </rimForm.Field>
                  <rimForm.Field name="sideOfVehicle">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-[12px] leading-[14px] text-label">
                          Side of Vehicle:
                        </label>
                        <Select
                          value={rimSelects.sideOfVehicle || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setRimSelects((prev) => ({ ...prev, sideOfVehicle: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
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
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </rimForm.Field>
                </div>

                <div className="flex gap-3">
                  <rimForm.Field name="damageLevel">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-[12px] leading-[14px] text-label">
                          Damage Level:
                        </label>
                        <Select
                          value={rimSelects.damageLevel || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setRimSelects((prev) => ({ ...prev, damageLevel: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Medium" />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectOption value="low">Low</SelectOption>
                            <SelectOption value="medium">Medium</SelectOption>
                            <SelectOption value="high">High</SelectOption>
                          </SelectPopup>
                        </Select>
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </rimForm.Field>
                  <rimForm.Field name="quantity">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-[12px] leading-[14px] text-label">
                          Quantity:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-[8px] border bg-white px-2 font-rubik text-[12px] leading-[14px] text-body transition-colors outline-none",
                            field.state.meta.errors.length > 0
                              ? "border-red/50"
                              : "border-field-line",
                          )}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </rimForm.Field>
                </div>
              </form>

              {/* Service */}
              <div className="flex flex-col gap-1">
                <label className="font-rubik text-[12px] leading-[14px] text-label">Service:</label>
                {rimServices && rimServices.length > 0 ? (
                  <Select
                    value={selectedServiceId}
                    onValueChange={(v) => setSelectedServiceId(v as string)}
                  >
                    <SelectTrigger>
                      {selectedServiceId ? (
                        <span className="min-w-0 flex-1 truncate text-left text-body">
                          {(() => {
                            const s = rimServices.find((s) => s.id === selectedServiceId);
                            return s ? `${s.name} — $${(s.unitCost / 100).toFixed(2)}` : "Select a service";
                          })()}
                        </span>
                      ) : (
                        <SelectValue placeholder="Select a service" />
                      )}
                    </SelectTrigger>
                    <SelectPopup>
                      {rimServices.map((s) => (
                        <SelectOption key={s.id} value={s.id}>
                          {s.name} — ${(s.unitCost / 100).toFixed(2)}
                        </SelectOption>
                      ))}
                    </SelectPopup>
                  </Select>
                ) : (
                  <p className="font-rubik text-xs text-ghost">No services available</p>
                )}
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
                {jobTypeError && <p className="font-rubik text-xs text-red">{jobTypeError}</p>}
              </div>
            </TabsContent>

            <TabsContent value="other-welding" className="flex flex-col gap-4 pt-4">
              <div className="flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                  <Info className="size-5 text-blue" />
                </div>
                <p className="font-rubik text-xs leading-[14px] text-body">
                  Enter welding details below. Price is calculated per inch.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  weldingForm.handleSubmit();
                }}
                id="welding-form"
                className="flex flex-col gap-3"
              >
                <weldingForm.Field name="weldingDesc">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-[14px] text-label">
                        Description:
                      </label>
                      <input
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Barrel weld, lip reconstruction..."
                        className="flex h-9 w-full rounded-lg border border-field-line bg-white px-2 font-rubik text-xs leading-[14px] text-body outline-none placeholder:text-ghost"
                      />
                    </div>
                  )}
                </weldingForm.Field>
                <div className="flex gap-3">
                  <weldingForm.Field name="weldingInches">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-[14px] text-label">
                          Inches:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="0"
                          className={cn(
                            "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-[14px] text-body outline-none placeholder:text-ghost",
                            field.state.meta.errors.length > 0
                              ? "border-red/50"
                              : "border-field-line",
                          )}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </weldingForm.Field>
                  <weldingForm.Field name="weldingPricePerInch">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-[14px] text-label">
                          Price per inch ($):
                        </label>
                        <input
                          type="text"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="0.00"
                          className={cn(
                            "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-[14px] text-body outline-none placeholder:text-ghost",
                            field.state.meta.errors.length > 0
                              ? "border-red/50"
                              : "border-field-line",
                          )}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </weldingForm.Field>
                </div>
                <weldingForm.Subscribe selector={(state) => state.values}>
                  {(values) => {
                    const inches = parseInt(values.weldingInches, 10);
                    const price = parseFloat(values.weldingPricePerInch);
                    if (inches > 0 && price > 0) {
                      const total = inches * price;
                      return (
                        <div className="rounded-lg bg-page px-3 py-2 font-rubik text-sm text-body">
                          {inches}" &times; ${price.toFixed(2)}/in ={" "}
                          <span className="font-medium">${total.toFixed(2)}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                </weldingForm.Subscribe>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 border-t border-field-line bg-white p-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          {tab === "rims" ? (
            <rimForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit })}>
              {({ canSubmit }) => (
                <Button
                  color="success"
                  type="submit"
                  form="rim-form"
                  disabled={isAdding || !canSubmit}
                  className="w-32"
                >
                  {isAdding
                    ? editItem
                      ? "Updating..."
                      : "Adding..."
                    : editItem
                      ? "Update Item"
                      : "Add to Quote"}
                </Button>
              )}
            </rimForm.Subscribe>
          ) : (
            <weldingForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit })}>
              {({ canSubmit }) => (
                <Button
                  color="success"
                  type="submit"
                  form="welding-form"
                  disabled={isAdding || !canSubmit}
                  className="w-32"
                >
                  {isAdding
                    ? editItem
                      ? "Updating..."
                      : "Adding..."
                    : editItem
                      ? "Update Item"
                      : "Add to Quote"}
                </Button>
              )}
            </weldingForm.Subscribe>
          )}
        </div>
      </div>
    </>
  );
}
