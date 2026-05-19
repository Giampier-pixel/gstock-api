import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  emailNotifications: boolean;
  darkMode: boolean;
}
