/** Asia/Riyadh is a fixed UTC+3 with no daylight saving, so a constant offset is
 *  exact — and avoids depending on ICU timezone data inside the Worker. */
export const RIYADH_OFFSET_MINUTES = 180;

/** The Riyadh calendar date (YYYY-MM-DD) that a given instant falls on. */
export function riyadhDate(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() + RIYADH_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Riyadh wall-clock time as HH:MM. */
export function riyadhTime(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() + RIYADH_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(11, 16);
}

export function hoursBetween(fromIso: string, to: Date = new Date()): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return Number.POSITIVE_INFINITY;
  return (to.getTime() - from) / 3_600_000;
}
