import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with username + password.' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user profile.' })
  me(@CurrentUser() current: AuthenticatedUser): AuthUserDto {
    return current;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated user profile (name, email).' })
  updateMe(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthUserDto> {
    return this.authService.updateProfile(current.id, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password. Requires currentPassword.' })
  async changePassword(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(current.id, dto.currentPassword, dto.newPassword);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update preferences (emailNotifications, darkMode).' })
  updatePreferences(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<AuthUserDto> {
    return this.authService.updatePreferences(current.id, dto);
  }
}
