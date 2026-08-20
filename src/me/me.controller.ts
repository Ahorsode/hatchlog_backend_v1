import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { BootstrapProfileDto } from './dto/bootstrap-profile.dto';
import { PasswordBridgeDto } from './dto/password-bridge.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('api/v1')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('me')
  @ApiOkResponse({
    description: 'Current authenticated user + farmIds + permissions',
  })
  getMe(@CurrentUser() user: AuthUser) {
    return this.meService.getMe(user);
  }

  @Get('farms')
  @ApiOkResponse({ description: 'Farms accessible to the JWT user' })
  listFarms(@CurrentUser() user: AuthUser) {
    return this.meService.listFarms(user);
  }

  @Public()
  @Post('auth/password-bridge')
  @ApiOkResponse({
    description:
      'Verify Prisma password, sync Supabase Auth, return email for client sign-in',
  })
  passwordBridge(@Body() body: PasswordBridgeDto) {
    return this.meService.passwordBridge(body.identifier, body.password);
  }

  @Public()
  @Get('profiles/by-identity')
  @ApiOkResponse({ description: 'Lookup user profile by email or phone' })
  getProfileByIdentity(
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ) {
    return this.meService.getProfileByIdentity(email, phone);
  }

  @Public()
  @Post('profiles')
  @ApiOkResponse({
    description: 'Bootstrap a user + default farm after Supabase signup',
  })
  bootstrapProfile(@Body() dto: BootstrapProfileDto) {
    return this.meService.bootstrapProfile(dto);
  }
}
