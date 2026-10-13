import { useState } from "react";

import type { AppRouterClient } from "@rim-genie/api/routers/index";
import { isProofVideo } from "@rim-genie/api/lib/proof-limits";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CircleCheck,
  Download,
  ExternalLink,
  Eye,
  ImageIcon,
  Info,
  Paperclip,
  Play,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

import { ProofThumbnail } from "./proof-file-picker";
import { formatFileSize } from "./proof-files";

type Proof = Awaited<ReturnType<AppRouterClient["proofs"]["list"]>>[number];

type ProofContext = {
  invoiceId: string;
  customer: string;
  invoiceNumber: number;
  jobLabel: string;
};

const STAGE_COPY = {
  before: {
    title: "Before Photos & Videos",
    description: "These files were uploaded before the work started.",
  },
  after: {
    title: "After Photos & Videos",
    description: "These files were uploaded when the work was completed.",
  },
} as const;

export function jobProofLabel(item: { vehicleSize: string | null; description: string | null }) {
  return item.vehicleSize ? `${item.vehicleSize}" Rims` : (item.description ?? "");
}

function formatUploadedOn(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ProofPreviewDialog({ proof, onClose }: { proof: Proof | null; onClose: () => void }) {
  return (
    <Dialog open={proof !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{proof?.fileName}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center bg-black p-2">
          {proof &&
            (isProofVideo(proof.mimeType) ? (
              <video src={proof.viewUrl} controls autoPlay playsInline className="max-h-[75dvh]" />
            ) : (
              <img src={proof.viewUrl} alt={proof.fileName} className="max-h-[75dvh]" />
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProofTable({
  proofs,
  isAdmin,
  onPreview,
  onDelete,
}: {
  proofs: Proof[];
  isAdmin: boolean;
  onPreview: (proof: Proof) => void;
  onDelete: (proof: Proof) => void;
}) {
  if (proofs.length === 0) {
    return <p className="py-6 text-center font-rubik text-sm text-label">No files uploaded</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl font-rubik text-sm leading-4.5">
        <thead>
          <tr className="border-b border-card-line text-left text-xs leading-3.5 text-label">
            <th className="py-2 pr-3 font-normal">File</th>
            <th className="py-2 pr-3 font-normal">Type</th>
            <th className="py-2 pr-3 font-normal">Notes</th>
            <th className="py-2 pr-3 font-normal">Uploaded By</th>
            <th className="py-2 pr-3 font-normal">Uploaded On</th>
            <th className="py-2 font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {proofs.map((proof) => {
            const video = isProofVideo(proof.mimeType);
            return (
              <tr key={proof.id} className="border-b border-card-line last:border-b-0">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-3">
                    <ProofThumbnail
                      src={proof.viewUrl}
                      mimeType={proof.mimeType}
                      durationSeconds={proof.durationSeconds}
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="max-w-48 truncate text-body">{proof.fileName}</span>
                      <span className="text-xs leading-3.5 text-label">
                        {formatFileSize(proof.sizeBytes)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1 rounded-sm bg-blue/10 px-1.5 py-1 text-xs leading-3.5 text-blue">
                    {video ? <Video className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                    {video ? "Video" : "Image"}
                  </span>
                </td>
                <td className="max-w-48 py-2 pr-3 text-body">{proof.notes ?? "—"}</td>
                <td className="py-2 pr-3 text-body">{proof.uploadedBy.name}</td>
                <td className="py-2 pr-3 whitespace-nowrap text-body">
                  {formatUploadedOn(proof.createdAt)}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={video ? "Play" : "View"}
                      onClick={() => onPreview(proof)}
                    >
                      {video ? <Play /> : <Eye />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Download"
                      nativeButton={false}
                      render={<a href={proof.downloadUrl} download={proof.fileName} />}
                    >
                      <Download />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        color="destructive"
                        size="sm"
                        aria-label="Delete"
                        onClick={() => onDelete(proof)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JobProofsDialog({
  context,
  proofs,
  open,
  onOpenChange,
}: {
  context: ProofContext;
  proofs: Proof[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [preview, setPreview] = useState<Proof | null>(null);
  const [toDelete, setToDelete] = useState<Proof | null>(null);
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.proofs.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.proofs.list.key() });
        toast.success("File deleted");
        setToDelete(null);
      },
    }),
  );

  const byStage = {
    before: proofs.filter((p) => p.stage === "before"),
    after: proofs.filter((p) => p.stage === "after"),
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader className="flex-col items-start gap-1">
            <DialogTitle>Job Proofs</DialogTitle>
            <p className="flex flex-wrap gap-2 font-rubik text-sm leading-4.5 text-label">
              <span>{context.customer}</span>
              <span>|</span>
              <span>Job ID: {context.invoiceNumber}</span>
              <span>|</span>
              <span>{context.jobLabel}</span>
            </p>
          </DialogHeader>

          <Tabs defaultValue="before" className="flex flex-col gap-4 px-3">
            <TabsList>
              <TabsTrigger value="before">Before ({byStage.before.length})</TabsTrigger>
              <TabsTrigger value="after">After ({byStage.after.length})</TabsTrigger>
            </TabsList>
            {(["before", "after"] as const).map((stage) => (
              <TabsContent key={stage} value={stage} className="flex flex-col gap-3">
                <Banner icon={<Info />}>
                  <p>{STAGE_COPY[stage].title}</p>
                  <p className="text-sm leading-5 font-normal">{STAGE_COPY[stage].description}</p>
                </Banner>
                <ProofTable
                  proofs={byStage[stage]}
                  isAdmin={isAdmin}
                  onPreview={setPreview}
                  onDelete={setToDelete}
                />
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter className="justify-end">
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProofPreviewDialog proof={preview} onClose={() => setPreview(null)} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(next) => !next && setToDelete(null)}
        title="Delete file?"
        description={`${toDelete?.fileName ?? ""} will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate({ id: toDelete.id })}
      />
    </>
  );
}

export function JobProofsSection(context: ProofContext) {
  const [open, setOpen] = useState(false);
  const { data: proofs = [] } = useQuery(
    orpc.proofs.list.queryOptions({ input: { invoiceId: context.invoiceId } }),
  );

  const before = proofs.filter((p) => p.stage === "before").length;
  const after = proofs.length - before;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-card-line bg-page px-3 py-2 font-rubik text-sm leading-4.5">
      <div className="flex items-center gap-2 font-medium text-body">
        <Paperclip className="size-4 text-blue" />
        Job Proofs
        <span className="rounded-full bg-field-line px-2 text-xs leading-5 text-label">
          {proofs.length}
        </span>
      </div>
      <span className="h-5 w-px bg-field-line" />
      <span className="flex items-center gap-1 text-label">
        <Camera className="size-4 text-blue" />
        Before: {before}
      </span>
      <span className="flex items-center gap-1 text-label">
        <CircleCheck className="size-4 text-green" />
        After: {after}
      </span>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View Proofs
        <ExternalLink />
      </Button>

      <JobProofsDialog context={context} proofs={proofs} open={open} onOpenChange={setOpen} />
    </div>
  );
}
