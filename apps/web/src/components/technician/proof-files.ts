import { useEffect, useRef, useState } from "react";

import {
  PROOF_LIMITS,
  PROOF_MIME_TYPES,
  type ProofMimeType,
  isProofVideo,
  proofSizeLimit,
} from "@rim-genie/api/lib/proof-limits";

import { client } from "@/utils/orpc";

export type PendingProof = {
  id: string;
  file: File;
  mimeType: ProofMimeType;
  previewUrl: string;
  durationSeconds?: number;
  notes: string;
};

export type UploadedProof = {
  objectKey: string;
  fileName: string;
  notes?: string;
  durationSeconds?: number;
};

const MB = 1024 * 1024;

export const PROOF_ACCEPT =
  "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,.mov";

export const PROOF_FORMATS_LABEL = `JPG, PNG, HEIC, MP4, MOV (max. ${PROOF_LIMITS.maxImageBytes / MB}MB per photo, ${PROOF_LIMITS.maxVideoBytes / MB}MB per video)`;

const MIME_BY_EXTENSION: Record<string, ProofMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

// Some browsers report HEIC/MOV with an empty or generic type, so the extension decides.
function proofMimeType(file: File): ProofMimeType | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (MIME_BY_EXTENSION[ext]) return MIME_BY_EXTENSION[ext];
  return (PROOF_MIME_TYPES as readonly string[]).includes(file.type)
    ? (file.type as ProofMimeType)
    : null;
}

function readVideoDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const done = (value: number | undefined) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      resolve(value);
    };
    const timer = setTimeout(() => done(undefined), 10_000);
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) ? Math.round(video.duration) : undefined);
    video.onerror = () => done(undefined);
    video.src = url;
  });
}

export function formatFileSize(bytes: number) {
  return bytes >= MB
    ? `${(bytes / MB).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function useProofFiles() {
  const [files, setFiles] = useState<PendingProof[]>([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const uploadedKeys = useRef(new Map<string, string>());

  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl)), []);

  async function add(list: FileList | File[]): Promise<string[]> {
    const errors: string[] = [];
    const accepted: PendingProof[] = [];

    for (const file of Array.from(list)) {
      const mimeType = proofMimeType(file);
      if (!mimeType) {
        errors.push(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > proofSizeLimit(mimeType)) {
        errors.push(`${file.name}: larger than ${proofSizeLimit(mimeType) / MB}MB`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      let durationSeconds: number | undefined;
      if (isProofVideo(mimeType)) {
        durationSeconds = await readVideoDuration(previewUrl);
        if (durationSeconds !== undefined && durationSeconds > PROOF_LIMITS.maxVideoSeconds) {
          URL.revokeObjectURL(previewUrl);
          errors.push(`${file.name}: videos can be at most 5 minutes long`);
          continue;
        }
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        mimeType,
        previewUrl,
        durationSeconds,
        notes: "",
      });
    }

    setFiles((prev) => [...prev, ...accepted]);
    return errors;
  }

  function remove(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function clear() {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
  }

  function setNotes(id: string, notes: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, notes } : f)));
  }

  // Sends each file straight to storage with a presigned URL; the API only sees the keys.
  // Keys are remembered so a retry (e.g. after a wrong technician code) does not upload twice.
  async function upload(target: { invoiceId: string; jobId?: string }): Promise<UploadedProof[]> {
    const uploaded: UploadedProof[] = [];
    for (const proof of filesRef.current) {
      let objectKey = uploadedKeys.current.get(proof.id);
      if (!objectKey) {
        const prepared = await client.proofs.prepareUpload({
          ...target,
          fileName: proof.file.name,
          mimeType: proof.mimeType,
          sizeBytes: proof.file.size,
          durationSeconds: proof.durationSeconds,
        });
        const res = await fetch(prepared.uploadUrl, {
          method: "PUT",
          body: proof.file,
          headers: { "Content-Type": proof.mimeType },
        });
        if (!res.ok) throw new Error(`Could not upload ${proof.file.name}`);
        objectKey = prepared.objectKey;
        uploadedKeys.current.set(proof.id, objectKey);
      }
      uploaded.push({
        objectKey,
        fileName: proof.file.name,
        notes: proof.notes.trim() || undefined,
        durationSeconds: proof.durationSeconds,
      });
    }
    return uploaded;
  }

  return { files, add, remove, clear, setNotes, upload };
}
