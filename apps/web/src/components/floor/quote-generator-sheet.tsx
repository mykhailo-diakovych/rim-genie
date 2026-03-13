import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronDown, Info, X } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
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
  | "sprung"
  | "build-up"
  | "platinum-resurfacing"
  | "hand-polish"
  | "polishing"
  | "general"
  | "welding"
  | "powder-coating";

export type JobTypeEntry = {
  type: JobType;
  input?: string;
  workTypes?: string[];
  rimAvailable?: boolean;
  needsBuildUp?: boolean;
  comments?: string;
  subType?: string;
};

export interface QuoteGeneratorSheetData {
  vehicleSize: string | null;
  sideOfVehicle: string | null;
  damageLevel: string | null;
  quantity: number;
  unitCost: number;
  inches?: number;
  itemType?: "rim" | "welding" | "powder-coating" | "general";
  jobTypes: JobTypeEntry[];
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RIM_JOB_TYPES: {
  value: JobType;
  label: string;
  hasSubType?: boolean;
  subTypeLabel?: string;
  subTypeOptions?: string[];
  hasExpandedOptions?: boolean;
}[] = [
  { value: "bend-fix", label: "Bend Fix" },
  { value: "crack-fix", label: "Crack Fix" },
  { value: "straighten", label: "Straighten" },
  { value: "twist", label: "Twist" },
  { value: "reconstruct", label: "Reconstruct", hasExpandedOptions: true },
  {
    value: "sprung",
    label: "Sprung",
    hasSubType: true,
    subTypeLabel: "Type of damage:",
    subTypeOptions: ["Corner Damaged", "Edge Damaged", "Full Side Damaged"],
  },
  {
    value: "build-up",
    label: "Build Up",
    hasSubType: true,
    subTypeLabel: "Type of build up:",
    subTypeOptions: ["Back Edge", "Front Edge", "Full Lip", "Barrel"],
  },
  {
    value: "platinum-resurfacing",
    label: "Platinum Resurfacing",
    hasSubType: true,
    subTypeLabel: "Type of polishing:",
    subTypeOptions: ["Rim Face Only", "Full Rim", "Inner Barrel"],
  },
  { value: "hand-polish", label: "Hand Polish" },
  { value: "polishing", label: "Polishing" },
];

const RECONSTRUCT_WORK_TYPES = [
  "Full Front Repairs",
  "Full Back Repairs",
  "Three Quarter Damage",
  "Half Damage",
  "Quarter Damage",
];

const DAMAGE_DESCRIPTIONS: Record<string, string> = {
  low: "Low: Minor cosmetic damage. Surface scratches or light curb rash only.",
  medium:
    "Medium (Type 1): Older damage that is not severe. May include minor previous correction.",
  high: "High: Severe structural damage requiring extensive repair or reconstruction.",
};

const WELDING_MATERIAL_TYPES = ["Aluminium", "Steel", "Stainless Steel", "Cast Iron"];

const POWDER_COATING_COLORS = ["Black", "White", "Silver", "Gold", "Red", "Blue", "Grey"];

const GENERAL_SERVICE_TYPES = [
  { value: "disc-rotor-skimming", label: "Disc Rotor Skimming" },
  { value: "brake-drum-skimming", label: "Brake Drum Skimming" },
  { value: "computerized-balancing", label: "Computerized Balancing" },
  { value: "polishing", label: "Polishing" },
  { value: "filing", label: "Filing" },
  { value: "dismount-mount-tire", label: "Dismount and Mount Tire" },
  { value: "tire-plug", label: "Tire Plug" },
  { value: "change-valve", label: "Change of Valve" },
  { value: "remove-tire", label: "Remove Tire" },
  { value: "replace-tire", label: "Replace Tire" },
  { value: "remove-and-repair", label: "Remove and repair" },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const rimsSchema = z.object({
  rimSize: z.string().min(1, "Rim size is required"),
  rimType: z.string().min(1, "Rim type is required"),
  damageLevel: z.string().min(1, "Damage level is required"),
});

const weldingSchema = z.object({
  materialType: z.string().min(1, "Material type is required"),
  damageLevel: z.string().min(1, "Damage level is required"),
  quantity: z.string().refine((v) => parseInt(v, 10) > 0, "Quantity is required"),
  lengthOfWeld: z.string().refine((v) => parseInt(v, 10) > 0, "Length is required"),
  comments: z.string(),
});

const powderCoatingSchema = z.object({
  rimSize: z.string().min(1, "Rim size is required"),
  colorCoat: z.string().min(1, "Color coat is required"),
});

const generalSchema = z.object({
  vehicleSize: z.string().min(1, "Vehicle size is required"),
  tireSize: z.string().min(1, "Tire size is required"),
  numberOfTires: z.string().refine((v) => parseInt(v, 10) > 0, "Number of tires is required"),
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

// ─── Types for export ─────────────────────────────────────────────────────────

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

// ─── QuoteGeneratorSheet ──────────────────────────────────────────────────────

const RIM_DEFAULTS = { rimSize: "", rimType: "", damageLevel: "" };
const WELDING_DEFAULTS = {
  materialType: "",
  damageLevel: "",
  quantity: "1",
  lengthOfWeld: "",
  comments: "",
};
const POWDER_COATING_DEFAULTS = { rimSize: "", colorCoat: "" };
const GENERAL_DEFAULTS = { vehicleSize: "", tireSize: "", numberOfTires: "" };

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
  const [jobSubTypes, setJobSubTypes] = useState<Partial<Record<JobType, string>>>({});
  const [jobTypeError, setJobTypeError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<string | null>(null);

  // Reconstruct-specific state
  const [reconstructWorkTypes, setReconstructWorkTypes] = useState<string[]>([]);
  const [rimAvailable, setRimAvailable] = useState<string>("yes");
  const [needsBuildUp, setNeedsBuildUp] = useState<string>("no");
  const [reconstructComments, setReconstructComments] = useState("");

  const [rimSelects, setRimSelects] = useState({
    rimSize: "",
    rimType: "",
    damageLevel: "",
  });

  // Welding tab selects
  const [weldingSelects, setWeldingSelects] = useState({
    materialType: "",
    damageLevel: "",
  });

  // Powder coating tab selects
  const [pcSelects, setPcSelects] = useState({ rimSize: "", colorCoat: "" });

  // General tab state
  const [generalSelects, setGeneralSelects] = useState({ vehicleSize: "", tireSize: "" });
  const [checkedServices, setCheckedServices] = useState<Partial<Record<string, boolean>>>({});
  const [serviceTypeError, setServiceTypeError] = useState<string | null>(null);

  const { data: rimServices } = useQuery(
    orpc.floor.services.list.queryOptions({ input: { type: "rim" } }),
  );

  const rimForm = useForm({
    defaultValues: RIM_DEFAULTS,
    onSubmit: ({ value }) => {
      const hasJob = RIM_JOB_TYPES.some((j) => checkedJobs[j.value]);

      if (!hasJob) {
        setJobTypeError("Select at least one job type");
        return;
      }

      const selectedJobs = RIM_JOB_TYPES.filter((j) => checkedJobs[j.value]);
      const jobTypes: JobTypeEntry[] = selectedJobs.map((j) => {
        const entry: JobTypeEntry = { type: j.value };

        if (j.value === "reconstruct") {
          entry.workTypes = reconstructWorkTypes;
          entry.rimAvailable = rimAvailable === "yes";
          entry.needsBuildUp = needsBuildUp === "yes";
          entry.comments = reconstructComments || undefined;
        } else if (j.hasSubType) {
          entry.subType = jobSubTypes[j.value];
        }

        return entry;
      });

      const description = [
        `${value.rimSize}" Rims`,
        `Rim Type: ${value.rimType}`,
        `Damage: ${value.damageLevel.toUpperCase()}`,
        ...selectedJobs.map((j) => {
          if (j.hasSubType && jobSubTypes[j.value]) {
            return `${j.label}: ${jobSubTypes[j.value]}`;
          }
          return j.label;
        }),
      ]
        .filter(Boolean)
        .join(", ");

      // Calculate unit cost from first matching service, or use 0
      const matchedService = rimServices?.find((s) =>
        s.name.toLowerCase().includes(value.damageLevel.toLowerCase()),
      );
      const unitCost = matchedService?.unitCost ?? editItem?.unitCost ?? 0;

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.rimSize,
        sideOfVehicle: value.rimType,
        damageLevel: value.damageLevel,
        quantity: 1,
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
      const inches = parseInt(value.lengthOfWeld, 10);
      const qty = parseInt(value.quantity, 10);
      const desc = [
        `Welding: ${value.materialType}`,
        `Damage: ${value.damageLevel.toUpperCase()}`,
        `${inches}" weld`,
        value.comments?.trim() || null,
      ]
        .filter(Boolean)
        .join(", ");

      const data: QuoteGeneratorSheetData = {
        vehicleSize: null,
        sideOfVehicle: value.materialType,
        damageLevel: value.damageLevel,
        quantity: qty,
        unitCost: editItem?.unitCost ?? 0,
        inches,
        itemType: "welding",
        jobTypes: [{ type: "welding", subType: value.materialType }],
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

  const powderCoatingForm = useForm({
    defaultValues: POWDER_COATING_DEFAULTS,
    onSubmit: ({ value }) => {
      const desc = `Powder Coating: ${value.rimSize}" Rim, Color: ${value.colorCoat}`;
      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.rimSize,
        sideOfVehicle: value.colorCoat,
        damageLevel: null,
        quantity: 1,
        unitCost: editItem?.unitCost ?? 0,
        itemType: "powder-coating",
        jobTypes: [{ type: "powder-coating", subType: value.colorCoat }],
        description: desc,
      };

      if (editItem && onEdit) {
        onEdit(editItem.id, data);
      } else {
        onAdd(data);
      }

      handleClose();
    },
    validators: { onSubmit: powderCoatingSchema },
  });

  const generalForm = useForm({
    defaultValues: GENERAL_DEFAULTS,
    onSubmit: ({ value }) => {
      const selectedServices = GENERAL_SERVICE_TYPES.filter((s) => checkedServices[s.value]);
      if (selectedServices.length === 0) {
        setServiceTypeError("Select at least one service type");
        return;
      }
      const desc = [
        `General: ${value.vehicleSize}`,
        `Tire: ${value.tireSize}"`,
        ...selectedServices.map((s) => s.label),
      ].join(", ");

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.vehicleSize,
        sideOfVehicle: null,
        damageLevel: null,
        quantity: parseInt(value.numberOfTires, 10),
        unitCost: editItem?.unitCost ?? 0,
        inches: parseInt(value.tireSize, 10),
        itemType: "general",
        jobTypes: selectedServices.map((s) => ({ type: "general" as const, subType: s.value })),
        description: desc,
      };

      if (editItem && onEdit) {
        onEdit(editItem.id, data);
      } else {
        onAdd(data);
      }

      handleClose();
    },
    validators: { onSubmit: generalSchema },
  });

  useEffect(() => {
    if (!editItem) {
      setInitialized(null);
      return;
    }
    if (initialized === editItem.id) return;

    if (editItem.itemType === "welding") {
      setTab("other-welding");
      const mt = editItem.sideOfVehicle ?? "";
      const dl = editItem.damageLevel ?? "";
      setWeldingSelects({ materialType: mt, damageLevel: dl });
      weldingForm.reset({
        materialType: mt,
        damageLevel: dl,
        quantity: String(editItem.quantity),
        lengthOfWeld: String(editItem.inches ?? ""),
        comments: "",
      });
    } else if (editItem.itemType === "powder-coating") {
      setTab("powder-coating");
      const rs = editItem.vehicleSize ?? "";
      const cc = editItem.sideOfVehicle ?? "";
      setPcSelects({ rimSize: rs, colorCoat: cc });
      powderCoatingForm.reset({ rimSize: rs, colorCoat: cc });
    } else if (editItem.itemType === "general") {
      setTab("general");
      const vs = editItem.vehicleSize ?? "";
      const ts = String(editItem.inches ?? "");
      setGeneralSelects({ vehicleSize: vs, tireSize: ts });
      generalForm.reset({
        vehicleSize: vs,
        tireSize: ts,
        numberOfTires: String(editItem.quantity),
      });
      const svcChecked: Partial<Record<string, boolean>> = {};
      for (const jt of editItem.jobTypes) {
        if (jt.type === "general" && jt.subType) {
          svcChecked[jt.subType] = true;
        }
      }
      setCheckedServices(svcChecked);
    } else {
      setTab("rims");
      const rs = editItem.vehicleSize ?? "";
      const rt = editItem.sideOfVehicle ?? "";
      const dl = editItem.damageLevel ?? "";
      setRimSelects({ rimSize: rs, rimType: rt, damageLevel: dl });
      rimForm.setFieldValue("rimSize", rs);
      rimForm.setFieldValue("rimType", rt);
      rimForm.setFieldValue("damageLevel", dl);
    }

    const checked: Partial<Record<JobType, boolean>> = {};
    const subTypes: Partial<Record<JobType, string>> = {};
    for (const jt of editItem.jobTypes) {
      checked[jt.type] = true;
      if (jt.subType) subTypes[jt.type] = jt.subType;
      if (jt.type === "reconstruct") {
        setReconstructWorkTypes(jt.workTypes ?? []);
        setRimAvailable(jt.rimAvailable === false ? "no" : "yes");
        setNeedsBuildUp(jt.needsBuildUp ? "yes" : "no");
        setReconstructComments(jt.comments ?? "");
      }
    }
    setCheckedJobs(checked);
    setJobSubTypes(subTypes);
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
    powderCoatingForm.reset();
    generalForm.reset();
    setCheckedJobs({});
    setJobSubTypes({});
    setJobTypeError(null);
    setInitialized(null);
    setReconstructWorkTypes([]);
    setRimAvailable("yes");
    setNeedsBuildUp("no");
    setReconstructComments("");
    setRimSelects({ rimSize: "", rimType: "", damageLevel: "" });
    setWeldingSelects({ materialType: "", damageLevel: "" });
    setPcSelects({ rimSize: "", colorCoat: "" });
    setGeneralSelects({ vehicleSize: "", tireSize: "" });
    setCheckedServices({});
    setServiceTypeError(null);
    onClose();
  }

  function removeWorkType(wt: string) {
    setReconstructWorkTypes((prev) => prev.filter((t) => t !== wt));
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
          className={`absolute top-3.5 -left-9 flex items-center justify-center rounded-tl-lg rounded-bl-lg bg-blue p-2 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Close"
        >
          <X className="size-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-0.5 border-b border-field-line p-3">
          <p className="font-rubik text-base leading-5 font-medium text-body">
            {editItem ? "Edit Item" : "Quote Generator"}
          </p>
          <p className="font-rubik text-xs leading-4 text-label">
            {editItem ? "Modify the item details below" : "Use options below to generate quote"}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col overflow-y-auto pb-10">
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <div className="border-b border-field-line px-3">
              <TabsList className="border-0">
                <TabsTrigger value="rims" className="px-2 whitespace-nowrap">
                  Rims
                </TabsTrigger>
                <TabsTrigger value="other-welding" className="px-2 whitespace-nowrap">
                  Other Welding
                </TabsTrigger>
                <TabsTrigger value="powder-coating" className="px-2 whitespace-nowrap">
                  Powder Coating
                </TabsTrigger>
                <TabsTrigger value="general" className="px-2 whitespace-nowrap">
                  General
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─── Rims Tab ─── */}
            <TabsContent value="rims" className="flex flex-col gap-6 pt-4">
              {/* Info banner */}
              <div className="px-3">
                <div className="flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                    <Info className="size-5 text-blue" />
                  </div>
                  <p className="font-rubik text-xs leading-3.5 text-body">
                    Enter description of rim job below and then tap{" "}
                    <span className="font-medium">Add to Quote</span>
                  </p>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  rimForm.handleSubmit();
                }}
                id="rim-form"
                className="flex flex-col gap-3 px-3"
              >
                <div className="flex gap-3">
                  <rimForm.Field name="rimSize">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Rim Size:
                        </label>
                        <Select
                          value={rimSelects.rimSize || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setRimSelects((prev) => ({ ...prev, rimSize: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select rim size" />
                          </SelectTrigger>
                          <SelectPopup>
                            {Array.from({ length: 16 }, (_, i) => i + 13).map((size) => (
                              <SelectOption key={size} value={String(size)}>
                                {size}"
                              </SelectOption>
                            ))}
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
                  <rimForm.Field name="rimType">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Rim Type:
                        </label>
                        <Select
                          value={rimSelects.rimType || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setRimSelects((prev) => ({ ...prev, rimType: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectOption value="Factory">Factory</SelectOption>
                            <SelectOption value="Aftermarket">Aftermarket</SelectOption>
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

                <rimForm.Field name="damageLevel">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-3.5 text-label">
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
                        <SelectTrigger
                          className="capitalize"
                          error={field.state.meta.errors.length > 0}
                        >
                          <SelectValue placeholder="Select level" />
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
                      {rimSelects.damageLevel && DAMAGE_DESCRIPTIONS[rimSelects.damageLevel] && (
                        <div className="mt-1 flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                          <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                            <Info className="size-5 text-blue" />
                          </div>
                          <p className="font-rubik text-xs leading-3.5 text-body">
                            <span className="font-medium">
                              {rimSelects.damageLevel === "medium"
                                ? "Medium (Type 1):"
                                : rimSelects.damageLevel === "low"
                                  ? "Low:"
                                  : "High:"}
                            </span>{" "}
                            {DAMAGE_DESCRIPTIONS[rimSelects.damageLevel]
                              .split(": ")
                              .slice(1)
                              .join(": ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </rimForm.Field>
              </form>

              {/* Job Types */}
              <div className="flex flex-col gap-1">
                <p className="px-3 font-rubik text-xs leading-3.5 font-medium text-body">
                  Job Type:
                </p>
                <div className="flex flex-col gap-1">
                  {RIM_JOB_TYPES.map((job) => {
                    const isChecked = !!checkedJobs[job.value];
                    return (
                      <div key={job.value}>
                        <div
                          className={cn(
                            "flex items-center gap-4 px-3 py-2",
                            isChecked && "bg-page",
                          )}
                        >
                          <div className="flex flex-1 items-center gap-1.5">
                            <FloorCheckbox
                              checked={isChecked}
                              onCheckedChange={(c) => toggleJob(job.value, !!c)}
                            />
                            <span className="font-rubik text-sm leading-[18px] text-body">
                              {job.label}
                            </span>
                          </div>
                          {job.hasSubType && isChecked && (
                            <div className="flex w-40 flex-col gap-1">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                {job.subTypeLabel}
                              </label>
                              <Select
                                value={jobSubTypes[job.value] ?? null}
                                onValueChange={(v) =>
                                  setJobSubTypes((prev) => ({
                                    ...prev,
                                    [job.value]: v as string,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectPopup>
                                  {job.subTypeOptions?.map((opt) => (
                                    <SelectOption key={opt} value={opt}>
                                      {opt}
                                    </SelectOption>
                                  ))}
                                </SelectPopup>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Reconstruct expanded options */}
                        {job.hasExpandedOptions && isChecked && (
                          <div className="flex flex-col gap-4 bg-page px-3 py-2">
                            {/* Type of work multi-tag */}
                            <div className="flex flex-col gap-1">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                Type of work:
                              </label>
                              <div className="flex min-h-9 items-center rounded-lg border border-field-line bg-white py-1 pr-2 pl-1">
                                <div className="flex flex-1 flex-wrap gap-1">
                                  {reconstructWorkTypes.map((wt) => (
                                    <span
                                      key={wt}
                                      className="flex h-8 items-center gap-2 rounded-md bg-blue py-1 pr-1.5 pl-2 font-rubik text-xs text-white"
                                    >
                                      {wt}
                                      <button
                                        type="button"
                                        onClick={() => removeWorkType(wt)}
                                        className="flex items-center justify-center"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <div className="relative">
                                  <select
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    value=""
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val && !reconstructWorkTypes.includes(val)) {
                                        setReconstructWorkTypes((prev) => [...prev, val]);
                                      }
                                    }}
                                  >
                                    <option value="">Add...</option>
                                    {RECONSTRUCT_WORK_TYPES.filter(
                                      (wt) => !reconstructWorkTypes.includes(wt),
                                    ).map((wt) => (
                                      <option key={wt} value={wt}>
                                        {wt}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="size-4 text-ghost" />
                                </div>
                              </div>
                            </div>

                            {/* Is there a rim available? */}
                            <div className="flex flex-col gap-2">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                Is there a rim available?
                              </label>
                              <RadioGroup
                                value={rimAvailable}
                                onValueChange={(v) => setRimAvailable(v as string)}
                                className="flex items-center gap-6"
                              >
                                <label className="flex cursor-pointer items-center gap-1.5">
                                  <Radio.Root
                                    value="yes"
                                    className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[#cdcfd1] bg-white transition-colors data-checked:border-blue"
                                  >
                                    <Radio.Indicator className="size-2 rounded-full bg-blue" />
                                  </Radio.Root>
                                  <span className="font-rubik text-sm leading-[18px] text-body">
                                    Yes, Rim is available
                                  </span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5">
                                  <Radio.Root
                                    value="no"
                                    className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[#cdcfd1] bg-white transition-colors data-checked:border-blue"
                                  >
                                    <Radio.Indicator className="size-2 rounded-full bg-blue" />
                                  </Radio.Root>
                                  <span className="font-rubik text-sm leading-[18px] text-body">
                                    No, Rim is NOT available
                                  </span>
                                </label>
                              </RadioGroup>
                              {rimAvailable === "no" && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="size-4 shrink-0 text-red" />
                                  <span className="font-rubik text-xs leading-3.5 text-red">
                                    Must source rim to complete job. Additional charges apply.
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Will rim need build up? */}
                            <div className="flex flex-col gap-2">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                Will rim need build up?
                              </label>
                              <RadioGroup
                                value={needsBuildUp}
                                onValueChange={(v) => setNeedsBuildUp(v as string)}
                                className="flex items-center gap-6"
                              >
                                <label className="flex cursor-pointer items-center gap-1.5">
                                  <Radio.Root
                                    value="yes"
                                    className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[#cdcfd1] bg-white transition-colors data-checked:border-blue"
                                  >
                                    <Radio.Indicator className="size-2 rounded-full bg-blue" />
                                  </Radio.Root>
                                  <span className="font-rubik text-sm leading-[18px] text-body">
                                    Yes
                                  </span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5">
                                  <Radio.Root
                                    value="no"
                                    className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[#cdcfd1] bg-white transition-colors data-checked:border-blue"
                                  >
                                    <Radio.Indicator className="size-2 rounded-full bg-blue" />
                                  </Radio.Root>
                                  <span className="font-rubik text-sm leading-[18px] text-body">
                                    No
                                  </span>
                                </label>
                              </RadioGroup>
                            </div>

                            {/* Comments */}
                            <div className="flex flex-col gap-1">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                Comments:
                              </label>
                              <textarea
                                value={reconstructComments}
                                onChange={(e) => setReconstructComments(e.target.value)}
                                className="min-h-[70px] w-full resize-none rounded-lg border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-[#a0a3a0]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {jobTypeError && <p className="px-3 font-rubik text-xs text-red">{jobTypeError}</p>}
              </div>
            </TabsContent>

            {/* ─── Other Welding Tab ─── */}
            {/* ─── Other Welding Tab ─── */}
            <TabsContent value="other-welding" className="flex flex-col gap-4 pt-4">
              <div className="px-3">
                <div className="flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                    <Info className="size-5 text-blue" />
                  </div>
                  <p className="font-rubik text-xs leading-3.5 text-body">
                    Enter description of welding job below and then tap{" "}
                    <span className="font-medium">Add to Quote</span>
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  weldingForm.handleSubmit();
                }}
                id="welding-form"
                className="flex flex-col gap-3 px-3"
              >
                <weldingForm.Field name="materialType">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-3.5 text-label">
                        Material Type:
                      </label>
                      <Select
                        value={weldingSelects.materialType || null}
                        onValueChange={(v) => {
                          const val = v as string;
                          setWeldingSelects((prev) => ({ ...prev, materialType: val }));
                          field.handleChange(val);
                        }}
                      >
                        <SelectTrigger error={field.state.meta.errors.length > 0}>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectPopup>
                          {WELDING_MATERIAL_TYPES.map((mt) => (
                            <SelectOption key={mt} value={mt}>
                              {mt}
                            </SelectOption>
                          ))}
                        </SelectPopup>
                      </Select>
                    </div>
                  )}
                </weldingForm.Field>

                <weldingForm.Field name="damageLevel">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-3.5 text-label">
                        Damage Level:
                      </label>
                      <Select
                        value={weldingSelects.damageLevel || null}
                        onValueChange={(v) => {
                          const val = v as string;
                          setWeldingSelects((prev) => ({ ...prev, damageLevel: val }));
                          field.handleChange(val);
                        }}
                      >
                        <SelectTrigger
                          className="capitalize"
                          error={field.state.meta.errors.length > 0}
                        >
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectOption value="low">Low</SelectOption>
                          <SelectOption value="medium">Medium</SelectOption>
                          <SelectOption value="high">High</SelectOption>
                        </SelectPopup>
                      </Select>
                      {weldingSelects.damageLevel &&
                        DAMAGE_DESCRIPTIONS[weldingSelects.damageLevel] && (
                          <div className="mt-1 flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                            <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                              <Info className="size-5 text-blue" />
                            </div>
                            <p className="font-rubik text-xs leading-3.5 text-body">
                              <span className="font-medium">
                                {weldingSelects.damageLevel === "medium"
                                  ? "Medium (Type 1):"
                                  : weldingSelects.damageLevel === "low"
                                    ? "Low:"
                                    : "High:"}
                              </span>{" "}
                              {DAMAGE_DESCRIPTIONS[weldingSelects.damageLevel]
                                .split(": ")
                                .slice(1)
                                .join(": ")}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </weldingForm.Field>

                <div className="flex gap-3">
                  <weldingForm.Field name="quantity">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Quantity:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="1"
                          className={cn(
                            "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost",
                            field.state.meta.errors.length > 0
                              ? "border-red/50"
                              : "border-field-line",
                          )}
                        />
                      </div>
                    )}
                  </weldingForm.Field>
                  <weldingForm.Field name="lengthOfWeld">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Length of weld (in inches):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Enter length"
                          className={cn(
                            "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost",
                            field.state.meta.errors.length > 0
                              ? "border-red/50"
                              : "border-field-line",
                          )}
                        />
                      </div>
                    )}
                  </weldingForm.Field>
                </div>

                <weldingForm.Field name="comments">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-3.5 text-label">Comments:</label>
                      <textarea
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="min-h-[70px] w-full resize-none rounded-lg border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-ghost"
                      />
                    </div>
                  )}
                </weldingForm.Field>
              </form>
            </TabsContent>

            {/* ─── Powder Coating Tab ─── */}
            <TabsContent value="powder-coating" className="flex flex-col gap-4 pt-4">
              <div className="px-3">
                <div className="flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                    <Info className="size-5 text-blue" />
                  </div>
                  <p className="font-rubik text-xs leading-3.5 text-body">
                    Enter description of powder coating below and then tap{" "}
                    <span className="font-medium">Add to Quote</span>
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  powderCoatingForm.handleSubmit();
                }}
                id="powder-coating-form"
                className="flex flex-col gap-3 px-3"
              >
                <div className="flex gap-3">
                  <powderCoatingForm.Field name="rimSize">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Rim Size:
                        </label>
                        <Select
                          value={pcSelects.rimSize || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setPcSelects((prev) => ({ ...prev, rimSize: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select rim size" />
                          </SelectTrigger>
                          <SelectPopup>
                            {Array.from({ length: 16 }, (_, i) => i + 13).map((size) => (
                              <SelectOption key={size} value={String(size)}>
                                {size}"
                              </SelectOption>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    )}
                  </powderCoatingForm.Field>
                  <powderCoatingForm.Field name="colorCoat">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Color Coat:
                        </label>
                        <Select
                          value={pcSelects.colorCoat || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setPcSelects((prev) => ({ ...prev, colorCoat: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectPopup>
                            {POWDER_COATING_COLORS.map((color) => (
                              <SelectOption key={color} value={color}>
                                {color}
                              </SelectOption>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    )}
                  </powderCoatingForm.Field>
                </div>
              </form>
            </TabsContent>

            {/* ─── General Tab ─── */}
            <TabsContent value="general" className="flex flex-col gap-4 pt-4">
              <div className="px-3">
                <div className="flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                    <Info className="size-5 text-blue" />
                  </div>
                  <p className="font-rubik text-xs leading-3.5 text-body">
                    Enter description of general below and then tap{" "}
                    <span className="font-medium">Add to Quote</span>
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  generalForm.handleSubmit();
                }}
                id="general-form"
                className="flex flex-col gap-4"
              >
                <div className="flex gap-3 px-3">
                  <generalForm.Field name="vehicleSize">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Vehicle Size:
                        </label>
                        <Select
                          value={generalSelects.vehicleSize || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setGeneralSelects((prev) => ({ ...prev, vehicleSize: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select vehicle size" />
                          </SelectTrigger>
                          <SelectPopup>
                            {["Sedan", "SUV", "Truck", "Van", "Motorcycle"].map((v) => (
                              <SelectOption key={v} value={v}>
                                {v}
                              </SelectOption>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    )}
                  </generalForm.Field>
                  <generalForm.Field name="tireSize">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Tire Size:
                        </label>
                        <Select
                          value={generalSelects.tireSize || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setGeneralSelects((prev) => ({ ...prev, tireSize: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectPopup>
                            {Array.from({ length: 16 }, (_, i) => i + 13).map((size) => (
                              <SelectOption key={size} value={String(size)}>
                                {size} inches
                              </SelectOption>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    )}
                  </generalForm.Field>
                </div>

                {/* Service Type checkboxes */}
                <div className="flex flex-col gap-1">
                  <p className="px-3 font-rubik text-xs leading-3.5 font-medium text-body">
                    Service Type:
                  </p>
                  <div className="flex flex-col gap-1">
                    {GENERAL_SERVICE_TYPES.map((svc) => {
                      const isChecked = !!checkedServices[svc.value];
                      return (
                        <div
                          key={svc.value}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2",
                            isChecked && "bg-page",
                          )}
                        >
                          <FloorCheckbox
                            checked={isChecked}
                            onCheckedChange={(c) => {
                              setCheckedServices((prev) => ({ ...prev, [svc.value]: !!c }));
                              if (c) setServiceTypeError(null);
                            }}
                          />
                          <span className="font-rubik text-sm leading-[18px] text-body">
                            {svc.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {serviceTypeError && (
                    <p className="px-3 font-rubik text-xs text-red">{serviceTypeError}</p>
                  )}
                </div>

                <generalForm.Field name="numberOfTires">
                  {(field) => (
                    <div className="flex flex-col gap-1 px-3">
                      <label className="font-rubik text-xs leading-3.5 text-label">
                        No. of Tires:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Enter number"
                        className={cn(
                          "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost",
                          field.state.meta.errors.length > 0
                            ? "border-red/50"
                            : "border-field-line",
                        )}
                      />
                    </div>
                  )}
                </generalForm.Field>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Total amount bar */}
        <div className="flex h-10 items-center border-t border-[#d6e6f6] bg-[#ebf5ff] px-3">
          <div className="flex items-center gap-2 font-rubik text-sm leading-[18px]">
            <span className="text-label">Total amount:</span>
            <span className="font-medium text-body">
              ${((editItem?.unitCost ?? 0) / 100).toFixed(0) || "0"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 border-t border-field-line bg-white p-3">
          <Button variant="ghost" onClick={handleClose} className="w-18">
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
                      : "Add to Job"}
                </Button>
              )}
            </rimForm.Subscribe>
          ) : tab === "other-welding" ? (
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
                      : "Add to Job"}
                </Button>
              )}
            </weldingForm.Subscribe>
          ) : tab === "powder-coating" ? (
            <powderCoatingForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit })}>
              {({ canSubmit }) => (
                <Button
                  color="success"
                  type="submit"
                  form="powder-coating-form"
                  disabled={isAdding || !canSubmit}
                  className="w-32"
                >
                  {isAdding
                    ? editItem
                      ? "Updating..."
                      : "Adding..."
                    : editItem
                      ? "Update Item"
                      : "Add to Job"}
                </Button>
              )}
            </powderCoatingForm.Subscribe>
          ) : (
            <generalForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit })}>
              {({ canSubmit }) => (
                <Button
                  color="success"
                  type="submit"
                  form="general-form"
                  disabled={isAdding || !canSubmit}
                  className="w-32"
                >
                  {isAdding
                    ? editItem
                      ? "Updating..."
                      : "Adding..."
                    : editItem
                      ? "Update Item"
                      : "Add to Job"}
                </Button>
              )}
            </generalForm.Subscribe>
          )}
        </div>
      </div>
    </>
  );
}
