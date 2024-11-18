import { InputType, OmitType } from '@nestjs/graphql';
import { LoginInput } from './login-user.inputs';

@InputType()
export class ForgetPasswordResetInput extends OmitType(LoginInput, [
  'password',
]) {}
