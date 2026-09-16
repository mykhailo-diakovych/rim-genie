import { Effect } from "effect";
import { Resend } from "resend";
import type { ReactElement } from "react";

import { env } from "@rim-genie/env/server";

import { LOGO_CID } from "../emails/email-layout";
import { getLogoBuffer } from "../pdf/logo";
import { EmailSendFailed } from "./errors";

const resend = new Resend(env.RESEND_API_KEY);

// The layout always renders the logo, so it is attached centrally for every send.
function getLogoAttachment() {
  return { filename: "logo.png", content: getLogoBuffer(), contentId: LOGO_CID };
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
          getLogoAttachment(),
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
