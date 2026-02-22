import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { orpc, client } from "@/utils/orpc";

import { useLatestRecords } from "./use-inventory";

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function SODForm() {
  const [rimCount, setRimCount] = useState("");
  const [notes, setNotes] = useState("");
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const queryClient = useQueryClient();
  const { data: latest, isLoading } = useLatestRecords();

  const parsedCount = parseInt(rimCount, 10);
  const hasDiscrepancy =
    !isNaN(parsedCount) && latest?.eod != null && parsedCount !== latest.eod.rimCount;

  const mutation = useMutation({
    mutationFn: async () => {
      if (isNaN(parsedCount) || parsedCount < 0) throw new Error("Please enter a valid rim count");
      return client.inventory.records.createSOD({
        recordDate: getTodayDate(),
        rimCount: parsedCount,
        notes: notes || undefined,
        discrepancyNotes: hasDiscrepancy ? discrepancyNotes || undefined : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.inventory.records.key() });
      toast.success("Start of day record submitted");
      setRimCount("");
      setNotes("");
      setDiscrepancyNotes("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-5 pt-3">
      {latest?.eod && (
        <div className="rounded-xl border border-card-line bg-white p-4 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
          <h3 className="font-rubik text-sm leading-[18px] font-medium text-body">
            Previous EOD Summary
          </h3>
          <div className="flex flex-col gap-1 pt-2 font-rubik text-sm leading-[18px] text-body">
            <p>
              <span className="text-label">Date:</span> {latest.eod.recordDate}
            </p>
            <p>
              <span className="text-label">Rim Count:</span> {latest.eod.rimCount}
            </p>
            <p>
              <span className="text-label">Unfinished Jobs:</span> {latest.eod.unfinishedJobCount}
            </p>
            {latest.eod.recordedBy && (
              <p>
                <span className="text-label">Recorded by:</span> {latest.eod.recordedBy.name}
              </p>
            )}
          </div>
        </div>
      )}

      {!latest?.eod && !isLoading && (
        <div className="flex items-start gap-3 rounded-xl border border-[#fecdca] bg-[#fee4e2] p-4">
          <AlertCircle className="size-5 shrink-0 text-[#d92d20]" />
          <p className="font-rubik text-sm leading-[18px] text-body">
            No previous EOD record found. Please submit an End of Day report first.
          </p>
        </div>
      )}

      <div className="flex max-w-md flex-col gap-4 rounded-xl border border-card-line bg-white p-4 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        <h3 className="font-rubik text-sm leading-[18px] font-medium text-body">
          Start of Day Report
        </h3>

        <div className="flex flex-col gap-1">
          <label className="font-rubik text-xs leading-3.5 text-label">Physical Rim Count</label>
          <input
            type="number"
            min="0"
            value={rimCount}
            onChange={(e) => setRimCount(e.target.value)}
            placeholder="Enter rim count"
            className="h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-label focus:border-blue"
          />
        </div>

        {hasDiscrepancy && (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3 rounded-lg border border-[#fecdca] bg-[#fee4e2] p-3">
              <AlertCircle className="size-5 shrink-0 text-[#d92d20]" />
              <div className="flex flex-col gap-0.5">
                <p className="font-rubik text-sm leading-[18px] font-medium text-body">
                  Discrepancy Detected
                </p>
                <p className="font-rubik text-xs leading-3.5 text-label">
                  EOD count was {latest?.eod?.rimCount}, current count is {parsedCount} (diff:{" "}
                  {parsedCount - (latest?.eod?.rimCount ?? 0)})
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">
                Discrepancy Explanation
              </label>
              <textarea
                value={discrepancyNotes}
                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                placeholder="Explain the difference in count..."
                className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-label focus:border-blue"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-rubik text-xs leading-3.5 text-label">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this morning's inventory..."
            className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-label focus:border-blue"
          />
        </div>

        <Button
          color="success"
          disabled={mutation.isPending || !rimCount || !latest?.eod}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Submitting..." : "Submit SOD"}
        </Button>
      </div>
    </div>
  );
}
