// Guards against Excel/Google Sheets formula injection (OWASP CSV injection).
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  let str: string;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else if (typeof value === 'string') {
    str = value;
  } else {
    str = String(value as number | boolean);
  }
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function toCsv(headers: readonly string[], rows: readonly unknown[][]): string {
  return [headers, ...rows].map(r => r.map(escapeCsvCell).join(',')).join('\n');
}
