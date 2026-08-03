import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

/**
 * Wraps successful controller responses in { success, data }.
 * Skip when the handler already returned an envelope (has success boolean).
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in (data as Record<string, unknown>) &&
          typeof (data as ApiEnvelope).success === 'boolean'
        ) {
          return data;
        }
        return { success: true, data } satisfies ApiEnvelope;
      }),
    );
  }
}
