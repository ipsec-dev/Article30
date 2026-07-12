// Pin locale AND timezone so the server (UTC) and the browser render identical
// text — otherwise date/time formatting drifts and React reports a hydration
// mismatch. Europe/Paris matches the product's primary jurisdiction.
const DISPLAY_TIME_ZONE = 'Europe/Paris';

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  return DATE_FMT.format(toDate(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  return DATE_TIME_FMT.format(toDate(value));
}
