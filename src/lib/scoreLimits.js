// Battery/core combos and double points can legitimately exceed the old cap.
// Keep this ceiling aligned with the score policies and named-upload SQL.
export const MAX_SCORE = 1000000;
export const LEGACY_SCORE_LIMIT = 60000;
