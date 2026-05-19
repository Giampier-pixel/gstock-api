import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import type { LoginUserRecord, TokenUserRecord } from '../users/users.service';
import type { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findForLogin(username);
    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    const payload: JwtPayload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.toAuthUserDto(user),
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<AuthUserDto> {
    if (dto.name === undefined && dto.email === undefined) {
      return this.toAuthUserDto(await this.findCurrentUser(id));
    }

    const user = await this.usersService.updateProfile(id, dto);
    return this.toAuthUserDto(user);
  }

  async changePassword(
    id: string,
    currentPassword: ChangePasswordDto['currentPassword'],
    newPassword: ChangePasswordDto['newPassword'],
  ): Promise<void> {
    const user = await this.usersService.findForLoginById(id);
    if (!user) throw new UnauthorizedException('Token user no longer exists.');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect.');

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(id, newHash);
  }

  async updatePreferences(id: string, dto: UpdatePreferencesDto): Promise<AuthUserDto> {
    if (dto.emailNotifications === undefined && dto.darkMode === undefined) {
      return this.toAuthUserDto(await this.findCurrentUser(id));
    }

    const user = await this.usersService.updatePreferences(id, dto);
    return this.toAuthUserDto(user);
  }

  private async findCurrentUser(id: string): Promise<TokenUserRecord> {
    const user = await this.usersService.findForToken(id);
    if (!user) throw new UnauthorizedException('Token user no longer exists.');
    return user;
  }

  private toAuthUserDto(user: LoginUserRecord | TokenUserRecord): AuthUserDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      emailNotifications: user.emailNotifications,
      darkMode: user.darkMode,
    };
  }
}
