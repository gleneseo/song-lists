const EARLIEST_RELEASE_YEAR = 1800;
const LATEST_RELEASE_YEAR = 2100;

/** Whether `year` is a whole number in a range a production could plausibly have come out in. */
function isValidReleaseYear(year: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= EARLIEST_RELEASE_YEAR &&
    year <= LATEST_RELEASE_YEAR
  );
}

export { EARLIEST_RELEASE_YEAR, isValidReleaseYear, LATEST_RELEASE_YEAR };
