import { Effect } from "effect";

import { env } from "@rim-genie/env/server";

import { SmsSendFailed } from "./errors";

interface EasySendSmsResponse {
  status: string;
  messageIds?: string[];
  error?: number;
  description?: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function sanitizeText(text: string): string {
  return text.replace(/[$#]/g, "");
}

export function send(input: { to: string; text: string }) {
  return Effect.tryPromise({
    try: () =>
      fetch("https://restapi.easysendsms.app/v1/rest/sms/send", {
        method: "POST",
        headers: {
          apikey: env.EASYSENDSMS_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          from: env.EASYSENDSMS_SENDER,
          to: normalizePhone(input.to),
          text: sanitizeText(input.text),
          type: "0",
        }),
      }).then((res) => res.json() as Promise<EasySendSmsResponse>),
    catch: (err) => new SmsSendFailed({ reason: String(err) }),
  }).pipe(
    Effect.flatMap((result) => {
      if (result.error || result.status !== "OK") {
        return Effect.fail(
          new SmsSendFailed({
            reason: result.description ?? `EasySendSMS error ${result.error}`,
          }),
        );
      }
      return Effect.succeed(result);
    }),
  );
}
