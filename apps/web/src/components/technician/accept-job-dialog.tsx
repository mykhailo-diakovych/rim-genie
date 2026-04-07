import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { client, orpc } from "@/utils/orpc";

import { DialogCustomerRow } from "./dialog-shared";

function getDateValue(key: string): string {
  const now = new Date();
  if (key === "today") return now.toISOString();
  if (key === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  const d = new Date(now);
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

interface AcceptJobDialogProps {
  customer: string;
  jobId: string;
  jobIds: string[];
  triggerClassName: string;
  triggerContent: React.ReactNode;
}

export function AcceptJobDialog({
  customer,
  jobId,
  jobIds,
  triggerClassName,
  triggerContent,
}: AcceptJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [technician, setTechnician] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [pin, setPin] = useState("");
  const queryClient = useQueryClient();

  const { data: technicians } = useQuery(orpc.technician.technicians.list.queryOptions());

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!technician || !completionDate || pin.length !== 4) {
        throw new Error("Please fill in all fields");
      }

      const { valid } = await client.technician.jobs.verifyPin({
        userId: technician,
        pin,
      });
      if (!valid) throw new Error("Invalid technician code");

      const dueDate = getDateValue(completionDate);
      for (const id of jobIds) {
        await client.technician.jobs.accept({ jobId: id, technicianId: technician });
        await client.technician.jobs.setDueDate({
          jobId: id,
          dueDate,
          isOvernight: completionDate !== "today",
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.technician.jobs.list.key() });
      toast.success("Job accepted");
      resetForm();
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetForm() {
    setTechnician("");
    setCompletionDate("");
    setPin("");
  }

  function handleConfirm() {
    acceptMutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger className={triggerClassName}>{triggerContent}</DialogTrigger>

      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Accept Job</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={customer} jobId={jobId} />

            <Select value={technician} onValueChange={(v) => setTechnician(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Technician">
                  {technicians?.find((t) => t.id === technician)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {technicians?.map((t) => (
                  <SelectOption key={t.id} value={t.id}>
                    {t.name}
                  </SelectOption>
                ))}
              </SelectPopup>
            </Select>

            <Select value={completionDate} onValueChange={(v) => setCompletionDate(v ?? "")}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0 text-ghost" />
                  <SelectValue placeholder="Select expected completion date" />
                </div>
              </SelectTrigger>
              <SelectPopup>
                <SelectOption value="today">Today</SelectOption>
                <SelectOption value="tomorrow">Tomorrow</SelectOption>
                <SelectOption value="week">In a week</SelectOption>
              </SelectPopup>
            </Select>

            <div className="flex flex-col gap-1">
              <Label>Technician Code:</Label>
              <PinInput value={pin} onChange={setPin} />
            </div>
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button
              color="success"
              className="w-32"
              disabled={acceptMutation.isPending}
              onClick={handleConfirm}
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
