import type { PrismaService } from '../../prisma/prisma.service';

// Shared context loader used by every notify() call site. Returns the
// single-tenant org row (we do not yet have multi-tenancy) plus the
// assignee user if `assignedTo` is set.
//
// When multi-tenancy lands, change the org lookup to findUnique({where:{id}})
// — every notify call site gets fixed in one place.
export interface NotificationContext {
  org: {
    dpoEmail: string | null;
    dpoName: string | null;
    companyName: string | null;
    locale: string;
  } | null;
  assignee: {
    email: string;
    firstName: string;
  } | null;
}

export async function loadNotificationContext(
  prisma: PrismaService,
  assignedTo: string | null | undefined,
): Promise<NotificationContext> {
  const [org, assignee] = await Promise.all([
    prisma.organization.findFirst({
      select: { dpoEmail: true, dpoName: true, companyName: true, locale: true },
    }),
    assignedTo
      ? prisma.user.findUnique({
          where: { id: assignedTo },
          select: { email: true, firstName: true },
        })
      : Promise.resolve(null),
  ]);
  return { org, assignee };
}
