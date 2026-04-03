import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * Catches all exceptions and returns the universal JSON schema:
 * { statusCode, intOpCode: "SxUS{code}", data: null, error, message }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse();

    let statusCode: number;
    let error: string;
    let message: string | string[];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        error   = exception.name;
        message = body;
      } else {
        const obj = body as Record<string, any>;
        error   = obj.error ?? exception.name;
        message = obj.message ?? exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error      = 'Internal Server Error';
      message    = 'An unexpected error occurred.';
      this.logger.error(exception);
    }

    response.status(statusCode).json({
      statusCode,
      intOpCode: `SxUS${statusCode}`,
      data:    null,
      error,
      message,
    });
  }
}
