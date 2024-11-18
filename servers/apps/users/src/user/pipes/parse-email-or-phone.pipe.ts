import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as z from 'zod';

@Injectable()
export class ParseEmailOrPhonePipe implements PipeTransform {
  transform(input: { email?: string; phoneNumber?: string }) {
    const emailOrPhoneNumberSchema = z
      .object({
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
      })
      .refine(
        (input) => {
          if (input.email !== undefined && input.phoneNumber !== undefined) {
            return false;
          }
          return true;
        },
        {
          message: 'Either email or phoneNumber can be provided, but not both',
        },
      );

    const result = emailOrPhoneNumberSchema.safeParse(input);

    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return input;
  }
}
