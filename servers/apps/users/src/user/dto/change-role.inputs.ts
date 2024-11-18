import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

registerEnumType(Role, {
  name: 'Role',
});

@InputType()
export class ChangeRoleInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @IsMongoId()
  id: string;

  @Field(() => Role, { nullable: false })
  @IsNotEmpty()
  role: Role;
}
