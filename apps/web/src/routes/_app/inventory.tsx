import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Moon, Recycle, X } from "lucide-react";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

// Mock data — replace with real API data when backend is ready
const MOCK_OVERNIGHT_JOBS = [
  {
    id: "5118",
    customer: "Smith Jack",
    rimSize: `10"`,
    rimType: "Factory",
    damage: "MEDIUM",
    repairs: "2 x Bends",
  },
  {
    id: "5116",
    customer: "Savannah Nguyen",
    rimSize: `11"`,
    rimType: "Off market",
    damage: "SEVERE",
    repairs: "1 x Cracks",
  },
  {
    id: "5115",
    customer: "Dianne Russell",
    rimSize: `13"`,
    rimType: "Factory",
    damage: "MEDIUM",
    repairs: "2 x Straighten",
  },
];

type Job = (typeof MOCK_OVERNIGHT_JOBS)[number];

// ─── Shared confirmation modal ────────────────────────────────────────────────

interface JobActionDialogProps {
  title: string;
  job: Job;
  /** Tailwind bg class for the confirm button */
  confirmBg: string;
  /** Trigger element rendered as the Dialog.Trigger */
  triggerClassName: string;
  triggerContent: React.ReactNode;
}

function JobActionDialog({
  title,
  job,
  confirmBg,
  triggerClassName,
  triggerContent,
}: JobActionDialogProps) {
  const [notes, setNotes] = useState("");

  return (
    <Dialog.Root>
      <Dialog.Trigger className={triggerClassName}>
        {triggerContent}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-field-line py-3 pr-2 pl-3">
            <p className="font-rubik text-[16px] leading-[20px] font-medium text-[#1a1f1a]">
              {title}
            </p>
            <Dialog.Close className="flex items-center rounded-[6px] p-1 text-label transition-colors hover:text-body">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-6 px-3 pt-0 pb-3">
            {/* Customer + Job ID */}
            <div className="flex items-baseline justify-between border-b border-field-line pt-3 pb-2 font-rubik text-[14px] leading-[18px]">
              <span className="font-medium text-body">{job.customer}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-label">Job ID:</span>
                <span className="text-body">{job.id}</span>
              </div>
            </div>

            {/* Notes / Comments */}
            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">
                Notes/Comments:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[70px] w-full resize-none rounded-[8px] border border-field-line bg-white p-2 font-rubik text-[14px] leading-[18px] text-body outline-none placeholder:text-[#a0a3a0] focus:border-blue"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-2">
              <Dialog.Close className="flex h-9 w-[72px] items-center justify-center rounded-[8px] font-rubik text-[12px] leading-[14px] text-body transition-colors hover:bg-black/5">
                Cancel
              </Dialog.Close>
              <Dialog.Close
                className={`flex h-9 w-[128px] items-center justify-center rounded-[8px] font-rubik text-[12px] leading-[14px] text-white transition-opacity hover:opacity-90 ${confirmBg}`}
                onClick={() => setNotes("")}
              >
                {title}
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function OvernightJobCard({ job }: { job: Job }) {
  const btnBase =
    "flex h-9 items-center justify-center gap-1.5 rounded-[8px] border px-2 font-rubik text-[12px] leading-[14px] transition-colors";

  return (
    <div className="flex gap-4 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      {/* Left */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
              {job.customer}
            </span>
            <span className="rounded-[4px] bg-[#243a5e] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-[#ebf0ff]">
              Overnight
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-rubik text-[12px] leading-[14px]">
            <span className="text-label">Job ID:</span>
            <span className="text-body">{job.id}</span>
          </div>
        </div>
        <div className="font-rubik text-[14px] leading-[18px] text-body">
          <p>{job.rimSize} Rims</p>
          <p>
            Rim Type: {job.rimType}, Damage: {job.damage}, {job.repairs}
          </p>
        </div>
      </div>

      {/* Right — action buttons */}
      <div className="flex shrink-0 flex-col gap-2">
        <JobActionDialog
          title="Pickup"
          job={job}
          confirmBg="bg-green"
          triggerClassName={`${btnBase} border-green text-green hover:bg-green/5`}
          triggerContent={
            <>
              <Recycle className="size-4" />
              Pickup
            </>
          }
        />
        <JobActionDialog
          title="Overnight"
          job={job}
          confirmBg="bg-green"
          triggerClassName={`${btnBase} w-[104px] border-blue text-blue hover:bg-blue/5`}
          triggerContent={
            <>
              <Moon className="size-4" />
              Overnight
            </>
          }
        />
        <JobActionDialog
          title="Missing"
          job={job}
          confirmBg="bg-[#db3e21]"
          triggerClassName={`${btnBase} border-[#db3e21] text-[#db3e21] hover:bg-[#db3e21]/5`}
          triggerContent={
            <>
              <AlertCircle className="size-4" />
              Missing
            </>
          }
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function InventoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
        List of Overnight Jobs
      </h1>
      <div className="flex flex-col gap-2">
        {MOCK_OVERNIGHT_JOBS.map((job) => (
          <OvernightJobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
