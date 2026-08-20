import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthContextCache } from './auth-context.cache';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Global()
@Module({
  providers: [
    AuthContextCache,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
  exports: [AuthContextCache],
})
export class AuthModule {}
