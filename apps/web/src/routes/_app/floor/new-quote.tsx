import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Info,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectOption,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/floor/new-quote")({
  component: NewQuotePage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type JobType = "bend-fix" | "crack-fix" | "straighten" | "twist" | "reconstruct" | "general";

interface JobItem {
  id: number;
  title: string;
  description: string;
  quantity: number;
  unitCost: number;
}

// ─── Quote Generator Sheet ────────────────────────────────────────────────────

const JOB_TYPES: { value: JobType; label: string; hasInput?: boolean; inputPlaceholder?: string }[] =
  [
    { value: "bend-fix", label: "Bend Fix", hasInput: true, inputPlaceholder: "No. of Bends" },
    { value: "crack-fix", label: "Crack Fix" },
    { value: "straighten", label: "Straighten" },
    { value: "twist", label: "Twist" },
    { value: "reconstruct", label: "Reconstruct", hasInput: true, inputPlaceholder: "No. of Bends" },
    { value: "general", label: "General" },
  ];

function FloorCheckbox({
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
      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.2px] outline-none transition-colors data-checked:border-blue data-checked:bg-blue border-[#cdcfd1] bg-white"
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

function QuoteGeneratorSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (job: Omit<JobItem, "id">) => void;
}) {
  const [tab, setTab] = useState("rims");
  const [vehicleSize, setVehicleSize] = useState<string | null>(null);
  const [sideOfVehicle, setSideOfVehicle] = useState<string | null>(null);
  const [damageLevel, setDamageLevel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [checkedJobs, setCheckedJobs] = useState<Partial<Record<JobType, boolean>>>({});
  const [jobInputs, setJobInputs] = useState<Partial<Record<JobType, string>>>({});

  function toggleJob(type: JobType, checked: boolean) {
    setCheckedJobs((prev) => ({ ...prev, [type]: checked }));
  }

  function handleAdd() {
    const selectedJobs = JOB_TYPES.filter((j) => checkedJobs[j.value]);
    if (selectedJobs.length === 0) return;

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

    onAdd({
      title: `${vehicleSize ?? "Rims"}`,
      description,
      quantity: parseInt(quantity, 10) || 1,
      unitCost: 0,
    });
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
        {/* Close button — on left edge (hidden when closed to avoid viewport overflow on mobile) */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute -left-9 top-3 flex items-center justify-center rounded-bl-[8px] rounded-tl-[8px] bg-blue p-2 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Close"
        >
          <X className="size-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-0.5 border-b border-field-line p-3">
          <p className="font-rubik text-[16px] font-medium leading-[20px] text-body">
            Quote Generator
          </p>
          <p className="font-rubik text-[12px] leading-[16px] text-label">
            Use options below to generate quote
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <TabsList>
              <TabsTrigger value="rims">Rims</TabsTrigger>
              <TabsTrigger value="other-welding">Other Welding</TabsTrigger>
            </TabsList>

            <TabsContent value="rims" className="flex flex-col gap-4 pt-4">
              {/* Info banner */}
              <div className="flex items-center gap-3 rounded-[8px] bg-[#ebf5ff] px-3 py-2">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                  <Info className="size-5 text-blue" />
                </div>
                <p className="font-rubik text-[12px] leading-[14px] text-body">
                  Enter description of rim job below and then tap{" "}
                  <span className="font-medium">Add to Quote</span>
                </p>
              </div>

              {/* Form */}
              <div className="flex flex-col gap-3">
                {/* Row 1: Vehicle Size + Side of Vehicle */}
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="font-rubik text-[12px] leading-[14px] text-label">
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
                    <label className="font-rubik text-[12px] leading-[14px] text-label">
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

                {/* Row 2: Damage Level + Quantity */}
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="font-rubik text-[12px] leading-[14px] text-label">
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
                    <label className="font-rubik text-[12px] leading-[14px] text-label">
                      Quantity:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="flex h-9 w-full rounded-[8px] border border-field-line bg-white px-2 font-rubik text-[12px] leading-[14px] text-body outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Job Types */}
              <div className="flex flex-col gap-1">
                <p className="font-rubik text-[12px] font-medium leading-[14px] text-body">
                  Job Type:
                </p>
                <div className="flex flex-col gap-2">
                  {JOB_TYPES.map((job) => (
                    <div key={job.value} className="flex items-center gap-3">
                      <div className="flex flex-1 items-center gap-1.5">
                        <FloorCheckbox
                          checked={!!checkedJobs[job.value]}
                          onCheckedChange={(c) => toggleJob(job.value, !!c)}
                        />
                        <span className="font-rubik text-[14px] leading-[18px] text-body">
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
                          className="flex h-9 w-[172px] shrink-0 rounded-[8px] border border-field-line bg-white px-2 font-rubik text-[12px] leading-[14px] text-body placeholder:text-ghost outline-none transition-colors"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="other-welding" className="flex flex-col gap-4 pt-4">
              <p className="font-rubik text-[12px] leading-[14px] text-label">
                Other welding options coming soon.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 border-t border-field-line bg-white p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-[72px] items-center justify-center rounded-[8px] font-rubik text-[12px] leading-[14px] text-body transition-colors hover:bg-page"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-9 w-[128px] items-center justify-center rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-green/90"
          >
            Add to Quote
          </button>
        </div>
      </div>
    </>
  );
}

// ─── New Quote Page ───────────────────────────────────────────────────────────

function NewQuotePage() {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([
    {
      id: 1,
      title: '10" Rims',
      description: "Rim Type: Factory, Damage: MEDIUM, 12 x Bends",
      quantity: 1,
      unitCost: 0,
    },
  ]);

  const subtotal = jobs.reduce((sum, j) => sum + j.quantity * j.unitCost, 0);
  const nextId = Math.max(0, ...jobs.map((j) => j.id)) + 1;

  function addJob(job: Omit<JobItem, "id">) {
    setJobs((prev) => [...prev, { ...job, id: nextId }]);
  }

  function removeJob(id: number) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <button
            type="button"
            onClick={() => void navigate({ to: "/floor" })}
            className="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] border border-blue font-rubik text-[12px] leading-[14px] text-blue transition-colors hover:bg-blue/5"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-green/90"
            >
              <Save className="size-4" />
              Save
            </button>
            <button
              type="button"
              className="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] bg-blue font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-blue/90"
            >
              <Wrench className="size-4" />
              To Technician
            </button>
            <button
              type="button"
              className="flex h-9 w-[72px] items-center justify-center gap-2 rounded-[8px] border border-field-line bg-white font-rubik text-[12px] leading-[14px] text-body transition-colors hover:bg-page"
            >
              More
              <ChevronDown className="size-4 text-ghost" />
            </button>
          </div>
        </div>

        {/* Invoice card */}
        <div className="flex flex-col gap-3 overflow-hidden rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
          {/* Row 1: Logo + Title */}
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="Rim Genie" className="h-12 w-auto" />
            <h2 className="font-rubik text-[22px] font-medium leading-[26px] text-body">
              New Quote
            </h2>
          </div>

          <div className="h-px bg-field-line" />

          {/* Row 2: Dates + Address */}
          <div className="flex items-center gap-4">
            {/* Dates */}
            <div className="flex flex-1 gap-4 font-rubik">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] leading-[14px] text-label">Quote Date:</span>
                <span className="text-[14px] leading-[18px] text-body">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] leading-[14px] text-label">Valid Until:</span>
                <span className="text-[14px] leading-[18px] text-body">
                  {new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="self-stretch w-px bg-field-line" />

            {/* Address */}
            <div className="flex flex-1 justify-end">
              <div className="flex flex-col gap-1 font-rubik text-[14px] leading-[18px] text-body">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-4 shrink-0 text-ghost" />
                  <span>82c Waltham Park Rd,</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-ghost" />
                  <span>Kingston, Jamaica</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0 text-ghost" />
                  <span>876-830-9624</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-field-line" />

          {/* Jobs table */}
          <div className="overflow-x-auto">
            <table className="w-full font-rubik text-[12px]">
              <thead>
                <tr className="border-b border-t border-field-line text-left text-label">
                  <th className="w-12 border-l border-field-line px-2 py-1.5 font-normal">#</th>
                  <th className="border-l border-field-line px-2 py-1.5 font-normal">
                    Description
                  </th>
                  <th className="w-16 border-l border-field-line px-2 py-1.5 font-normal">
                    Quantity
                  </th>
                  <th className="w-20 border-l border-field-line px-2 py-1.5 font-normal">
                    Unit Cost
                  </th>
                  <th className="w-20 border-l border-field-line px-2 py-1.5 font-normal">
                    Total
                  </th>
                  <th className="w-20 border-l border-r border-field-line px-2 py-1.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => (
                  <tr key={job.id} className="border-b border-field-line align-top">
                    <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">
                      {idx + 1}
                    </td>
                    <td className="border-l border-field-line px-2 py-2">
                      <div className="flex flex-col gap-2">
                        <span className="text-[14px] leading-[18px] text-body">{job.title}</span>
                        <span className="text-[12px] leading-[14px] text-label">
                          {job.description}
                        </span>
                        <div className="flex gap-1 text-[14px]">
                          <span className="text-label">Comments:</span>
                        </div>
                      </div>
                    </td>
                    <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">
                      {job.quantity}
                    </td>
                    <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">
                      ${job.unitCost.toFixed(2)}
                    </td>
                    <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">
                      ${(job.quantity * job.unitCost).toFixed(2)}
                    </td>
                    <td className="border-l border-r border-field-line px-2 py-2">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-blue font-rubik text-[12px] leading-[14px] text-blue transition-colors hover:bg-blue/5"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeJob(job.id)}
                          className="flex h-8 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Add Job row */}
                <tr className="border-b border-field-line">
                  <td colSpan={6} className="border-l border-r border-field-line px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setSheetOpen(true)}
                      className="flex items-center gap-1.5 rounded-[8px] font-rubik text-[14px] leading-[18px] text-blue transition-opacity hover:opacity-70"
                    >
                      <Plus className="size-4" />
                      Add Job
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1">
            <label className="font-rubik text-[12px] leading-[14px] text-label">Comments:</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter note"
              rows={3}
              className="w-full resize-none rounded-[8px] border border-field-line bg-white p-2 font-rubik text-[12px] leading-[14px] text-body placeholder:text-ghost outline-none transition-colors"
            />
          </div>

          <div className="h-px bg-field-line" />

          {/* Footer: Share Quote + Totals */}
          <div className="flex items-end justify-between gap-4">
            {/* Share Quote */}
            <div className="flex flex-col gap-1">
              <span className="font-rubik text-[12px] leading-[14px] text-label">
                Share Quote:
              </span>
              <div className="flex flex-col gap-1 font-rubik text-[14px] leading-[18px] text-body">
                <div className="flex items-center gap-1.5">
                  <Mail className="size-4 shrink-0 text-ghost" />
                  <span>neel@gmail.com</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0 text-ghost" />
                  <span>876-830-9624</span>
                </div>
              </div>
            </div>

            {/* Subtotal + Total */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-end gap-3 px-3 font-rubik text-[16px] leading-[20px]">
                <span className="text-label">Subtotal:</span>
                <span className="text-body">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-end gap-3 rounded-sm bg-green px-3 py-2 font-rubik text-[22px] leading-[26px] text-white">
                <span>Total:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Generator Sheet */}
      <QuoteGeneratorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addJob}
      />
    </>
  );
}
