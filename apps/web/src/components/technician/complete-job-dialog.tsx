import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Banner } from "@/components/ui/banner";
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
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { client, orpc } from "@/utils/orpc";

import { ProofFilePicker } from "./proof-file-picker";
import { useProofFiles } from "./proof-files";
import { ProofJobFields } from "./proof-job-fields";
import { type JobGroup } from "./types";

const AFTER_PROOF_REQUIRED =
  "Upload at least one photo or video of the completed work before completing the job";

export function CompleteJobDialog({
  group,
  jobIds,
}: {
  group: JobGroup;
  /** Restrict completion to these jobs. Omit to complete every unfinished job in
   *  the group — the list card completes the whole invoice, the detail view a row. */
  jobIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [techCode, setTechCode] = useState("");
  const proofs = useProofFiles();
  const queryClient = useQueryClient();

  const targets = group.jobs.filter(
    (j) => j.status !== "completed" && (!jobIds || jobIds.includes(j.id)),
  );

  const { data: savedProofs } = useQuery({
    ...orpc.proofs.list.queryOptions({ input: { invoiceId: group.invoiceId } }),
    enabled: open,
  });
  const hasAfterProof = savedProofs?.some((p) => p.stage === "after") ?? false;

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (proofs.files.length === 0 && !hasAfterProof) throw new Error(AFTER_PROOF_REQUIRED);
      if (techCode.length !== 4) throw new Error("Please enter a complete 4-digit code");

      const afterProofs = await proofs.upload({
        invoiceId: group.invoiceId,
        jobId: targets.length === 1 ? targets[0]!.id : undefined,
      });
      for (const j of targets) {
        await client.technician.jobs.complete({ jobId: j.id, code: techCode, notes, afterProofs });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.technician.jobs.list.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.proofs.list.key() }),
      ]);
      toast.success("Job completed");
      handleOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setNotes("");
      setTechCode("");
      proofs.clear();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button color="success" />}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 11.4787C10 11.4787 10.6667 11.6681 11 12.3347C11.3333 13.0014 11.7308 10.6681 12.672 10.3347M6.24579 6.66621C6.24579 4.38001 6.21334 2.8871 7.04808 2.09425C7.88275 1.30141 8.25145 1.33351 11.9491 1.33351C12.3064 1.33206 12.4863 1.74259 12.2336 1.98263L10.3298 3.79143C9.84654 4.25055 9.84521 4.99489 10.3285 5.45395C10.8118 5.91302 11.5954 5.91307 12.0788 5.45407L13.9831 3.6457C14.2358 3.40573 14.668 3.57656 14.6665 3.91597C14.6665 5.73892 14.6756 6.71003 14.5676 7.33333M6.24579 6.66621L1.91469 10.7811C1.13955 11.5174 1.13955 12.7113 1.91469 13.4478C2.68983 14.1841 3.94657 14.1841 4.7217 13.4478L6.66667 11.5997M6.24579 6.66621C6.24622 7.4625 6.61408 8.17779 7.19702 8.66667M3.44489 12H3.4386M14.6667 11.332C14.6667 13.1729 13.1743 14.6653 11.3333 14.6653C9.4924 14.6653 8 13.1729 8 11.332C8 9.49107 9.4924 7.99867 11.3333 7.99867C13.1743 7.99867 14.6667 9.49107 14.6667 11.332Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        Done
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-3 pb-3">
          <Banner icon={<AlertCircle />}>
            <p>Please Remember</p>
            <p className="text-sm leading-5 font-normal">
              Upload photos or videos showing the completed work before marking this job as done.
            </p>
          </Banner>

          <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
            <ProofJobFields
              group={group}
              notes={notes}
              onNotesChange={setNotes}
              notesPlaceholder="Add any notes about the completed job..."
            >
              <div className="flex flex-col gap-1">
                <Label>Technician Code</Label>
                <PinInput value={techCode} onChange={setTechCode} />
              </div>
            </ProofJobFields>
            <ProofFilePicker
              title="Completion Photos & Videos"
              proofs={proofs}
              disabled={completeMutation.isPending}
            />
          </div>

          <DialogFooter className="justify-end p-0">
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              color="success"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? "Completing..." : "Done"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
