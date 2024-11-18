import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { EnvironmentVariables } from 'common/types/environment-variables.type';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        transport: {
          host: configService.get('SMTP_HOST'),
          secure: true,
          auth: {
            user: configService.get('SMTP_MAIL'),
            pass: configService.get('SMTP_PASSWORD'),
          },
        },
        defaults: {
          from: 'ZezO',
        },
        template: {
          dir: join(__dirname, '../../../email-templates'),
          adapter: new EjsAdapter(),
          options: {
            strict: false,
          },
        },
      }),
    }),
  ],
})
export class EmailModule {}
