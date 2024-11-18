import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class ForgetPasswordInput {
  @Field(() => Int)
  @IsNotEmpty()
  resetCode: number;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  password: string;
}
