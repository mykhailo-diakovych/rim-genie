import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Check, Info, Loader2, Plus, X } from "lucide-react";
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
  type: string;
  input?: string;
  workTypes?: string[];
  rimAvailable?: boolean;
  comments?: string;
  subType?: string;
  unit?: "single" | "pair";
  removalIncluded?: boolean;
  scope?: "set" | "rim";
  colorCount?: number;
  colors?: string[];
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

const WELDING_MATERIAL_TYPES = ["Aluminium", "Steel", "Stainless Steel", "Cast Iron"];

const BRAKE_SERVICE_TYPES = [
  { value: "disc-rotor-skimming", label: "Disc Rotor Skimming", quantityLabel: "How many pairs?" },
  { value: "brake-drum-skimming", label: "Brake Drum Skimming", quantityLabel: "How many pairs?" },
];

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
});

const weldingSchema = z.object({
  materialType: z.string().min(1, "Material type is required"),
  lengthOfWeld: z.string().refine((v) => parseInt(v, 10) > 0, "Length is required"),
  comments: z.string(),
});

const powderCoatingSchema = z.object({
  rimSize: z.string().min(1, "Rim size is required"),
  scope: z.string().min(1, "Select coating scope"),
  colorCount: z.string().min(1, "Select number of colors"),
  comments: z.string(),
});

