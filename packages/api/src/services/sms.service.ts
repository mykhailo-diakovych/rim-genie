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

// Rejections come back capitalised ({"Error":4003,"Description":"Invalid API Key."}),
// successes in lower case.
function parseResponse(body: string): EasySendSmsResponse | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const raw = parsed as EasySendSmsResponse & { Error?: number; Description?: string };
    return {
      ...raw,
      error: raw.error ?? raw.Error,
      description: raw.description ?? raw.Description,
    };
  } catch {
    return undefined;
  }
}

function describeFailure(response: {
  ok: boolean;
  status: number;
  body: string;
  result: EasySendSmsResponse | undefined;
}) {
  const { ok, status, body, result } = response;
  const prefix = ok ? "EasySendSMS error" : `EasySendSMS HTTP ${status}`;
  const code = result?.error !== undefined ? ` (code ${result.error})` : "";
  const detail = result ? result.description : body.trim().slice(0, 200) || undefined;
  return `${prefix}${code}${detail ? `: ${detail}` : ""}`;
}

export function send(input: { to: string; text: string }) {
  return Effect.tryPromise({
    try: async () => {
      const res = await fetch("https://restapi.easysendsms.app/v1/rest/sms/send", {
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
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.text();
      return { ok: res.ok, status: res.status, body, result: parseResponse(body) };
    },
    catch: (err) => new SmsSendFailed({ reason: `EasySendSMS request failed: ${String(err)}` }),
  }).pipe(
    Effect.flatMap((response) => {
      const { ok, result } = response;
      if (!ok || !result || result.error || result.status !== "OK") {
        return Effect.fail(new SmsSendFailed({ reason: describeFailure(response) }));
      }
      return Effect.succeed(result);
    }),
  );
}
