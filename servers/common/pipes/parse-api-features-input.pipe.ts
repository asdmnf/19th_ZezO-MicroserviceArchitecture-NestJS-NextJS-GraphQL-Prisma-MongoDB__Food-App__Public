import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ApiFeaturesInput } from 'common/graphql/dto/api-features.input';
import * as z from 'zod';

@Injectable()
export class ParseApiFeaturesInputPipe implements PipeTransform {
  private enum: z.EnumLike;
  constructor(enumObject: z.EnumLike) {
    let newEnumObject = enumObject;
    if (typeof enumObject === 'object' && 'password' in enumObject) {
      newEnumObject = { ...enumObject };
      delete newEnumObject.password;
    }
    this.enum = newEnumObject;
  }

  transform(apiFeaturesInput: ApiFeaturesInput) {
    const objectIdRegex = /^[a-f\d]{24}$/;
    const apiFeaturesSchema = z
      .object({
        orderBy: z
          .object({
            field: z.nativeEnum(this.enum),
            orderDirection: z.string(),
          })
          .optional(),
        pagination: z
          .object({
            limit: z
              .number()
              .max(Number(process.env.DEFAULT_PAGINATION_LIMIT), {
                message: `Limit cannot exceed ${process.env.DEFAULT_PAGINATION_LIMIT}`,
              })
              .optional(),
            page: z.number().optional(),
            cursor: z
              .string()
              .regex(objectIdRegex, {
                message:
                  'Invalid cursor value, cursor should be valid mongo id.',
              })
              .optional(),
          })
          .refine(
            (pagination) => {
              if (
                pagination.page !== undefined &&
                pagination.cursor !== undefined
              ) {
                return false;
              }
              return true;
            },
            {
              message: 'Either page or cursor can be provided, but not both',
            },
          )
          .optional(),
        filtration: z
          .array(
            z
              .object({
                field: z.nativeEnum(this.enum),
                operator: z.string(),
                value: z.string(),
              })
              .refine(
                (filtration) => {
                  if (filtration.field === 'id') {
                    return objectIdRegex.test(filtration.value);
                  }
                  return true;
                },
                {
                  message:
                    'Invalid ID format, selected filtration field (id) must be valid mongo id',
                },
              ),
          )
          .optional(),
        keyword: z.string().optional(),
      })
      .optional();
    const result = apiFeaturesSchema.safeParse(apiFeaturesInput);
    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return result.data;
  }
}
