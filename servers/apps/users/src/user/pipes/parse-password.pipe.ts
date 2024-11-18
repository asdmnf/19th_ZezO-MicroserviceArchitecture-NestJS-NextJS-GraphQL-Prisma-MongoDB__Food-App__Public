import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as z from 'zod';

@Injectable()
export class ParsePasswordPipe implements PipeTransform {
  transform(input: { password: string }) {
    const passwordSchema = z.object({
      password: z
        .string()
        .min(8, { message: 'Password must be at least 8 characters long' })
        .regex(/[A-Z]/, {
          message: 'Password must contain at least one capital letter',
        })
        .regex(/[a-z]/, {
          message: 'Password must contain at least one small letter',
        })
        .regex(/\d/, { message: 'Password must contain at least one number' })
        .regex(/[!@#$%^&*]/, {
          message: 'Password must contain at least one special character',
        }),
    });

    const result = passwordSchema.safeParse(input);

    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return input;
  }
}
