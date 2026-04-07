import {
  Catch,
  RpcExceptionFilter,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class AllRpcExceptionsFilter implements RpcExceptionFilter<unknown> {
  private readonly logger = new Logger(AllRpcExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<any> {
    const ctx = host.switchToRpc();
    const data: unknown = ctx.getData(); // the message payload
    const rpcContext: unknown = ctx.getContext();
    const rawPattern =
      typeof rpcContext === 'object' &&
      rpcContext !== null &&
      'pattern' in rpcContext
        ? (rpcContext as { pattern?: unknown }).pattern
        : undefined;
    const pattern =
      typeof rawPattern === 'string'
        ? rawPattern
        : typeof rawPattern === 'number' || typeof rawPattern === 'boolean'
          ? `${rawPattern}`
          : rawPattern === null || rawPattern === undefined
            ? 'unknown'
            : JSON.stringify(rawPattern);

    let message = 'Internal server error';

    if (exception instanceof RpcException) {
      const rpcError: unknown = exception.getError();
      if (typeof rpcError === 'string') {
        message = rpcError;
      } else if (rpcError instanceof Error) {
        message = rpcError.message;
      } else {
        message = JSON.stringify(rpcError);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `[${pattern}] - Payload: ${JSON.stringify(data)} - Error: ${message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    return throwError(() => new RpcException({ message }));
  }
}
