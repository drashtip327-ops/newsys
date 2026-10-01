import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const detail = typeof body === 'object' && body && 'message' in body ? body.message : body;
    const message = Array.isArray(detail) ? detail.join(' ') : typeof detail === 'string' ? detail : 'An unexpected error occurred.';
    if (status === 500) Logger.error(exception, undefined, 'API');
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message });
  }
}
