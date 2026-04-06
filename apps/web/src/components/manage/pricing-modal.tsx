import { useEffect } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import type { ServiceCategory } from "@rim-genie/db/schema";
import { quoteVehicleTypeEnum, rimMaterialEnum } from "@rim-genie/db/schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

const SIZE_OPTIONS = Array.from({ length: 16 }, (_, i) => String(i + 13));

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  rim: "Rim",
  welding: "Welding",
  powder_coating: "Powder Coating",
  general: "General",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  truck: "Truck",
  car_suv: "Car/SUV",
  motorcycle: "Motorcycle",
};

const RIM_JOB_TYPE_OPTIONS = [
  { value: "bend-fix", label: "Bend Fix" },
  { value: "crack-fix", label: "Crack Fix" },
  { value: "straighten", label: "Straighten" },
  { value: "twist", label: "Twist" },
  { value: "reconstruct", label: "Reconstruct" },
  { value: "sprung", label: "Sprong" },
  { value: "build-up", label: "Build Up" },
  { value: "platinum-resurfacing", label: "Platinum Resurfacing" },
  { value: "polishing", label: "Spot Polishing" },
];

const WELDING_JOB_TYPE_OPTIONS = [
  { value: "aluminium", label: "Aluminium" },
  { value: "steel", label: "Steel" },
  { value: "stainless-steel", label: "Stainless Steel" },
  { value: "cast-iron", label: "Cast Iron" },
];

const POWDER_COATING_JOB_TYPE_OPTIONS = [{ value: "powder-coating", label: "Powder Coating" }];

const GENERAL_JOB_TYPE_OPTIONS = [
  { value: "disc-rotor-skimming", label: "Disc Rotor Skimming" },
  { value: "brake-drum-skimming", label: "Brake Drum Skimming" },
  { value: "computerized-balancing", label: "Computerized Balancing" },
  { value: "dismount-mount-tire", label: "Dismount and Mount Tire" },
  { value: "dismount-only", label: "Dismount (Remove) Only" },
  { value: "mount-only", label: "Mount (Replace) Tire Only" },
  { value: "tire-plug", label: "Tire Plug" },
  { value: "change-valve", label: "Change of Valve" },
];

function getJobTypeOptions(category: ServiceCategory) {
  switch (category) {
    case "rim":
      return RIM_JOB_TYPE_OPTIONS;
    case "welding":
      return WELDING_JOB_TYPE_OPTIONS;
    case "powder_coating":
      return POWDER_COATING_JOB_TYPE_OPTIONS;
    case "general":
      return GENERAL_JOB_TYPE_OPTIONS;
  }
}

const schema = z.object({
  category: z.string().min(1, "Category is required"),
  jobType: z.string().min(1, "Job type is required"),
  vehicleType: z.string(),
  rimMaterial: z.string(),
  minSize: z.string(),
  maxSize: z.string(),
  unitCostDollars: z
    .string()
    .min(1, "Unit cost is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a valid amount"),
});

export interface PricingRow {
  id: string;
  category: ServiceCategory;
  jobType: string;
  vehicleType: string | null;
  rimMaterial: string | null;
  minSize: number | null;
  maxSize: number | null;
  unitCost: number;
}

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price?: PricingRow;
  defaultCategory?: ServiceCategory;
}

