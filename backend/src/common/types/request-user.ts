import { Role } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  approved: boolean;
}
