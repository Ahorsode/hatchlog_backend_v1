import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { FarmPermissionGuard } from './guards/farm-permission.guard';
import { ResponseEnvelopeInterceptor } from './interceptors/response-envelope.interceptor';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  providers: [
    PermissionsService,
    {
      provide: APP_GUARD,
      useClass: FarmPermissionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
  exports: [PermissionsService],
})
export class CommonModule {}