export function PricingModal({ open, onOpenChange, price, defaultCategory }: PricingModalProps) {
  const isEdit = !!price;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.manage.pricing.list.key() });

  const create = useMutation({
    ...orpc.manage.pricing.create.mutationOptions(),
    onSuccess: async () => {
      await invalidate();
      toast.success("Price entry created");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    ...orpc.manage.pricing.update.mutationOptions(),
    onSuccess: async () => {
      await invalidate();
      toast.success("Price entry updated");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const makeInitial = () =>
    price
      ? {
          category: price.category as string,
          jobType: price.jobType,
          vehicleType: price.vehicleType ?? "",
          rimMaterial: price.rimMaterial ?? "",
          minSize: price.minSize != null ? String(price.minSize) : "",
          maxSize: price.maxSize != null ? String(price.maxSize) : "",
          unitCostDollars: (price.unitCost / 100).toString(),
        }
      : {
          category: (defaultCategory ?? "rim") as string,
          jobType: "",
          vehicleType: "",
          rimMaterial: "",
          minSize: "",
          maxSize: "",
          unitCostDollars: "",
        };

  const form = useForm({
    defaultValues: makeInitial(),
    onSubmit: ({ value }) => {
      const unitCost = Math.round(Number(value.unitCostDollars) * 100);
      const category = value.category as ServiceCategory;
      const payload = {
        category,
        jobType: value.jobType,
        vehicleType: value.vehicleType
          ? (value.vehicleType as (typeof quoteVehicleTypeEnum.enumValues)[number])
          : null,
        rimMaterial: value.rimMaterial
          ? (value.rimMaterial as (typeof rimMaterialEnum.enumValues)[number])
          : null,
        minSize: value.minSize ? Number(value.minSize) : null,
        maxSize: value.maxSize ? Number(value.maxSize) : null,
        unitCost,
      };
      if (isEdit) {
        update.mutate({ id: price.id, ...payload });
      } else {
        create.mutate(payload);
      }
    },
    validators: { onSubmit: schema },
  });

  useEffect(() => {
    if (!open) form.reset(makeInitial());
  }, [open]);

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Price" : "Add Price"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-6 p-3"
        >
          <div className="flex flex-col gap-3">
            <form.Field name="category">
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label>Category</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => {
                      field.handleChange(val ?? "");
                      form.setFieldValue("jobType", "");
                      form.setFieldValue("vehicleType", "");
                      form.setFieldValue("rimMaterial", "");
                      form.setFieldValue("minSize", "");
                      form.setFieldValue("maxSize", "");
                    }}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectPopup>
                      {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map((cat) => (
                        <SelectOption key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectOption>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(s) => s.values.category as ServiceCategory}>
              {(currentCategory) => {
                const jobTypeOptions = getJobTypeOptions(currentCategory);
                const showVehicleType = currentCategory === "rim";
                const showMaterial = currentCategory === "rim";
                const showSize = currentCategory === "rim" || currentCategory === "powder_coating";

                return (
                  <>
                    <form.Field name="jobType">
                      {(field) => (
                        <div className="flex flex-col gap-1">
                          <Label>Job Type</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={(val) => field.handleChange(val ?? "")}
                          >
                            <SelectTrigger error={field.state.meta.errors.length > 0}>
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                            <SelectPopup>
                              {jobTypeOptions.map((jt) => (
                                <SelectOption key={jt.value} value={jt.value}>
                                  {jt.label}
                                </SelectOption>
                              ))}
                            </SelectPopup>
                          </Select>
                          {field.state.meta.errors.length > 0 && (
                            <p className="font-rubik text-xs text-red">
                              {String(field.state.meta.errors[0])}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {showVehicleType && (
                      <form.Field name="vehicleType">
                        {(field) => (
                          <div className="flex flex-col gap-1">
                            <Label>Vehicle Type</Label>
                            <Select
                              value={field.state.value}
                              onValueChange={(val) => {
                                field.handleChange(val ?? "");
                                if (val === "motorcycle") {
                                  form.setFieldValue("rimMaterial", "aluminum");
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                              <SelectPopup>
                                {quoteVehicleTypeEnum.enumValues.map((vt) => (
                                  <SelectOption key={vt} value={vt}>
                                    {VEHICLE_TYPE_LABELS[vt]}
                                  </SelectOption>
                                ))}
                              </SelectPopup>
                            </Select>
                          </div>
                        )}
                      </form.Field>
                    )}

                    {showMaterial && (
                      <form.Subscribe selector={(s) => s.values.vehicleType}>
                        {(currentVehicleType) => (
                          <form.Field name="rimMaterial">
                            {(field) => (
                              <div className="flex flex-col gap-1">
                                <Label>Material</Label>
                                <Select
                                  value={field.state.value}
                                  onValueChange={(val) => field.handleChange(val ?? "")}
                                  disabled={currentVehicleType === "motorcycle"}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                  </SelectTrigger>
                                  <SelectPopup>
                                    {rimMaterialEnum.enumValues.map((rm) => (
                                      <SelectOption key={rm} value={rm} className="capitalize">
                                        {rm.charAt(0).toUpperCase() + rm.slice(1)}
                                      </SelectOption>
                                    ))}
                                  </SelectPopup>
                                </Select>
                              </div>
                            )}
                          </form.Field>
                        )}
                      </form.Subscribe>
                    )}

                    {showSize && (
                      <div className="flex gap-3">
                        <form.Field name="minSize">
                          {(field) => (
                            <div className="flex flex-1 flex-col gap-1">
                              <Label>Min Size</Label>
                              <Select
                                value={field.state.value}
                                onValueChange={(val) => field.handleChange(val ?? "")}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectPopup>
                                  {SIZE_OPTIONS.map((size) => (
                                    <SelectOption key={size} value={size}>
                                      {size}"
                                    </SelectOption>
                                  ))}
                                </SelectPopup>
                              </Select>
                            </div>
                          )}
                        </form.Field>

                        <form.Field name="maxSize">
                          {(field) => (
                            <div className="flex flex-1 flex-col gap-1">
                              <Label>Max Size</Label>
                              <Select
                                value={field.state.value}
                                onValueChange={(val) => field.handleChange(val ?? "")}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectPopup>
                                  {SIZE_OPTIONS.map((size) => (
                                    <SelectOption key={size} value={size}>
                                      {size}"
                                    </SelectOption>
                                  ))}
                                </SelectPopup>
                              </Select>
                            </div>
                          )}
                        </form.Field>
                      </div>
                    )}
                  </>
                );
              }}
            </form.Subscribe>

            <form.Field name="unitCostDollars">
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label>Unit Cost ($)</Label>
                  <Input
                    type="number"
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="font-rubik text-xs text-red">
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter className="p-0">
            <DialogClose
              render={
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              }
            />
            <form.Subscribe>
              {(state) => (
                <Button
                  color="success"
                  className="w-32"
                  type="submit"
                  disabled={!state.canSubmit || state.isSubmitting || isPending}
                >
                  Save
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
