import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string> {
  transform(input: string | { id: string }) {
    const objectIdRegex = /^[a-f\d]{24}$/;
    const errorMessage = 'Invalid Mongo ID';
    if (typeof input === 'string') {
      if (!objectIdRegex.test(input)) {
        throw new BadRequestException(errorMessage);
      }
    }

    if (typeof input === 'object') {
      if (!objectIdRegex.test(input.id)) {
        throw new BadRequestException(errorMessage);
      }
    }
    return input;
  }
}
