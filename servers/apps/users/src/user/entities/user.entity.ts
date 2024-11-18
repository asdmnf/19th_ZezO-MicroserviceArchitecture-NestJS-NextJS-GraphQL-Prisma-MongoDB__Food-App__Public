import { ObjectType, Field } from '@nestjs/graphql';
import { Avatar } from './avatar.entity';
import { PaginationObject } from 'common/graphql/entities/pagination.entity';

@ObjectType()
export class User {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field(() => Avatar, { nullable: true })
  avatar?: Avatar;

  @Field(() => String, { nullable: true })
  phoneNumber?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class UsersWithPagination {
  @Field(() => PaginationObject, { nullable: true })
  paginationData: PaginationObject;

  @Field(() => [User])
  data: [User];
}
