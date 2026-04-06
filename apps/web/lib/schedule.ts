/**
 * Calculates evenly-spaced suggested medication times starting from 08:00.
 * @param frequencyHours - interval between doses in hours (e.g., 8 = every 8h)
 * @returns array of time strings in "HH:MM" format
 */
export function calcSuggestedTimes(frequencyHours: number): string[] {
  if (frequencyHours <= 0) throw new Error("frequencyHours must be positive");
  if (frequencyHours < 3) throw new Error("Frequency less than 3 hours requires manual confirmation");

  const dosesPerDay = Math.round(24 / frequencyHours);
  const intervalMinutes = (24 * 60) / dosesPerDay;
  const baseMinutes = 8 * 60; // 08:00

  const times: string[] = [];
  for (let i = 0; i < dosesPerDay; i++) {
    const totalMinutes = (baseMinutes + intervalMinutes * i) % (24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    times.push(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  }

  return times;
}

/**
 * Parses a fraction string like "1/4" or "0.5" into a decimal number.
 */
export function parseFraction(fraction: string): number {
  if (fraction.includes("/")) {
    const [num, den] = fraction.split("/").map(Number);
    if (!den) throw new Error("Invalid fraction");
    return num / den;
  }
  return parseFloat(fraction);
}
