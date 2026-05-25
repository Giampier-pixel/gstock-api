import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const authUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  role: true,
  emailNotifications: true,
  darkMode: true,
} satisfies Prisma.UserSelect;

const loginUserSelect = {
  ...authUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

const tokenUserSelect = {
  ...authUserSelect,
  updatedAt: true,
  passwordChangedAt: true,
} satisfies Prisma.UserSelect;

export type LoginUserRecord = Prisma.UserGetPayload<{ select: typeof loginUserSelect }>;
export type TokenUserRecord = Prisma.UserGetPayload<{ select: typeof tokenUserSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findForLogin(identifier: string): Promise<LoginUserRecord | null> {
    return this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
      select: loginUserSelect,
    });
  }

  findForLoginById(id: string): Promise<LoginUserRecord | null> {
    return this.prisma.user.findUnique({ where: { id }, select: loginUserSelect });
  }

  findForToken(id: string): Promise<TokenUserRecord | null> {
    return this.prisma.user.findUnique({ where: { id }, select: tokenUserSelect });
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<TokenUserRecord> {
    try {
      return await this.prisma.user.update({ where: { id }, data, select: tokenUserSelect });
    } catch (error) {
      this.handleEmailConflict(error);
      throw error;
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, passwordChangedAt: new Date() },
      select: { id: true },
    });
  }

  updatePreferences(
    id: string,
    data: { emailNotifications?: boolean; darkMode?: boolean },
  ): Promise<TokenUserRecord> {
    return this.prisma.user.update({ where: { id }, data, select: tokenUserSelect });
  }

  private handleEmailConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Email already in use.');
    }
  }
}
