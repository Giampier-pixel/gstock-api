import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: DeepMockProxy<UsersService>;
  let jwtService: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    usersService = mockDeep<UsersService>();
    jwtService = mockDeep<JwtService>();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'u-1',
    username: 'admin',
    email: 'admin@gstock.local',
    name: 'Admin',
    passwordHash: bcrypt.hashSync('password123', 4),
    role: Role.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('returns accessToken + user on valid credentials', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');

    const result = await service.login('admin', 'password123');

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toMatchObject({ id: 'u-1', username: 'admin', role: Role.ADMIN });
  });

  it('throws Unauthorized when user not found', async () => {
    usersService.findByUsername.mockResolvedValue(null);
    await expect(service.login('nope', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws Unauthorized on password mismatch', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());
    await expect(service.login('admin', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
