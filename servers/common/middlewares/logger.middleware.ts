import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const urlColor = '\x1b[34m'; // Blue
      const timeColor = '\x1b[33m'; // Yellow
      const resetColor = '\x1b[0m'; // Reset color

      // Determine method color based on the method
      let methodColor: string;
      if (method === 'GET') {
        methodColor = '\x1b[32m'; // Green
      } else if (method === 'POST') {
        methodColor = '\x1b[33m'; // Yellow
      } else if (method === 'PUT') {
        methodColor = '\x1b[36m'; // Cyan
      } else if (method === 'DELETE') {
        methodColor = '\x1b[31m'; // Red
      } else if (method === 'PATCH') {
        methodColor = '\x1b[34m'; // Blue
      } else {
        methodColor = '\x1b[37m'; // White
      }

      // Determine status color based on the statusCode
      let statusColor: string;
      if (statusCode >= 400 || statusCode >= 500) {
        statusColor = '\x1b[31m'; // Red for 5xx server errors and 4xx client errors
      } else if (statusCode >= 300) {
        statusColor = '\x1b[36m'; // Cyan for 3xx redirects
      } else {
        statusColor = '\x1b[32m'; // Green for 2xx success
      }

      this.logger.log(
        `${methodColor}${method}${resetColor} ${urlColor}${originalUrl}${resetColor} ${statusColor}${statusCode}${resetColor} ${timeColor}+${responseTime}ms${resetColor}`,
      );
    });

    next();
  }
}
