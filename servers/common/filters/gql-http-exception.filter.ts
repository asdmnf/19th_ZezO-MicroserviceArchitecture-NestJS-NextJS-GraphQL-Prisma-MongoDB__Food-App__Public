import { Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GqlHttpExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GqlHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const response = gqlHost.getContext().res;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();

      const error = {
        message: exception.message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        error: errorResponse['error'] || exception.name,
        ...(typeof errorResponse === 'object' ? errorResponse : {}),
      };

      response.status(status).json(error);
    } else {
      const graphQLError = new GraphQLError(
        (exception as any).message || 'Internal server error',
        {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        },
      );

      return graphQLError;
    }
  }
}
