/**
 * Whether an on/off environment setting is on. Every such setting is off
 * unless it is exactly `true`, so a missing, blank, or misspelled value never
 * switches something on by accident.
 */
function switchedOn(value: string | undefined): boolean {
  return value === "true";
}

export { switchedOn };
