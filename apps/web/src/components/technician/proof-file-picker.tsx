import { useState } from "react";

import { isProofVideo } from "@rim-genie/api/lib/proof-limits";
import { FileImage, Play, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  PROOF_ACCEPT,
  PROOF_FORMATS_LABEL,
  type PendingProof,
  formatDuration,
  formatFileSize,
  type useProofFiles,
} from "./proof-files";

export function ProofThumbnail({
  src,
  mimeType,
  durationSeconds,
}: {
  src: string;
  mimeType: string;
  durationSeconds?: number | null;
}) {
  const [failed, setFailed] = useState(false);
  const video = isProofVideo(mimeType);

  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-page">
      {failed ? (
        <FileImage className="size-6 text-ghost" />
      ) : video ? (
        <video
          src={`${src}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      )}
      {video && (
        <>
          <Play className="absolute size-5 fill-white text-white" />
          {durationSeconds != null && (
            <span className="absolute right-1 bottom-1 rounded-sm bg-black/70 px-1 font-rubik text-xs text-white">
              {formatDuration(durationSeconds)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function PendingProofRow({
  proof,
  onNotes,
  onRemove,
}: {
  proof: PendingProof;
  onNotes: (notes: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-card-line bg-white p-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ProofThumbnail
          src={proof.previewUrl}
          mimeType={proof.mimeType}
          durationSeconds={proof.durationSeconds}
        />
        <div className="flex min-w-0 flex-col gap-1 font-rubik">
          <span className="truncate text-sm leading-4.5 text-body">{proof.file.name}</span>
          <span className="text-xs leading-3.5 text-label">{formatFileSize(proof.file.size)}</span>
        </div>
      </div>
      <div className="flex items-end gap-2 sm:w-1/2 sm:border-l sm:border-card-line sm:pl-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-rubik text-xs leading-3.5 text-label">Notes (optional)</span>
          <input
            value={proof.notes}
            onChange={(e) => onNotes(e.target.value)}
            maxLength={500}
            className="h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none focus:border-blue"
          />
        </label>
        <Button
          variant="outline"
          color="destructive"
          className="size-9 shrink-0 p-0"
          aria-label={`Remove ${proof.file.name}`}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

export function ProofFilePicker({
  title,
  proofs,
  disabled,
}: {
  title: string;
  proofs: ReturnType<typeof useProofFiles>;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const errors = await proofs.add(list);
    for (const error of errors) toast.error(error);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-card-line bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-rubik text-base leading-5 font-medium text-body">{title}</h3>
        <span className="font-rubik text-xs leading-3.5 text-label">{PROOF_FORMATS_LABEL}</span>
      </div>

      <label
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-blue/50 bg-blue/5 px-6 py-4 transition-colors hover:bg-blue/10",
          dragging && "bg-blue/10",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex size-11 items-center justify-center rounded-md bg-blue/10">
          <Upload className="size-5 text-blue" />
        </div>
        <div className="flex flex-col items-center gap-1 font-rubik">
          <p className="text-center text-sm leading-4.5 text-body">
            Click to upload photos or videos
          </p>
          <p className="text-center text-xs leading-3.5 text-label">or drag and drop files here</p>
        </div>
        <input
          type="file"
          className="sr-only"
          accept={PROOF_ACCEPT}
          multiple
          disabled={disabled}
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {proofs.files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-rubik">
            <span className="text-sm leading-4.5 font-medium text-body">
              Attached Files ({proofs.files.length})
            </span>
            <button
              type="button"
              className="text-sm leading-4.5 text-blue hover:underline disabled:opacity-50"
              disabled={disabled}
              onClick={proofs.clear}
            >
              Clear All
            </button>
          </div>
          {proofs.files.map((proof) => (
            <PendingProofRow
              key={proof.id}
              proof={proof}
              onNotes={(notes) => proofs.setNotes(proof.id, notes)}
              onRemove={() => proofs.remove(proof.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
