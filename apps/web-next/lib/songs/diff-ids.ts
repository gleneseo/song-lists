/**
 * What it takes to turn the `current` set of IDs into the `desired` one:
 * the IDs to remove and the IDs to add. Duplicates in either input are
 * ignored, and IDs in both are left alone.
 */
function diffIds<Id extends string | number>(
  current: readonly Id[],
  desired: readonly Id[],
): { toRemove: Id[]; toAdd: Id[] } {
  const currentSet = new Set(current);
  const desiredSet = new Set(desired);

  return {
    toRemove: [...currentSet].filter((id) => !desiredSet.has(id)),
    toAdd: [...desiredSet].filter((id) => !currentSet.has(id)),
  };
}

export { diffIds };
