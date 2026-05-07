// Hybrid rule: assignee → org DPO → null.
// Returning null means "drop the notification + warn-log" — never throw.

export interface RecipientCandidates {
  assigneeEmail?: string | null;
  dpoEmail?: string | null;
}

export function resolveRecipient(c: RecipientCandidates): string | null {
  return c.assigneeEmail || c.dpoEmail || null;
}
