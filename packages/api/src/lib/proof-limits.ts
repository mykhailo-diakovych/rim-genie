const MB = 1024 * 1024;

// The client set the 5-minute video limit; the byte limits are our defaults until they confirm.
export const PROOF_LIMITS = {
  maxImageBytes: 10 * MB,
  maxVideoBytes: 500 * MB,
  maxVideoSeconds: 5 * 60,
} as const;

export const PROOF_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;
export const PROOF_VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;
export const PROOF_MIME_TYPES = [...PROOF_IMAGE_TYPES, ...PROOF_VIDEO_TYPES] as const;

export type ProofMimeType = (typeof PROOF_MIME_TYPES)[number];

export function isProofVideo(mimeType: string) {
  return (PROOF_VIDEO_TYPES as readonly string[]).includes(mimeType);
}

export function proofSizeLimit(mimeType: string) {
  return isProofVideo(mimeType) ? PROOF_LIMITS.maxVideoBytes : PROOF_LIMITS.maxImageBytes;
}
