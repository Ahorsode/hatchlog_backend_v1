import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message).join(', ')
            : String(
                (body as { message?: string }).message ??
                  exception.message ??
                  'Request failed',
              );
      const code =
        typeof body === 'object' &&
        body &&
        'error' in body &&
        typeof (body as { error?: string }).error === 'string'
          ? (body as { error: string }).error
          : HttpStatus[status] || 'ERROR';

      response.status(status).json({
        success: false,
        error: { code, message },
        statusCode: status,
      });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
