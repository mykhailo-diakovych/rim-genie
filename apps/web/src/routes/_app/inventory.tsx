import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Moon, Recycle } from "lucide-react";

import type { DialogTriggerProps } from "@base-ui/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

interface JobActionDialogProps {
  title: string;
  job: Job;
  confirmColor: "success" | "destructive";
  trigger: DialogTriggerProps["render"];
}

function JobActionDialog({ title, job, confirmColor, trigger }: JobActionDialogProps) {
  const [notes, setNotes] = useState("");

  return (
    <Dialog>
      <DialogTrigger render={trigger} />

      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-3 pt-0 pb-3">
          <div className="flex items-baseline justify-between border-b border-field-line pt-3 pb-2 font-rubik text-sm leading-[18px]">
            <span className="font-medium text-body">{job.customer}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-label">Job ID:</span>
              <span className="text-body">{job.id}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-rubik text-xs leading-3.5 text-label">Notes/Comments:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-[#a0a3a0] focus:border-blue"
            />
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <DialogClose
              render={<Button color={confirmColor} className="w-32" />}
              onClick={() => setNotes("")}
            >
              {title}
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OvernightJobCard({ job }: { job: Job }) {
  return (
    <div className="flex gap-4 rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <span className="font-rubik text-sm leading-[18px] font-medium text-body">
              {job.customer}
            </span>
            <span className="rounded-[4px] bg-[#243a5e] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-[#ebf0ff]">
              Overnight
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-rubik text-xs leading-3.5">
            <span className="text-label">Job ID:</span>
            <span className="text-body">{job.id}</span>
          </div>
        </div>
        <div className="font-rubik text-sm leading-[18px] text-body">
          <p>{job.rimSize} Rims</p>
          <p>
            Rim Type: {job.rimType}, Damage: {job.damage}, {job.repairs}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <JobActionDialog
          title="Pickup"
          job={job}
          confirmColor="success"
          trigger={
            <Button variant="outline" color="success">
              <Recycle />
              Pickup
            </Button>
          }
        />
        <JobActionDialog
          title="Overnight"
          job={job}
          confirmColor="success"
          trigger={
            <Button variant="outline">
              <Moon />
              Overnight
            </Button>
          }
        />
        <JobActionDialog
          title="Missing"
          job={job}
          confirmColor="destructive"
          trigger={
            <Button variant="outline" color="destructive">
              <AlertCircle />
              Missing
            </Button>
          }
        />
      </div>
    </div>
  );
}

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
