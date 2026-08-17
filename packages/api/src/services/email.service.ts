import { readFileSync } from "node:fs";

import { Effect } from "effect";
import { Resend } from "resend";
import type { ReactElement } from "react";

import { env } from "@rim-genie/env/server";

import { LOGO_CID } from "../emails/email-layout";
import { resolveLogoPath } from "../pdf/logo";
import { EmailSendFailed } from "./errors";

const resend = new Resend(env.RESEND_API_KEY);

// The layout always renders the logo, so attach it here rather than asking every
// caller to remember. Read once — the file does not change at runtime.
let logoAttachment: { filename: string; content: Buffer; contentId: string } | null | undefined;

function getLogoAttachment() {
  if (logoAttachment !== undefined) return logoAttachment;
  const path = resolveLogoPath();
  try {
    logoAttachment = path
      ? { filename: "logo.png", content: readFileSync(path), contentId: LOGO_CID }
      : null;
  } catch {
    // A missing logo must not stop the email going out.
    logoAttachment = null;
  }
  return logoAttachment;
}

export function send(input: {
  to: string;
  subject: string;
  react: ReactElement;
  attachments?: { filename: string; content: Buffer }[];
}) {
  return Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        react: input.react,
        attachments: [
          ...(input.attachments ?? []).map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
          ...(getLogoAttachment() ? [getLogoAttachment()!] : []),
        ],
      }),
    catch: (err) => new EmailSendFailed({ reason: String(err) }),
  }).pipe(
    Effect.flatMap((result) => {
      if (result.error) {
        return Effect.fail(new EmailSendFailed({ reason: result.error.message }));
      }
      return Effect.succeed(result.data);
    }),
  );
}
