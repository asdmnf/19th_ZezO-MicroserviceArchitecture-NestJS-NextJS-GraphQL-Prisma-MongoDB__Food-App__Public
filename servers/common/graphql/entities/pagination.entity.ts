import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaginationObject {
  @Field()
  limit: number;

  // offset-based pagination fields
  @Field({ nullable: true, description: 'offset-based pagination field' })
  previousPage: number;

  @Field({ nullable: true, description: 'offset-based pagination field' })
  currentPage: number;

  @Field({ nullable: true, description: 'offset-based pagination field' })
  nextPage: number;

  @Field({ nullable: true, description: 'offset-based pagination field' })
  totalPages: number;

  @Field({ nullable: true, description: 'offset-based pagination field' })
  totalResults: number;

  // cursor-based pagination fields
  @Field({ nullable: true, description: 'cursor-based pagination field' })
  cursor: string;

  @Field({ nullable: true, description: 'cursor-based pagination field' })
  hasNextPage: boolean;
}
