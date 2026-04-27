const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const m = MONTHS[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const y = d.getUTCFullYear();
  return `${m} ${day}, ${y}`;
}

