import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AvatarInput {
  @Field(() => String)
  url: string;
}
