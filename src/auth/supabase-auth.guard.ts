import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jose from 'jose';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './auth.types';
import type { Env } from '../config/env.schema';

/**
 * Accepts either:
 * 1) Authorization: Bearer <supabase_jwt>  (Flutter / web clients)
 * 2) X-HatchLog-Api-Key + X-HatchLog-User-Id  (Next.js BFF)
 *
 * Supabase user access tokens are ES256 (JWKS). Legacy HS256 JWT secret
 * is kept as a fallback for older tokens / local tooling.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof jose.createRemoteJWKSet>;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {
    const supabaseUrl = this.config
      .get('SUPABASE_URL', { infer: true })
      .replace(/\/$/, '');
    this.jwks = jose.createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const apiKeyUser = await this.tryApiKeyAuth(request);
    if (apiKeyUser) {
      request.user = apiKeyUser;
      return true;
    }

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(
        'Missing Bearer token or valid X-HatchLog-Api-Key',
      );
    }

    const payload = await this.verifySupabaseToken(token);

    const email = payload.email?.trim().toLowerCase() || null;
    const phone = payload.phone?.trim() || null;
    const identityFilters = [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phoneNumber: phone }] : []),
    ];

    if (identityFilters.length === 0) {
      throw new UnauthorizedException(
        'Token is missing email and phone claims',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: identityFilters },
      include: {
        memberships: { select: { farmId: true } },
        farms: { select: { id: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'No HatchLog user profile found for this token',
      );
    }

    request.user = this.toAuthUser(user, payload.sub);
    return true;
  }

  private async verifySupabaseToken(token: string): Promise<JwtPayload> {
    // Prefer asymmetric JWKS (current Supabase user access tokens are ES256).
    try {
      const verified = await jose.jwtVerify(token, this.jwks, {
        audience: 'authenticated',
      });
      return verified.payload as JwtPayload;
    } catch {
      // Fall through to legacy HS256 JWT secret.
    }

    try {
      const secret = new TextEncoder().encode(
        this.config.get('SUPABASE_JWT_SECRET', { infer: true }),
      );
      const verified = await jose.jwtVerify(token, secret, {
        audience: 'authenticated',
      });
      return verified.payload as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async tryApiKeyAuth(
    request: Request,
  ): Promise<AuthUser | null> {
    const configuredKey = this.config.get('HATCHLOG_INTERNAL_API_KEY', {
      infer: true,
    });
    if (!configuredKey) {
      return null;
    }

    const providedKey = request.headers['x-hatchlog-api-key'];
    const key = Array.isArray(providedKey) ? providedKey[0] : providedKey;
    if (!key || key !== configuredKey) {
      return null;
    }

    const userIdHeader = request.headers['x-hatchlog-user-id'];
    const userId = (
      Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader
    )?.trim();
    if (!userId) {
      throw new UnauthorizedException(
        'X-HatchLog-User-Id is required with API key auth',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { select: { farmId: true } },
        farms: { select: { id: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found for API key auth');
    }

    return this.toAuthUser(user, `api-key:${user.id}`);
  }

  private toAuthUser(
    user: {
      id: string;
      email: string | null;
      phoneNumber: string | null;
      role: string;
      farms: { id: string }[];
      memberships: { farmId: string }[];
    },
    supabaseSub: string,
  ): AuthUser {
    const farmIds = Array.from(
      new Set([
        ...user.farms.map((farm) => farm.id),
        ...user.memberships.map((membership) => membership.farmId),
      ]),
    );

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      farmIds,
      supabaseSub,
    };
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }
}