const generalSchema = z.object({
  vehicleSize: z.string(),
  tireSize: z.string(),
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

const RIM_DEFAULTS = { rimSize: "", vehicleType: "", material: "" };
const WELDING_DEFAULTS = {
  materialType: "",
  lengthOfWeld: "",
  comments: "",
};
const POWDER_COATING_DEFAULTS = { rimSize: "", scope: "", colorCount: "", comments: "" };
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
  // Rims: selected groups by root key + chosen sub-type leaf key per group
  const [checkedJobs, setCheckedJobs] = useState<Record<string, boolean>>({});
  const [jobSubTypes, setJobSubTypes] = useState<Record<string, string>>({});
  const [jobTypeError, setJobTypeError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<string | null>(null);

  const [rimComments, setRimComments] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [spotQty, setSpotQty] = useState("1");

  const [rimSelects, setRimSelects] = useState({
    rimSize: "",
    vehicleType: "",
    material: "",
  });

  // Welding tab selects
  const [weldingSelects, setWeldingSelects] = useState({
    materialType: "",
  });

  // Powder coating tab selects
  const [pcSelects, setPcSelects] = useState({ rimSize: "", scope: "", colorCount: "" });
  const [pcColors, setPcColors] = useState<string[]>([]);
  const [pcQty, setPcQty] = useState("1");

  // General tab state
  const [generalSelects, setGeneralSelects] = useState({ vehicleSize: "", tireSize: "" });
  const [checkedServices, setCheckedServices] = useState<Partial<Record<string, boolean>>>({});
  const [serviceTypeError, setServiceTypeError] = useState<string | null>(null);
  const [generalSubTab, setGeneralSubTab] = useState("tire-service");
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, string>>({});
  const [serviceQuantityErrors, setServiceQuantityErrors] = useState<Record<string, string>>({});
  const [brakeUnit, setBrakeUnit] = useState<Record<string, string>>({});
  const [brakeRemoval, setBrakeRemoval] = useState<Record<string, boolean>>({});

  const mappedVehicleType = VEHICLE_TYPE_MAP[rimSelects.vehicleType];
  const mappedMaterial = MATERIAL_MAP[rimSelects.material];
  const rimSize = rimSelects.rimSize ? parseInt(rimSelects.rimSize, 10) : undefined;

  const { data: rimGroups } = useQuery(
    orpc.catalog.jobTypes.bySection.queryOptions({ input: { section: "rims" } }),
  );
  const { data: pricingConfig } = useQuery(orpc.catalog.config.get.queryOptions());

  const rimJobList = (rimGroups ?? []).map((root) => ({
    key: root.key,
    label: root.label,
    children: root.children.map((c) => ({ key: c.key, label: c.label })),
  }));
  const rimLeafKeys = rimJobList.flatMap((j) =>
    j.children.length ? j.children.map((c) => c.key) : [j.key],
  );

  const applyRimModifier = (base: number) => {
    let p = base;
    if (mappedMaterial === "steel" && pricingConfig) {
      p = Math.round((p * (100 - pricingConfig.steelDiscountPercent)) / 100);
    }
    if (mappedVehicleType === "truck" && pricingConfig) {
      p = Math.round((p * (100 + pricingConfig.truckMarkupPercent)) / 100);
    }
    return p;
  };

  const { data: rimPrices, isFetching: rimPricesFetching } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "rim" as const,
        jobTypes: rimLeafKeys,
        vehicleType: mappedVehicleType,
        rimMaterial: mappedMaterial,
        size: rimSize,
      },
    }),
  );

  // Spot polish is a Rims group priced by size bucket × qty (its own price table).
  const spotBucket = rimSize != null ? (rimSize >= 21 ? "ge21" : "le20") : undefined;
  const spotLeafKey = jobSubTypes["spot-polish"];
  const { data: spotPrice, isFetching: spotPriceFetching } = useQuery({
    ...orpc.catalog.spotPrices.lookup.queryOptions({
      input: {
        jobTypeKey: spotLeafKey ?? "",
        sizeBucket: (spotBucket ?? "le20") as "le20" | "ge21",
      },
    }),
    enabled: !!(spotLeafKey && spotBucket),
  });

  const { data: weldingPrices } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "welding" as const,
        jobTypes: ["aluminium", "steel", "stainless-steel", "cast-iron"],
      },
    }),
  );

  const { data: powderColors } = useQuery(
    orpc.catalog.colors.list.queryOptions({ input: { includeInactive: false } }),
  );
  const pcSize = pcSelects.rimSize ? parseInt(pcSelects.rimSize, 10) : undefined;
  const pcColorCount = pcSelects.colorCount ? parseInt(pcSelects.colorCount, 10) : undefined;
  const { data: powderPrice, isFetching: powderPriceFetching } = useQuery({
    ...orpc.catalog.powderPrices.lookup.queryOptions({
      input: {
        size: pcSize ?? 1,
        scope: (pcSelects.scope || "set") as "set" | "rim",
        colorCount: pcColorCount ?? 1,
      },
    }),
    enabled: !!(pcSize && pcSelects.scope && pcColorCount),
  });

  const { data: tireGroups } = useQuery(
    orpc.catalog.jobTypes.bySection.queryOptions({ input: { section: "tire-service" } }),
  );
  const tireLeaves = (tireGroups ?? []).flatMap((root) =>
    root.children.length
      ? root.children.map((c) => ({ key: c.key, label: c.label }))
      : [{ key: root.key, label: root.label }],
  );
  const tireSize = generalSelects.tireSize ? parseInt(generalSelects.tireSize, 10) : undefined;
  const { data: tirePrices, isFetching: tirePricesFetching } = useQuery(
    orpc.floor.pricing.lookup.queryOptions({
      input: {
        category: "general" as const,
        jobTypes: tireLeaves.map((t) => t.key),
        size: tireSize,
      },
    }),
  );

  const { data: vehicleSizes } = useQuery(
    orpc.catalog.vehicleSizes.list.queryOptions({ input: { includeInactive: false } }),
  );
  const { data: brakeCombos, isFetching: brakeCombosFetching } = useQuery({
    ...orpc.catalog.brakePrices.byVehicleSize.queryOptions({
      input: { vehicleSizeName: generalSelects.vehicleSize || "" },
    }),
    enabled: !!generalSelects.vehicleSize,
  });
  const brakePriceFor = (key: string) =>
    brakeCombos?.find((c) => c.unit === brakeUnit[key] && c.removalIncluded === brakeRemoval[key])
      ?.unitCost ?? 0;

  const rimForm = useForm({
    defaultValues: RIM_DEFAULTS,
    onSubmit: ({ value }) => {
      const selectedRoots = rimJobList.filter((j) => checkedJobs[j.key]);
      if (selectedRoots.length === 0) {
        setJobTypeError("Select at least one job type");
        return;
      }
      for (const root of selectedRoots) {
        if (root.children.length > 0 && !jobSubTypes[root.key]) {
          setJobTypeError(`Select an option for ${root.label}`);
          return;
        }
      }
      setJobTypeError(null);

      const jobTypes: JobTypeEntry[] = selectedRoots.map((root) => {
        const leafKey = root.children.length ? jobSubTypes[root.key]! : root.key;
        const childLabel = root.children.find((c) => c.key === leafKey)?.label;
        const entry: JobTypeEntry = { type: leafKey as JobType };
        if (childLabel) entry.subType = childLabel;
        if (root.key === "spot-polish") entry.input = spotQty;
        return entry;
      });

      const description = [
        `${value.rimSize}" Rims`,
        `Vehicle: ${value.vehicleType} - ${value.material}`,
        ...selectedRoots.map((root) => {
          if (root.children.length) {
            const leafKey = jobSubTypes[root.key];
            const childLabel = root.children.find((c) => c.key === leafKey)?.label;
            return `${root.label}: ${childLabel ?? ""}`;
          }
          return root.label;
        }),
        rimComments.trim() || null,
      ]
        .filter(Boolean)
        .join(", ");

      const unitCost = selectedRoots.reduce((sum, root) => {
        if (root.key === "spot-polish") {
          const base = spotPrice?.found ? spotPrice.unitCost : 0;
          return sum + base * (parseInt(spotQty, 10) || 1);
        }
        const leafKey = root.children.length ? jobSubTypes[root.key] : root.key;
        const base = leafKey ? (rimPrices?.[leafKey]?.unitCost ?? 0) : 0;
        return sum + applyRimModifier(base);
      }, 0);

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.rimSize,
        sideOfVehicle: `${value.vehicleType} - ${value.material}`,
        damageLevel: null,
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
        `${inches}" weld`,
        value.comments?.trim() || null,
      ]
        .filter(Boolean)
        .join(", ");

      const weldingJobType = value.materialType.toLowerCase().replace(/\s+/g, "-");
      const perInch = weldingPrices?.[weldingJobType]?.unitCost ?? 0;
      const weldingUnitCost = perInch > 0 ? perInch * inches : (editItem?.unitCost ?? 0);

      const data: QuoteGeneratorSheetData = {
        vehicleSize: null,
        sideOfVehicle: value.materialType,
        damageLevel: null,
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
      const colorCount = parseInt(value.colorCount, 10);
      if (pcColors.length !== colorCount) return;
      const scope = value.scope as "set" | "rim";
      const qty = scope === "rim" ? Math.max(1, parseInt(pcQty, 10) || 1) : 1;
      const unit = powderPrice?.unitCost ?? editItem?.unitCost ?? 0;
      const pcUnitCost = scope === "rim" ? unit * qty : unit;

      const desc = [
        `Powder Coating: ${value.rimSize}" Rim`,
        scope === "set" ? "Per Set of 4 Rims" : "Per Rim",
        `${colorCount} Color${colorCount > 1 ? "s" : ""}: ${pcColors.join(", ")}`,
        scope === "rim" ? `x${qty}` : null,
        value.comments?.trim() || null,
      ]
        .filter(Boolean)
        .join(", ");

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.rimSize,
        sideOfVehicle: pcColors.join(", "),
        damageLevel: null,
        quantity: 1,
        unitCost: pcUnitCost,
        itemType: "powder-coating",
        jobTypes: [
          {
            type: "powder-coating",
            scope,
            colorCount,
            colors: pcColors,
            input: scope === "rim" ? String(qty) : undefined,
          },
        ],
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
      const tireSelected = tireLeaves
        .filter((t) => checkedServices[t.key])
        .map((t) => ({ key: t.key, label: t.label, isTire: true }));
      const brakeSelected = BRAKE_SERVICE_TYPES.filter((s) => checkedServices[s.value]).map(
        (s) => ({
          key: s.value,
          label: s.label,
          isTire: false,
        }),
      );
      const selectedServices = [...tireSelected, ...brakeSelected];
      if (selectedServices.length === 0) {
        setServiceTypeError("Select at least one service type");
        return;
      }
      if (tireSelected.length > 0 && !value.tireSize) {
        setServiceTypeError("Select a tire size");
        return;
      }
      if (brakeSelected.length > 0 && !value.vehicleSize) {
        setServiceTypeError("Select a vehicle size");
        return;
      }
      for (const b of brakeSelected) {
        if (!brakeUnit[b.key] || brakeRemoval[b.key] === undefined) {
          setServiceTypeError(`Choose single/pair and removal for ${b.label}`);
          return;
        }
      }

      const qtyErrors: Record<string, string> = {};
      for (const svc of selectedServices) {
        const qty = parseInt(serviceQuantities[svc.key] ?? "1", 10);
        if (!qty || qty <= 0) {
          qtyErrors[svc.key] = "Quantity is required";
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
        ...selectedServices.map((s) => `${s.label} x${serviceQuantities[s.key] ?? "1"}`),
        generalComments.trim() || null,
      ]
        .filter(Boolean)
        .join(", ");

      const generalUnitCost = selectedServices.reduce((sum, s) => {
        const qty = parseInt(serviceQuantities[s.key] ?? "1", 10);
        const price = s.isTire ? (tirePrices?.[s.key]?.unitCost ?? 0) : brakePriceFor(s.key);
        return sum + price * qty;
      }, 0);

      const data: QuoteGeneratorSheetData = {
        vehicleSize: value.vehicleSize || null,
        sideOfVehicle: null,
        damageLevel: null,
        quantity: 1,
        unitCost: generalUnitCost,
        inches: value.tireSize ? parseInt(value.tireSize, 10) : undefined,
        itemType: "general",
        jobTypes: selectedServices.map((s) =>
          s.isTire
            ? { type: s.key as JobType, input: serviceQuantities[s.key] ?? "1" }
            : {
                type: s.key as JobType,
                input: serviceQuantities[s.key] ?? "1",
                unit: brakeUnit[s.key] as "single" | "pair",
                removalIncluded: brakeRemoval[s.key],
              },
        ),
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
      setWeldingSelects({ materialType: mt });
      weldingForm.reset({
        materialType: mt,
        lengthOfWeld: String(editItem.inches ?? ""),
        comments: "",
      });
    } else if (editItem.itemType === "powder-coating") {
      setTab("powder-coating");
      const rs = editItem.vehicleSize ?? "";
      const pcEntry = editItem.jobTypes[0];
      const sc = pcEntry?.scope ?? "";
      const ccnt = pcEntry?.colorCount ? String(pcEntry.colorCount) : "";
      setPcSelects({ rimSize: rs, scope: sc, colorCount: ccnt });
      setPcColors(pcEntry?.colors ?? []);
      setPcQty(pcEntry?.input ?? "1");
      powderCoatingForm.reset({ rimSize: rs, scope: sc, colorCount: ccnt, comments: "" });
    } else if (editItem.itemType === "general") {
      setTab("general");
      const vs = editItem.vehicleSize ?? "";
      const ts = String(editItem.inches ?? "");
      setGeneralSelects({ vehicleSize: vs, tireSize: ts });
      generalForm.reset({ vehicleSize: vs, tireSize: ts });
      const svcChecked: Partial<Record<string, boolean>> = {};
      const svcQuantities: Record<string, string> = {};
      const bUnit: Record<string, string> = {};
      const bRemoval: Record<string, boolean> = {};
      for (const jt of editItem.jobTypes) {
        const key = jt.subType ?? jt.type;
        svcChecked[key] = true;
        if (jt.input) svcQuantities[key] = jt.input;
        if (jt.unit) bUnit[key] = jt.unit;
        if (jt.removalIncluded !== undefined) bRemoval[key] = jt.removalIncluded;
      }
      setCheckedServices(svcChecked);
      setServiceQuantities(svcQuantities);
      setBrakeUnit(bUnit);
      setBrakeRemoval(bRemoval);
      const hasBrake = BRAKE_SERVICE_TYPES.some((s) => svcChecked[s.value]);
      const hasTire = tireLeaves.some((t) => svcChecked[t.key]);
      if (hasBrake && !hasTire) setGeneralSubTab("brake-service");
      else setGeneralSubTab("tire-service");
    } else {
      setTab("rims");
      const rs = editItem.vehicleSize ?? "";
      const sov = editItem.sideOfVehicle ?? "";
      const parts = sov.split(" - ");
      const vt = parts[0] ?? "";
      const mat = parts[1] ?? "";
      setRimSelects({ rimSize: rs, vehicleType: vt, material: mat });
      rimForm.setFieldValue("rimSize", rs);
      rimForm.setFieldValue("vehicleType", vt);
      rimForm.setFieldValue("material", mat);
    }

    const checked: Record<string, boolean> = {};
    const subTypes: Record<string, string> = {};
    for (const jt of editItem.jobTypes) {
      const root = rimJobList.find(
        (r) => r.key === jt.type || r.children.some((c) => c.key === jt.type),
      );
      if (root) {
        checked[root.key] = true;
        if (root.children.length) subTypes[root.key] = jt.type;
        if (root.key === "spot-polish" && jt.input) setSpotQty(jt.input);
      } else {
        checked[jt.type] = true;
      }
    }
    setCheckedJobs(checked);
    setJobSubTypes(subTypes);
    setInitialized(editItem.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  function toggleRimJob(key: string, checked: boolean) {
    setCheckedJobs((prev) => ({ ...prev, [key]: checked }));
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
    setRimComments("");
    setGeneralComments("");
    setSpotQty("1");
    setRimSelects({ rimSize: "", vehicleType: "", material: "" });
    setWeldingSelects({ materialType: "" });
    setPcSelects({ rimSize: "", scope: "", colorCount: "" });
    setPcColors([]);
    setPcQty("1");
    setGeneralSelects({ vehicleSize: "", tireSize: "" });
    setCheckedServices({});
    setServiceTypeError(null);
    setGeneralSubTab("tire-service");
    setServiceQuantities({});
    setServiceQuantityErrors({});
    setBrakeUnit({});
    setBrakeRemoval({});
    onClose();
  }

  return (
    <>
      {/* Backdrop — does not close on click; use the X button or Cancel (RIM-3 R9) */}
      <div
        className={`fixed inset-0 z-40 bg-black/75 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
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
              </form>

              {/* Job Types */}
              <div className="flex flex-col gap-1">
                <p className="px-3 font-rubik text-xs leading-3.5 font-medium text-body">
                  Job Type:
                </p>
                <div className="flex flex-col gap-1">
                  {rimJobList.map((job) => {
                    const isChecked = !!checkedJobs[job.key];
                    const leafKey = job.children.length ? jobSubTypes[job.key] : job.key;
                    const isSpot = job.key === "spot-polish";
                    const priceLoading = isSpot ? spotPriceFetching : rimPricesFetching;
                    const priceRow = leafKey && !isSpot ? rimPrices?.[leafKey] : undefined;
                    const displayUnit = isSpot
                      ? spotPrice?.found && leafKey
                        ? spotPrice.unitCost * (parseInt(spotQty, 10) || 1)
                        : undefined
                      : priceRow?.found
                        ? applyRimModifier(priceRow.unitCost)
                        : undefined;
                    return (
                      <div key={job.key}>
                        <div
                          className={cn(
                            "flex items-center gap-4 px-3 py-2",
                            isChecked && "bg-page",
                          )}
                        >
                          <div className="flex flex-1 items-center gap-1.5">
                            <FloorCheckbox
                              checked={isChecked}
                              onCheckedChange={(c) => toggleRimJob(job.key, !!c)}
                            />
                            <span className="font-rubik text-sm leading-[18px] text-body">
                              {job.label}
                            </span>
                            {displayUnit != null ? (
                              <span className="ml-auto font-rubik text-sm font-semibold text-body">
                                $
                                {(displayUnit / 100).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : isChecked && leafKey && rimSize ? (
                              priceLoading ? (
                                <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-label" />
                              ) : (
                                <span className="ml-auto font-rubik text-xs text-red">
                                  No price set
                                </span>
                              )
                            ) : null}
                          </div>
                        </div>
                        {job.children.length > 0 && isChecked && (
                          <div className="flex flex-col gap-1 bg-page px-3 pb-2">
                            <label className="font-rubik text-xs leading-3.5 text-label">
                              Select option:
                            </label>
                            <Select
                              value={jobSubTypes[job.key] ?? null}
                              onValueChange={(v) => {
                                setJobSubTypes((prev) => ({ ...prev, [job.key]: v as string }));
                                setJobTypeError(null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select">
                                  {(value) =>
                                    job.children.find((c) => c.key === value)?.label ?? "Select"
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectPopup>
                                {job.children.map((c) => (
                                  <SelectOption key={c.key} value={c.key}>
                                    {c.label}
                                  </SelectOption>
                                ))}
                              </SelectPopup>
                            </Select>
                            {isSpot && leafKey && (
                              <div className="mt-1 flex flex-col gap-1">
                                <label className="font-rubik text-xs leading-3.5 text-label">
                                  How many rims?
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={spotQty}
                                  onChange={(e) =>
                                    setSpotQty(e.target.value.replace(/\D/g, "") || "1")
                                  }
                                  className="flex h-9 w-full rounded-lg border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {jobTypeError && <p className="px-3 font-rubik text-xs text-red">{jobTypeError}</p>}
              </div>

              <div className="flex flex-col gap-1 px-3">
                <label className="font-rubik text-xs leading-3.5 text-label">Comments:</label>
                <textarea
                  value={rimComments}
                  onChange={(e) => setRimComments(e.target.value)}
                  className="min-h-[70px] w-full resize-none rounded-lg border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-ghost"
                />
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
                            {Array.from({ length: 17 }, (_, i) => i + 10).map((size) => (
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
                  <powderCoatingForm.Field name="scope">
                    {(field) => (
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-rubik text-xs leading-3.5 text-label">
                          Coating:
                        </label>
                        <Select
                          value={pcSelects.scope || null}
                          onValueChange={(v) => {
                            const val = v as string;
                            setPcSelects((prev) => ({ ...prev, scope: val }));
                            field.handleChange(val);
                          }}
                        >
                          <SelectTrigger error={field.state.meta.errors.length > 0}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectOption value="set">Per Set of 4 Rims</SelectOption>
                            <SelectOption value="rim">Per Rim</SelectOption>
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

                <powderCoatingForm.Field name="colorCount">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="font-rubik text-xs leading-3.5 text-label">
                        Number of colors:
                      </label>
                      <Select
                        value={pcSelects.colorCount || null}
                        onValueChange={(v) => {
                          const val = v as string;
                          setPcSelects((prev) => ({ ...prev, colorCount: val }));
                          field.handleChange(val);
                          setPcColors((prev) => prev.slice(0, parseInt(val, 10) || 0));
                        }}
                      >
                        <SelectTrigger error={field.state.meta.errors.length > 0}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectOption value="1">1 Color</SelectOption>
                          <SelectOption value="2">2 Colors</SelectOption>
                        </SelectPopup>
                      </Select>
                    </div>
                  )}
                </powderCoatingForm.Field>

                {pcSelects.colorCount && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-rubik text-xs leading-3.5 text-label">
                      Select color{parseInt(pcSelects.colorCount, 10) > 1 ? "s" : ""}:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(powderColors ?? []).map((color) => {
                        const selected = pcColors.includes(color.name);
                        const max = parseInt(pcSelects.colorCount, 10) || 1;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() =>
                              setPcColors((prev) => {
                                if (prev.includes(color.name)) {
                                  return prev.filter((c) => c !== color.name);
                                }
                                if (prev.length >= max) {
                                  return max === 1 ? [color.name] : prev;
                                }
                                return [...prev, color.name];
                              })
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 font-rubik text-xs text-body",
                              selected ? "border-blue bg-blue/5" : "border-field-line bg-white",
                            )}
                          >
                            <span
                              className="size-3 rounded-full border border-field-line"
                              style={{ background: color.hex ?? "transparent" }}
                            />
                            {color.name}
                            {selected && <Check className="size-3 text-blue" />}
                          </button>
                        );
                      })}
                    </div>
                    {pcColors.length !== (parseInt(pcSelects.colorCount, 10) || 0) && (
                      <p className="font-rubik text-xs text-red">
                        Select {pcSelects.colorCount} color
                        {parseInt(pcSelects.colorCount, 10) > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {pcSelects.scope === "rim" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-rubik text-xs leading-3.5 text-label">
                      How many rims?
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={pcQty}
                      onChange={(e) => setPcQty(e.target.value.replace(/\D/g, "") || "1")}
                      className="flex h-9 w-full rounded-lg border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none"
                    />
                  </div>
                )}

                {powderPrice?.found ? (
                  <div className="flex items-center justify-between rounded-lg bg-page px-3 py-2">
                    <span className="font-rubik text-xs text-label">Price</span>
                    <span className="font-rubik text-sm font-semibold text-body">
                      $
                      {(
                        (pcSelects.scope === "rim"
                          ? powderPrice.unitCost * (parseInt(pcQty, 10) || 1)
                          : powderPrice.unitCost) / 100
                      ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : powderPriceFetching ? (
                  <div className="flex items-center justify-between rounded-lg bg-page px-3 py-2">
                    <span className="font-rubik text-xs text-label">Price</span>
                    <Loader2 className="size-4 shrink-0 animate-spin text-label" />
                  </div>
                ) : null}

                <powderCoatingForm.Field name="comments">
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
                </powderCoatingForm.Field>
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
                  {generalSubTab === "brake-service" ? (
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle size" />
                            </SelectTrigger>
                            <SelectPopup>
                              {(vehicleSizes ?? []).map((vs) => (
                                <SelectOption key={vs.id} value={vs.name}>
                                  {vs.name}
                                </SelectOption>
                              ))}
                            </SelectPopup>
                          </Select>
                        </div>
                      )}
                    </generalForm.Field>
                  ) : (
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectPopup>
                              {Array.from({ length: 21 }, (_, i) => i + 10).map((size) => (
                                <SelectOption key={size} value={String(size)}>
                                  {size} inches
                                </SelectOption>
                              ))}
                            </SelectPopup>
                          </Select>
                        </div>
                      )}
                    </generalForm.Field>
                  )}
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
                        {tireLeaves.map((svc) => {
                          const isChecked = !!checkedServices[svc.key];
                          return (
                            <div key={svc.key} className="flex flex-col">
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-2",
                                  isChecked && "bg-page",
                                )}
                              >
                                <FloorCheckbox
                                  checked={isChecked}
                                  onCheckedChange={(c) => {
                                    setCheckedServices((prev) => ({ ...prev, [svc.key]: !!c }));
                                    if (c) setServiceTypeError(null);
                                    if (!c) {
                                      setServiceQuantities((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.key];
                                        return next;
                                      });
                                      setServiceQuantityErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.key];
                                        return next;
                                      });
                                    }
                                  }}
                                />
                                <span className="font-rubik text-sm leading-[18px] text-body">
                                  {svc.label}
                                </span>
                                {tirePrices?.[svc.key]?.found ? (
                                  <span className="ml-auto font-rubik text-sm font-semibold text-body">
                                    $
                                    {(tirePrices[svc.key]!.unitCost / 100).toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                ) : isChecked && tireSize ? (
                                  tirePricesFetching ? (
                                    <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-label" />
                                  ) : (
                                    <span className="ml-auto font-rubik text-xs text-red">
                                      No price set
                                    </span>
                                  )
                                ) : null}
                              </div>
                              {isChecked && (
                                <div className="flex flex-col gap-1 bg-page px-3 pb-2">
                                  <label className="font-rubik text-xs leading-3.5 text-label">
                                    How many?
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={1}
                                    value={serviceQuantities[svc.key] ?? "1"}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/\D/g, "");
                                      setServiceQuantities((prev) => ({
                                        ...prev,
                                        [svc.key]: raw === "" ? "1" : raw,
                                      }));
                                      setServiceQuantityErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[svc.key];
                                        return next;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (["e", "E", "+", "-", "."].includes(e.key)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    placeholder="Enter number"
                                    className={cn(
                                      "flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost",
                                      serviceQuantityErrors[svc.key]
                                        ? "border-red/50"
                                        : "border-field-line",
                                    )}
                                  />
                                  {serviceQuantityErrors[svc.key] && (
                                    <p className="font-rubik text-xs text-red">
                                      {serviceQuantityErrors[svc.key]}
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
                          const unit = brakeUnit[svc.value] ?? "";
                          const removal = brakeRemoval[svc.value];
                          const qty = parseInt(serviceQuantities[svc.value] ?? "1", 10) || 1;
                          const priceReady = !!(
                            unit &&
                            removal !== undefined &&
                            generalSelects.vehicleSize
                          );
                          const brakeUnitCost = priceReady ? brakePriceFor(svc.value) : 0;
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
                                  }}
                                />
                                <span className="font-rubik text-sm leading-[18px] text-body">
                                  {svc.label}
                                </span>
                                {priceReady && brakeUnitCost > 0 ? (
                                  <span className="ml-auto font-rubik text-sm font-semibold text-body">
                                    $
                                    {((brakeUnitCost * qty) / 100).toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                ) : priceReady && brakeCombosFetching ? (
                                  <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-label" />
                                ) : null}
                              </div>
                              {isChecked && (
                                <div className="flex flex-col gap-3 bg-page px-3 pb-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="font-rubik text-xs leading-3.5 text-label">
                                      Single or Pair?
                                    </label>
                                    <Select
                                      value={unit || null}
                                      onValueChange={(v) =>
                                        setBrakeUnit((p) => ({
                                          ...p,
                                          [svc.value]: (v as string) ?? "",
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectPopup>
                                        <SelectOption value="single">Single</SelectOption>
                                        <SelectOption value="pair">Pair</SelectOption>
                                      </SelectPopup>
                                    </Select>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="font-rubik text-xs leading-3.5 text-label">
                                      Removal
                                    </label>
                                    <Select
                                      value={
                                        removal === undefined
                                          ? null
                                          : removal
                                            ? "include"
                                            : "without"
                                      }
                                      onValueChange={(v) =>
                                        setBrakeRemoval((p) => ({
                                          ...p,
                                          [svc.value]: v === "include",
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select">
                                          {(v) =>
                                            v === "include" ? "Include Removal" : "Without Removal"
                                          }
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectPopup>
                                        <SelectOption value="without">Without Removal</SelectOption>
                                        <SelectOption value="include">Include Removal</SelectOption>
                                      </SelectPopup>
                                    </Select>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="font-rubik text-xs leading-3.5 text-label">
                                      How many?
                                    </label>
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      value={serviceQuantities[svc.value] ?? "1"}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setServiceQuantities((prev) => ({
                                          ...prev,
                                          [svc.value]: raw === "" ? "1" : raw,
                                        }));
                                      }}
                                      className="flex h-9 w-full rounded-lg border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none"
                                    />
                                  </div>
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

              <div className="flex flex-col gap-1 px-3">
                <label className="font-rubik text-xs leading-3.5 text-label">Comments:</label>
                <textarea
                  value={generalComments}
                  onChange={(e) => setGeneralComments(e.target.value)}
                  className="min-h-[70px] w-full resize-none rounded-lg border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-ghost"
                />
              </div>
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
                  const selectedRoots = rimJobList.filter((j) => checkedJobs[j.key]);
                  const total = selectedRoots.reduce((sum, root) => {
                    if (root.key === "spot-polish") {
                      const base = spotPrice?.found ? spotPrice.unitCost : 0;
                      return sum + base * (parseInt(spotQty, 10) || 1);
                    }
                    const leafKey = root.children.length ? jobSubTypes[root.key] : root.key;
                    const base = leafKey ? (rimPrices?.[leafKey]?.unitCost ?? 0) : 0;
                    return sum + applyRimModifier(base);
                  }, 0);
                  return (total / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                }
                if (tab === "general") {
                  const tireTotal = tireLeaves
                    .filter((t) => checkedServices[t.key])
                    .reduce((sum, t) => {
                      const qty = parseInt(serviceQuantities[t.key] ?? "1", 10) || 1;
                      return sum + (tirePrices?.[t.key]?.unitCost ?? 0) * qty;
                    }, 0);
                  const brakeTotal = BRAKE_SERVICE_TYPES.filter(
                    (s) => checkedServices[s.value],
                  ).reduce((sum, s) => {
                    const qty = parseInt(serviceQuantities[s.value] ?? "1", 10) || 1;
                    return sum + brakePriceFor(s.value) * qty;
                  }, 0);
                  const total = tireTotal + brakeTotal;
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
                  const base = powderPrice?.unitCost ?? 0;
                  const total =
                    pcSelects.scope === "rim" ? base * (parseInt(pcQty, 10) || 1) : base;
                  return (total / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
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
