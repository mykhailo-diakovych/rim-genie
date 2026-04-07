import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client, orpc } from "@/utils/orpc";

import type { ApiJob } from "./types";

type JobAction = "pickup" | "overnight" | "missing";
type NoteType = "OVERNIGHT" | "MISSING";

const ACTION_CONFIG: Record<
  JobAction,
  { title: string; color: "success" | "default" | "destructive" }
> = {
  pickup: { title: "Pickup", color: "success" },
  overnight: { title: "Overnight", color: "default" },
  missing: { title: "Missing", color: "destructive" },
};

const ACTION_NOTE_TYPE: Partial<Record<JobAction, NoteType>> = {
  overnight: "OVERNIGHT",
  missing: "MISSING",
};

interface JobActionDialogProps {
  job: ApiJob;
  action: JobAction;
  trigger: React.ReactElement;
}

interface EditNoteDialogProps {
  job: ApiJob;
  noteType: NoteType;
  initialNote: string;
}

function NoteDialogContent({
  job,
  title,
  color,
  notes,
  setNotes,
  isPending,
  disabled,
  confirmLabel,
  onConfirm,
}: {
  job: ApiJob;
  title: string;
  color: "success" | "default" | "destructive";
  notes: string;
  setNotes: (v: string) => void;
  isPending: boolean;
  disabled: boolean;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <DialogContent className="max-w-[340px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-6 px-3 pt-0 pb-3">
        <div className="flex items-baseline justify-between border-b border-field-line pt-3 pb-2 font-rubik text-sm leading-4.5">
          <span className="font-medium text-body">{job.invoice.customer.name}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-label">Job ID:</span>
            <span className="text-body">{job.invoice.invoiceNumber}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-rubik text-xs leading-3.5 text-label">Notes/Comments:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-4.5 text-body outline-none placeholder:text-label focus:border-blue"
          />
        </div>

        <DialogFooter className="p-0">
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button color={color} disabled={disabled} onClick={onConfirm}>
            {isPending ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}

export function JobActionDialog({ job, action, trigger }: JobActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { title, color } = ACTION_CONFIG[action];

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === "pickup") {
        await client.inventory.jobs.markPickup({ jobId: job.id });
      } else if (action === "missing") {
        await client.inventory.jobs.markMissing({ jobId: job.id, notes: notes || undefined });
      } else {
        await client.inventory.jobs.markOvernight({ jobId: job.id, notes: notes || undefined });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.inventory.jobs.key() });
      const messages: Record<JobAction, string> = {
        pickup: "Job marked as picked up",
        overnight: "Job marked as overnight",
        missing: "Job marked as missing",
      };
      toast.success(messages[action]);
      setNotes("");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setNotes("");
      }}
    >
      <Button variant="outline" color={color} onClick={() => setOpen(true)}>
        {trigger}
        {title}
      </Button>

      <NoteDialogContent
        job={job}
        title={title}
        color={color}
        notes={notes}
        setNotes={setNotes}
        isPending={mutation.isPending}
        disabled={mutation.isPending}
        confirmLabel={title}
        onConfirm={() => mutation.mutate()}
      />
    </Dialog>
  );
}

export function EditNoteDialog({ job, noteType, initialNote }: EditNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNote);
  const queryClient = useQueryClient();

  const action = noteType === "OVERNIGHT" ? "overnight" : "missing";
  const { color } = ACTION_CONFIG[action];
  const title = `Edit ${noteType === "OVERNIGHT" ? "Overnight" : "Missing"} Note`;

  const mutation = useMutation({
    mutationFn: async () => {
      await client.inventory.jobs.updateNote({ jobId: job.id, noteType, newNote: notes });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.inventory.jobs.key() });
      toast.success("Note updated");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setNotes(initialNote);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded p-0.5 text-label hover:bg-gray-100 hover:text-body"
      >
        <Pencil className="size-3" />
      </button>

      <NoteDialogContent
        job={job}
        title={title}
        color={color}
        notes={notes}
        setNotes={setNotes}
        isPending={mutation.isPending}
        disabled={mutation.isPending || !notes.trim()}
        confirmLabel="Save"
        onConfirm={() => mutation.mutate()}
      />
    </Dialog>
  );
}

export { ACTION_NOTE_TYPE };
export type { NoteType };
