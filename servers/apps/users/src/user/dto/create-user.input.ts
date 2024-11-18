import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';


registerEnumType(Role, {
  name: 'Role',
});


@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  password: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('EG', {
    message: 'phone number must be valid egyptian number',
  })
  phoneNumber: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  address: string;

  @Field(() => Role, { nullable: true })
  @IsOptional()
  role: Role;
}
