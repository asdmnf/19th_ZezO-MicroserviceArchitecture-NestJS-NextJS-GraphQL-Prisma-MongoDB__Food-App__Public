import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

@InputType()
export class LoginInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsPhoneNumber('EG', {
    message: 'phone number must be valid egyptian number',
  })
  phoneNumber: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  password: string;
}
