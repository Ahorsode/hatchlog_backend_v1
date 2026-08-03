import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env.schema';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.apiKey = this.config.get('HATCHLOG_ADMIN_API_KEY', { infer: true }) || '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) {
      throw new ForbiddenException('Admin API is disabled');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerKey = request.headers['x-hatchlog-admin-key'];

    if (!headerKey || headerKey !== this.apiKey) {
      throw new ForbiddenException('Invalid admin API key');
    }

    return true;
  }
}
