import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronDown, Info, Plus, X } from "lucide-react";
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

  comments?: string;
  subType?: string;
};

export interface QuoteGeneratorSheetData {
  vehicleSize: string | null;
  sideOfVehicle: string | null;
  damageLevel: string | null;
  vehicleType?: "truck" | "car_suv" | "motorcycle" | null;
  rimMaterial?: "steel" | "aluminum" | null;
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
  hasInchesInput?: boolean;
}[] = [
  { value: "bend-fix", label: "Bend Fix" },
  { value: "crack-fix", label: "Crack Fix" },
  { value: "straighten", label: "Straighten" },
  { value: "twist", label: "Twist" },
  { value: "reconstruct", label: "Reconstruct", hasExpandedOptions: true },
  {
    value: "sprung",
    label: "Sprong",
    hasSubType: true,
    subTypeLabel: "Type of damage:",
    subTypeOptions: ["Corner Damage", "Broken Sprong"],
  },
  {
    value: "build-up",
    label: "Build Up",
    hasSubType: true,
    subTypeLabel: "Type of build up:",
    subTypeOptions: ["Back Edge", "Front Edge", "Full Lip", "Barrel"],
    hasInchesInput: true,
  },
  {
    value: "platinum-resurfacing",
    label: "Platinum Resurfacing",
    hasSubType: true,
    subTypeLabel: "Type of polishing:",
    subTypeOptions: ["Full Face", "Full Lip", "Lip + Face"],
  },
  {
    value: "polishing",
    label: "Spot Polishing",
    hasSubType: true,
    subTypeLabel: "How many spots?",
    subTypeOptions: ["1 Spot", "2 Spots", "3 Spots"],
  },
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

const BRAKE_SERVICE_TYPES = [
  { value: "disc-rotor-skimming", label: "Disc Rotor Skimming", quantityLabel: "How many pairs?" },
  { value: "brake-drum-skimming", label: "Brake Drum Skimming", quantityLabel: "How many pairs?" },
];

const TIRE_SERVICE_TYPES = [
  {
    value: "computerized-balancing",
    label: "Computerized Balancing",
    quantityLabel: "How many tires?",
  },
  {
    value: "dismount-mount-tire",
    label: "Dismount and Mount Tire",
    quantityLabel: "How many tires?",
  },
  { value: "dismount-only", label: "Dismount (Remove) Only", quantityLabel: "How many tires?" },
  { value: "mount-only", label: "Mount (Replace) Tire Only", quantityLabel: "How many tires?" },
  { value: "tire-plug", label: "Tire Plug", quantityLabel: "How many plugs?" },
  { value: "change-valve", label: "Change of Valve", quantityLabel: "How many valves?" },
];

const GENERAL_SERVICE_TYPES = [...BRAKE_SERVICE_TYPES, ...TIRE_SERVICE_TYPES];

const VEHICLE_TYPE_MAP: Record<string, "truck" | "car_suv" | "motorcycle"> = {
  Truck: "truck",
  "Car/SUV": "car_suv",
  Motorcycle: "motorcycle",
};

const MATERIAL_MAP: Record<string, "steel" | "aluminum"> = {
  Steel: "steel",
  Aluminum: "aluminum",
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const rimsSchema = z.object({
  rimSize: z.string().min(1, "Rim size is required"),
  vehicleType: z.string().min(1, "Vehicle type is required"),
  material: z.string().min(1, "Material is required"),
  damageLevel: z.string().min(1, "Damage level is required"),
});

const weldingSchema = z.object({
  materialType: z.string().min(1, "Material type is required"),
  damageLevel: z.string().min(1, "Damage level is required"),
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

const RIM_DEFAULTS = { rimSize: "", vehicleType: "", material: "", damageLevel: "" };
const WELDING_DEFAULTS = {
  materialType: "",
  damageLevel: "",
  lengthOfWeld: "",
  comments: "",
};
const POWDER_COATING_DEFAULTS = { rimSize: "", colorCoat: "" };
const GENERAL_DEFAULTS = { vehicleSize: "", tireSize: "" };

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
  const [reconstructWorkTypeError, setReconstructWorkTypeError] = useState<string | null>(null);
  const [subTypeErrors, setSubTypeErrors] = useState<Partial<Record<JobType, string>>>({});
  const [rimAvailable, setRimAvailable] = useState<string>("yes");

  const [reconstructComments, setReconstructComments] = useState("");
  const [workTypePopupOpen, setWorkTypePopupOpen] = useState(false);
  const [buildUpInches, setBuildUpInches] = useState("");
  const [buildUpInchesError, setBuildUpInchesError] = useState<string | null>(null);

  const [rimSelects, setRimSelects] = useState({
    rimSize: "",
    vehicleType: "",
    material: "",
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
  const [generalSubTab, setGeneralSubTab] = useState("tire-service");
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, string>>({});
  const [serviceQuantityErrors, setServiceQuantityErrors] = useState<Record<string, string>>({});

  const mappedVehicleType = VEHICLE_TYPE_MAP[rimSelects.vehicleType];
  const mappedMaterial = MATERIAL_MAP[rimSelects.material];
  const rimSize = rimSelects.rimSize ? parseInt(rimSelects.rimSize, 10) : undefined;

  const { data: rimPrices } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "rim" as const,
        jobTypes: RIM_JOB_TYPES.map((j) => j.value),
        vehicleType: mappedVehicleType,
        rimMaterial: mappedMaterial,
        size: rimSize,
      },
    }),
  );

  const { data: weldingPrices } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "welding" as const,
        jobTypes: ["aluminium", "steel", "stainless-steel", "cast-iron"],
      },
    }),
  );

  const { data: powderCoatingPrices } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "powder_coating" as const,
        jobTypes: ["powder-coating"],
        size: pcSelects.rimSize ? parseInt(pcSelects.rimSize, 10) : undefined,
      },
    }),
  );

  const { data: generalPrices } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "general" as const,
        jobTypes: GENERAL_SERVICE_TYPES.map((s) => s.value),
      },
    }),
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

      if (checkedJobs["reconstruct"] && reconstructWorkTypes.length === 0) {
        setReconstructWorkTypeError("Select a type of work");
        return;
      }

      const newSubTypeErrors: Partial<Record<JobType, string>> = {};
      let hasInchesError = false;
      for (const j of selectedJobs) {
        if (j.hasSubType && !jobSubTypes[j.value]) {
          newSubTypeErrors[j.value] = `${j.subTypeLabel?.replace(":", "") ?? "Option"} is required`;
        }
        if (j.hasInchesInput && !buildUpInches.trim()) {
          setBuildUpInchesError("Inches is required");
          hasInchesError = true;
        }
      }
      if (Object.keys(newSubTypeErrors).length > 0 || hasInchesError) {
        setSubTypeErrors(newSubTypeErrors);
        return;
      }
      setSubTypeErrors({});
      setBuildUpInchesError(null);
      const jobTypes: JobTypeEntry[] = selectedJobs.map((j) => {
        const entry: JobTypeEntry = { type: j.value };

        if (j.value === "reconstruct") {
          entry.workTypes = reconstructWorkTypes;
          entry.rimAvailable = rimAvailable === "yes";

          entry.comments = reconstructComments || undefined;
        } else if (j.hasSubType) {
          entry.subType = jobSubTypes[j.value];
        }

        if (j.hasInchesInput && buildUpInches.trim()) {
          entry.input = buildUpInches.trim();
        }

        return entry;
      });

      const description = [
        `${value.rimSize}" Rims`,
        `Vehicle: ${value.vehicleType} - ${value.material}`,
        `Damage: ${value.damageLevel.toUpperCase()}`,
        ...selectedJobs.map((j) => {
          if (j.hasSubType && jobSubTypes[j.value]) {
            const inches =
              j.hasInchesInput && buildUpInches.trim() ? ` (${buildUpInches.trim()}")` : "";
            return `${j.label}: ${jobSubTypes[j.value]}${inches}`;
          }
          return j.label;
        }),
      ]
        .filter(Boolean)
        .join(", ");

      const unitCost = selectedJobs.reduce((sum, j) => {
        return sum + (rimPrices?.[j.value]?.unitCost ?? 0);
      }, 0);

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.rimSize,
        sideOfVehicle: `${value.vehicleType} - ${value.material}`,
        damageLevel: value.damageLevel,
        vehicleType: VEHICLE_TYPE_MAP[value.vehicleType] ?? null,
        rimMaterial: MATERIAL_MAP[value.material] ?? null,
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
      const desc = [
        `Welding: ${value.materialType}`,
        `Damage: ${value.damageLevel.toUpperCase()}`,
        `${inches}" weld`,
        value.comments?.trim() || null,
      ]
        .filter(Boolean)
        .join(", ");

      const weldingJobType = value.materialType.toLowerCase().replace(/\s+/g, "-");
      const weldingUnitCost = weldingPrices?.[weldingJobType]?.unitCost ?? editItem?.unitCost ?? 0;

      const data: QuoteGeneratorSheetData = {
        vehicleSize: null,
        sideOfVehicle: value.materialType,
        damageLevel: value.damageLevel,
        quantity: 1,
        unitCost: weldingUnitCost,
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
      const pcUnitCost =
        powderCoatingPrices?.["powder-coating"]?.unitCost ?? editItem?.unitCost ?? 0;
      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.rimSize,
        sideOfVehicle: value.colorCoat,
        damageLevel: null,
        quantity: 1,
        unitCost: pcUnitCost,
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

      const qtyErrors: Record<string, string> = {};
      for (const svc of selectedServices) {
        const qty = parseInt(serviceQuantities[svc.value] ?? "", 10);
        if (!qty || qty <= 0) {
          qtyErrors[svc.value] = `${svc.quantityLabel.replace("?", "")} is required`;
        }
      }
      if (Object.keys(qtyErrors).length > 0) {
        setServiceQuantityErrors(qtyErrors);
        return;
      }
      setServiceQuantityErrors({});

      const desc = [
        `General: ${value.vehicleSize}`,
        `Tire: ${value.tireSize}"`,
        ...selectedServices.map((s) => `${s.label} x${serviceQuantities[s.value]}`),
      ].join(", ");

      const generalUnitCost = selectedServices.reduce((sum, s) => {
        const qty = parseInt(serviceQuantities[s.value] ?? "1", 10);
        const price = generalPrices?.[s.value]?.unitCost ?? 0;
        return sum + price * qty;
      }, 0);

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.vehicleSize,
        sideOfVehicle: null,
        damageLevel: null,
        quantity: 1,
        unitCost: generalUnitCost,
        inches: parseInt(value.tireSize, 10),
        itemType: "general",
        jobTypes: selectedServices.map((s) => ({
          type: "general" as const,
          subType: s.value,
          input: serviceQuantities[s.value],
        })),
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
      generalForm.reset({ vehicleSize: vs, tireSize: ts });
      const svcChecked: Partial<Record<string, boolean>> = {};
      const svcQuantities: Record<string, string> = {};
      for (const jt of editItem.jobTypes) {
        if (jt.type === "general" && jt.subType) {
          svcChecked[jt.subType] = true;
          if (jt.input) svcQuantities[jt.subType] = jt.input;
        }
      }
      setCheckedServices(svcChecked);
      setServiceQuantities(svcQuantities);
      const hasBrake = BRAKE_SERVICE_TYPES.some((s) => svcChecked[s.value]);
      const hasTire = TIRE_SERVICE_TYPES.some((s) => svcChecked[s.value]);
      if (hasBrake && !hasTire) setGeneralSubTab("brake-service");
      else setGeneralSubTab("tire-service");
    } else {
      setTab("rims");
      const rs = editItem.vehicleSize ?? "";
      const dl = editItem.damageLevel ?? "";
      const sov = editItem.sideOfVehicle ?? "";
      const parts = sov.split(" - ");
      const vt = parts[0] ?? "";
      const mat = parts[1] ?? "";
      setRimSelects({ rimSize: rs, vehicleType: vt, material: mat, damageLevel: dl });
      rimForm.setFieldValue("rimSize", rs);
      rimForm.setFieldValue("vehicleType", vt);
      rimForm.setFieldValue("material", mat);
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

        setReconstructComments(jt.comments ?? "");
      }
      if (jt.type === "build-up" && jt.input) {
        setBuildUpInches(jt.input);
      }
    }
    setCheckedJobs(checked);
    setJobSubTypes(subTypes);
    setInitialized(editItem.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  function toggleJob(type: JobType, checked: boolean) {
    setCheckedJobs((prev) => {
      const next = { ...prev, [type]: checked };
      if (checked && type === "straighten") next["twist"] = false;
      if (checked && type === "twist") next["straighten"] = false;
      return next;
    });
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
    setReconstructWorkTypeError(null);
    setSubTypeErrors({});
    setRimAvailable("yes");

    setReconstructComments("");
    setWorkTypePopupOpen(false);
    setBuildUpInches("");
    setBuildUpInchesError(null);
    setRimSelects({ rimSize: "", vehicleType: "", material: "", damageLevel: "" });
    setWeldingSelects({ materialType: "", damageLevel: "" });
    setPcSelects({ rimSize: "", colorCoat: "" });
    setGeneralSelects({ vehicleSize: "", tireSize: "" });
    setCheckedServices({});
    setServiceTypeError(null);
    setGeneralSubTab("tire-service");
    setServiceQuantities({});
    setServiceQuantityErrors({});
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
                  <rimForm.Field name="vehicleType">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Vehicle Type:
                        </label>
                        <Select
                          value={rimSelects.vehicleType || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setRimSelects((prev) => ({ ...prev, vehicleType: val }));
                            field.handleChange(val);
                            if (val === "Motorcycle") {
                              setRimSelects((prev) => ({ ...prev, material: "Aluminum" }));
                              rimForm.setFieldValue("material", "Aluminum");
                            } else {
                              setRimSelects((prev) => ({ ...prev, material: "" }));
                              rimForm.setFieldValue("material", "");
                            }
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectOption value="Truck">Truck</SelectOption>
                            <SelectOption value="Car/SUV">Car/SUV</SelectOption>
                            <SelectOption value="Motorcycle">Motorcycle</SelectOption>
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

                <rimForm.Field name="material">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-3.5 text-label">Material:</label>
                      <RadioGroup
                        value={rimSelects.material}
                        onValueChange={(v) => {
                          const val = v as string;
                          setRimSelects((prev) => ({ ...prev, material: val }));
                          field.handleChange(val);
                        }}
                        className="flex gap-4"
                        disabled={rimSelects.vehicleType === "Motorcycle"}
                      >
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio.Root
                            value="Steel"
                            className="flex size-5 items-center justify-center rounded-full border-[1.2px] border-[#cdcfd1] bg-white data-checked:border-blue"
                            disabled={rimSelects.vehicleType === "Motorcycle"}
                          >
                            <Radio.Indicator className="size-2.5 rounded-full bg-blue" />
                          </Radio.Root>
                          <span className="font-rubik text-sm text-body">Steel</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio.Root
                            value="Aluminum"
                            className="flex size-5 items-center justify-center rounded-full border-[1.2px] border-[#cdcfd1] bg-white data-checked:border-blue"
                          >
                            <Radio.Indicator className="size-2.5 rounded-full bg-blue" />
                          </Radio.Root>
                          <span className="font-rubik text-sm text-body">Aluminum</span>
                        </label>
                      </RadioGroup>
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </rimForm.Field>

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
                            {rimPrices?.[job.value]?.found ? (
                              <span className="ml-auto font-rubik text-xs text-label">
                                $
                                {(rimPrices[job.value]!.unitCost / 100).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : mappedVehicleType && mappedMaterial && rimSize ? (
                              <span className="ml-auto font-rubik text-xs text-red">
                                No price set
                              </span>
                            ) : null}
                          </div>
                          {job.hasSubType && isChecked && !job.hasInchesInput && (
                            <div className="flex w-40 flex-col gap-1">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                {job.subTypeLabel}
                              </label>
                              <Select
                                value={jobSubTypes[job.value] ?? null}
                                onValueChange={(v) => {
                                  setJobSubTypes((prev) => ({
                                    ...prev,
                                    [job.value]: v as string,
                                  }));
                                  setSubTypeErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[job.value];
                                    return next;
                                  });
                                }}
                              >
                                <SelectTrigger error={!!subTypeErrors[job.value]}>
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
                              {subTypeErrors[job.value] && (
                                <p className="font-rubik text-xs text-red">
                                  {subTypeErrors[job.value]}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Build Up expanded panel */}
                        {job.hasInchesInput && isChecked && (
                          <div className="flex flex-col gap-3 bg-page px-3 py-2">
                            <div className="flex gap-3">
                              <div className="flex flex-1 flex-col gap-1">
                                <label className="font-rubik text-xs leading-3.5 text-label">
                                  {job.subTypeLabel}
                                </label>
                                <Select
                                  value={jobSubTypes[job.value] ?? null}
                                  onValueChange={(v) => {
                                    setJobSubTypes((prev) => ({
                                      ...prev,
                                      [job.value]: v as string,
                                    }));
                                    setSubTypeErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[job.value];
                                      return next;
                                    });
                                  }}
                                >
                                  <SelectTrigger error={!!subTypeErrors[job.value]}>
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
                                {subTypeErrors[job.value] && (
                                  <p className="font-rubik text-xs text-red">
                                    {subTypeErrors[job.value]}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-1 flex-col gap-1">
                                <label className="font-rubik text-xs leading-3.5 text-label">
                                  How many inches?
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Enter inches"
                                  value={buildUpInches}
                                  onChange={(e) => {
                                    setBuildUpInches(e.target.value);
                                    if (e.target.value.trim()) {
                                      setBuildUpInchesError(null);
                                    }
                                  }}
                                  className={cn(
                                    "h-9 rounded-lg border bg-white px-3 font-rubik text-xs text-body outline-none",
                                    buildUpInchesError ? "border-red/50" : "border-field-line",
                                  )}
                                />
                                {buildUpInchesError && (
                                  <p className="font-rubik text-xs text-red">
                                    {buildUpInchesError}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Reconstruct expanded options */}
                        {job.hasExpandedOptions && isChecked && (
                          <div className="flex flex-col gap-4 bg-page px-3 py-2">
                            {/* Type of work multiselect */}
                            <div className="flex flex-col gap-1">
                              <label className="font-rubik text-xs leading-3.5 text-label">
                                Type of work:
                              </label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setWorkTypePopupOpen((v) => !v)}
                                  className={cn(
                                    "flex min-h-9 w-full items-center rounded-lg border bg-white py-1 pr-2 pl-1",
                                    reconstructWorkTypeError
                                      ? "border-red/50"
                                      : "border-field-line",
                                  )}
                                >
                                  <div className="flex flex-1 flex-wrap gap-1">
                                    {reconstructWorkTypes.length === 0 && (
                                      <span className="px-1 font-rubik text-xs text-ghost">
                                        Select work type
                                      </span>
                                    )}
                                    {reconstructWorkTypes.map((wt) => (
                                      <span
                                        key={wt}
                                        className="flex h-7 items-center gap-2 rounded-md bg-blue py-1 pr-1.5 pl-2 font-rubik text-xs text-white"
                                      >
                                        {wt}
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeWorkType(wt);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.stopPropagation();
                                              removeWorkType(wt);
                                            }
                                          }}
                                          className="flex cursor-pointer items-center justify-center"
                                        >
                                          <X className="size-3" />
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                  <ChevronDown className="size-4 shrink-0 text-ghost" />
                                </button>

                                {workTypePopupOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setWorkTypePopupOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 z-50 mt-1 flex w-full flex-col gap-0.5 overflow-clip rounded-lg bg-white py-1 shadow-[0px_0px_32px_0px_rgba(10,13,18,0.1)]">
                                      {RECONSTRUCT_WORK_TYPES.map((wt) => {
                                        const isSelected = reconstructWorkTypes.includes(wt);
                                        return (
                                          <button
                                            key={wt}
                                            type="button"
                                            onClick={() => {
                                              if (!isSelected) {
                                                setReconstructWorkTypes([wt]);
                                                setReconstructWorkTypeError(null);
                                                setWorkTypePopupOpen(false);
                                              }
                                            }}
                                            className={cn(
                                              "flex items-center gap-4 px-2 py-2 text-left font-rubik text-xs leading-3.5 text-body",
                                              isSelected && "bg-[#f0f5fa]",
                                            )}
                                          >
                                            <span className="flex-1">{wt}</span>
                                            {isSelected && (
                                              <Check className="size-4 shrink-0 text-blue" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                              {reconstructWorkTypeError && (
                                <p className="font-rubik text-xs text-red">
                                  {reconstructWorkTypeError}
                                </p>
                              )}
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
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
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
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
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

                <weldingForm.Field name="lengthOfWeld">
                  {(field) => (
                    <div className="flex flex-col gap-1">
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
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </weldingForm.Field>

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
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
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
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
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
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
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
                        {field.state.meta.errors.length > 0 && (
                          <p className="font-rubik text-xs text-red">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </generalForm.Field>
                </div>

                {/* Service Type sub-tabs */}
                <div className="flex flex-col gap-5">
                  <p className="px-3 font-rubik text-xs leading-3.5 font-medium text-body">
                    Service Type:
                  </p>
                  <Tabs value={generalSubTab} onValueChange={(v) => setGeneralSubTab(String(v))}>
                    <div className="px-3">
                      <TabsList className="gap-4 border-0">
                        <TabsTrigger value="tire-service" className="px-2 whitespace-nowrap">
                          Tire Service
                        </TabsTrigger>
                        <TabsTrigger value="brake-service" className="px-2 whitespace-nowrap">
                          Brake Service
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="tire-service">
                      <div className="flex flex-col gap-1">
                        {TIRE_SERVICE_TYPES.map((svc) => {
                          const isChecked = !!checkedServices[svc.value];
                          return (
                            <div key={svc.value} className="flex flex-col">
                              <div
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
                                    if (!c) {
                                      setServiceQuantities((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.value];
                                        return next;
                                      });
                                      setServiceQuantityErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.value];
                                        return next;
                                      });
                                    }
                                  }}
                                />
                                <span className="font-rubik text-sm leading-[18px] text-body">
                                  {svc.label}
                                </span>
                                {generalPrices?.[svc.value]?.found ? (
                                  <span className="ml-auto font-rubik text-xs text-label">
                                    $
                                    {(generalPrices[svc.value]!.unitCost / 100).toLocaleString(
                                      "en-US",
                                      { minimumFractionDigits: 2 },
                                    )}
                                    /ea
                                  </span>
                                ) : (
                                  <span className="ml-auto font-rubik text-xs text-red">
                                    No price set
                                  </span>
                                )}
                              </div>
                              {isChecked && (
                                <div className="flex flex-col gap-1 bg-page px-3 pb-2">
                                  <label className="font-rubik text-xs leading-3.5 text-label">
                                    {svc.quantityLabel}
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={serviceQuantities[svc.value] ?? ""}
                                    onChange={(e) => {
                                      setServiceQuantities((prev) => ({
                                        ...prev,
                                        [svc.value]: e.target.value,
                                      }));
                                      setServiceQuantityErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.value];
                                        return next;
                                      });
                                    }}
                                    placeholder="Enter number"
                                    className={cn(
                                      "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost",
                                      serviceQuantityErrors[svc.value]
                                        ? "border-red/50"
                                        : "border-field-line",
                                    )}
                                  />
                                  {serviceQuantityErrors[svc.value] && (
                                    <p className="font-rubik text-xs text-red">
                                      {serviceQuantityErrors[svc.value]}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="brake-service">
                      <div className="flex flex-col gap-1">
                        {BRAKE_SERVICE_TYPES.map((svc) => {
                          const isChecked = !!checkedServices[svc.value];
                          return (
                            <div key={svc.value} className="flex flex-col">
                              <div
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
                                    if (!c) {
                                      setServiceQuantities((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.value];
                                        return next;
                                      });
                                      setServiceQuantityErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.value];
                                        return next;
                                      });
                                    }
                                  }}
                                />
                                <span className="font-rubik text-sm leading-[18px] text-body">
                                  {svc.label}
                                </span>
                                {generalPrices?.[svc.value]?.found ? (
                                  <span className="ml-auto font-rubik text-xs text-label">
                                    $
                                    {(generalPrices[svc.value]!.unitCost / 100).toLocaleString(
                                      "en-US",
                                      { minimumFractionDigits: 2 },
                                    )}
                                    /ea
                                  </span>
                                ) : (
                                  <span className="ml-auto font-rubik text-xs text-red">
                                    No price set
                                  </span>
                                )}
                              </div>
                              {isChecked && (
                                <div className="flex flex-col gap-1 bg-page px-3 pb-2">
                                  <label className="font-rubik text-xs leading-3.5 text-label">
                                    {svc.quantityLabel}
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={serviceQuantities[svc.value] ?? ""}
                                    onChange={(e) => {
                                      setServiceQuantities((prev) => ({
                                        ...prev,
                                        [svc.value]: e.target.value,
                                      }));
                                      setServiceQuantityErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.value];
                                        return next;
                                      });
                                    }}
                                    placeholder="Enter number"
                                    className={cn(
                                      "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost",
                                      serviceQuantityErrors[svc.value]
                                        ? "border-red/50"
                                        : "border-field-line",
                                    )}
                                  />
                                  {serviceQuantityErrors[svc.value] && (
                                    <p className="font-rubik text-xs text-red">
                                      {serviceQuantityErrors[svc.value]}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                  {serviceTypeError && (
                    <p className="px-3 font-rubik text-xs text-red">{serviceTypeError}</p>
                  )}
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Total amount bar */}
        <div className="flex h-10 items-center border-t border-[#d6e6f6] bg-[#ebf5ff] px-3">
          <div className="flex items-center gap-2 font-rubik text-sm leading-[18px]">
            <span className="text-label">Total amount:</span>
            <span className="font-medium text-body">
              $
              {(() => {
                if (tab === "rims") {
                  const selectedJobs = RIM_JOB_TYPES.filter((j) => checkedJobs[j.value]);
                  const total = selectedJobs.reduce(
                    (sum, j) => sum + (rimPrices?.[j.value]?.unitCost ?? 0),
                    0,
                  );
                  return (total / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                }
                if (tab === "general") {
                  const selectedServices = GENERAL_SERVICE_TYPES.filter(
                    (s) => checkedServices[s.value],
                  );
                  const total = selectedServices.reduce((sum, s) => {
                    const qty = parseInt(serviceQuantities[s.value] ?? "1", 10) || 1;
                    return sum + (generalPrices?.[s.value]?.unitCost ?? 0) * qty;
                  }, 0);
                  return (total / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                }
                if (tab === "welding") {
                  const wjt = weldingSelects.materialType.toLowerCase().replace(/\s+/g, "-");
                  return ((weldingPrices?.[wjt]?.unitCost ?? 0) / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                }
                if (tab === "powder-coating") {
                  return (
                    (powderCoatingPrices?.["powder-coating"]?.unitCost ?? 0) / 100
                  ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                return ((editItem?.unitCost ?? 0) / 100).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              })()}
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
                  {!editItem && !isAdding && <Plus />}
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
                  {!editItem && !isAdding && <Plus />}
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
                  {!editItem && !isAdding && <Plus />}
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
                  {!editItem && !isAdding && <Plus />}
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
