import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { getJwtSecret } from '../jwt.config';

export interface JwtPayload {
  sub: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findForToken(payload.sub);
    if (!user) throw new UnauthorizedException('Token user no longer exists.');
    if (user.passwordChangedAt) {
      if (!payload.iat || payload.iat * 1000 + 1000 < user.passwordChangedAt.getTime()) {
        throw new UnauthorizedException('Token has been revoked.');
      }
    }
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
