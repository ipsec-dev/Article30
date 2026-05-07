const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
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
