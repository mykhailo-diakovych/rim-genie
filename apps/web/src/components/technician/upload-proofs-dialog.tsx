import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Info } from "lucide-react";
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
import { client, orpc } from "@/utils/orpc";

import { ProofFilePicker } from "./proof-file-picker";
import { useProofFiles } from "./proof-files";
import { ProofJobFields } from "./proof-job-fields";
import { type JobGroup } from "./types";
import { isCompletable } from "./use-jobs";

/** Upload while the job is in progress: the server always files these as "before" proofs. */
export function UploadProofsDialog({ group, jobId }: { group: JobGroup; jobId?: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const proofs = useProofFiles();
  const queryClient = useQueryClient();

  const inProgress = group.jobs.filter(isCompletable);
  const contextJobId = jobId ?? (inProgress.length === 1 ? inProgress[0]!.id : undefined);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (proofs.files.length === 0) throw new Error("Add at least one photo or video");
      const target = { invoiceId: group.invoiceId, jobId: contextJobId };
      const files = await proofs.upload(target);
      await client.proofs.add({ ...target, files, notes });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.proofs.list.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.technician.jobs.list.key() }),
      ]);
      toast.success("Proofs uploaded");
      handleOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setNotes("");
      proofs.clear();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" color="success" />}>
        <Camera />
        Proofs
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Upload Job Proofs</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-3 pb-3">
          <Banner icon={<Info />}>
            <p>Before Photos</p>
            <p className="text-sm leading-5 font-normal">
              Please take clear photos or videos of the current condition before starting the work.
            </p>
          </Banner>

          <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
            <ProofJobFields
              group={group}
              notes={notes}
              onNotesChange={setNotes}
              notesPlaceholder="Add any notes about the current condition..."
            />
            <ProofFilePicker
              title="Before Photos & Videos"
              proofs={proofs}
              disabled={uploadMutation.isPending}
            />
          </div>

          <DialogFooter className="justify-end p-0">
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              color="success"
              disabled={uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload proofs"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
