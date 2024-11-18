import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Avatar {
  @Field()
  id: string;

  @Field()
  publicId: string;

  @Field()
  url: string;

  @Field()
  userId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
