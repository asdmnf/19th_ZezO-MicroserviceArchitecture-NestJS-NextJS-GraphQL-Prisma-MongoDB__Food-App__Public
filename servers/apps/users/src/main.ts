import { NestFactory } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EnvironmentVariables } from 'common/types/environment-variables.type';
import * as cookieParser from 'cookie-parser';
import { GqlHttpExceptionFilter } from 'common/filters/gql-http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);

  const configService: ConfigService<EnvironmentVariables> =
    app.get(ConfigService);
  const port = configService.get('USERS_SERVER_PORT', 3001);

  app.use(cookieParser());
  app.enableCors({ credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GqlHttpExceptionFilter());

  await app.listen(port);

  Logger.log(
    `Users server is running on \x1b[1m\x1b[4m\x1b[34m${await app.getUrl()}/graphql\x1b[0m`,
  );
}
bootstrap();
