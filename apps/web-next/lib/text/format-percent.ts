/**
 * A part-of-whole as a whole-number percentage. Anything above zero but
 * under 1% reads "<1%" rather than rounding down to a misleading "0%".
 */
export function formatPercent(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) {
    return "0%";
  }

  const percent = (part / whole) * 100;

  return percent < 1 ? "<1%" : `${Math.round(percent)}%`;
}
