import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class ForgetPasswordWithResetLinkInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  verifyToken: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  password: string;
}
