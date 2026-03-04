import { Effect } from "effect";
import { Resend } from "resend";
import type { ReactElement } from "react";

import { env } from "@rim-genie/env/server";

import { EmailSendFailed } from "./errors";

const resend = new Resend(env.RESEND_API_KEY);

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
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
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
