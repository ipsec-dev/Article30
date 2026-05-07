/**
 * Reusable Prisma `select` shapes shared across services.
 *
 * If a relation needs to surface user identity in DTOs, route through these
 * constants instead of inlining `{ id: true, name: true }` so a future field
 * (avatar, role, locale…) can be added in one place.
 */
export const PRISMA_SELECT = {
  /** Minimal user reference for populated relations (creator, validator, assignee, responder, performer). */
  userRef: { id: true, firstName: true, lastName: true } as const,
  /** User first+last name only — for read-only renders like PDFs where the FK is not needed. */
  userName: { firstName: true, lastName: true } as const,
  /** Minimal treatment reference for join-table populates that need both id and name. */
  treatmentRef: { id: true, name: true } as const,
  /** Treatment name only — for read-only join-table populates. */
  treatmentName: { name: true } as const,
} as const;
