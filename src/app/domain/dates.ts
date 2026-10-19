export const DAY_MS = 86_400_000;

export const startOfDay = (value: Date | string | number): Date => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const today = (): Date => startOfDay(new Date());

export const daysBetween = (from: Date | string, to: Date | string): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

export const daysTo = (target: Date | string, from: Date = today()): number =>
  daysBetween(from, target);

export const addDays = (value: Date, days: number): Date =>
  new Date(startOfDay(value).getTime() + days * DAY_MS);

export const monthKey = (value: Date | string): string => {
  const date = startOfDay(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const isoDate = (value: Date | string): string =>
  startOfDay(value).toISOString().slice(0, 10);
