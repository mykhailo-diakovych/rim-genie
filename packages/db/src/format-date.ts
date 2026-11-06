export const BUSINESS_TIME_ZONE = "America/Jamaica";

type DateInput = Date | string | null | undefined;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: BUSINESS_TIME_ZONE,
});

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: BUSINESS_TIME_ZONE,
});

export function formatBusinessDate(d: DateInput, empty = "—"): string {
  return d ? dateFormat.format(new Date(d)) : empty;
}

export function formatBusinessDateTime(d: DateInput, empty = "—"): string {
  return d ? dateTimeFormat.format(new Date(d)) : empty;
}
