import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

enum OrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

registerEnumType(OrderDirection, {
  name: 'OrderDirection',
});

enum FiltrationOperators {
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  equals = 'equals',
  in = 'in',
  notIn = 'notIn',
  not = 'not',
  startsWith = 'startsWith',
  endsWith = 'endsWith',
  contains = 'contains',
}

registerEnumType(FiltrationOperators, {
  name: 'FiltrationOperators',
});

@InputType()
class OrderBy {
  @Field(() => String)
  field: string;

  @Field(() => OrderDirection)
  orderDirection: OrderDirection;
}

@InputType()
class Filtration {
  @Field(() => String)
  field: string;

  @Field(() => FiltrationOperators)
  operator: FiltrationOperators;

  @Field(() => String)
  value: string;
}

@InputType()
class Pagination {
  @Field(() => Int, {
    nullable: true,
    description: 'offset-based pagination',
  })
  @IsOptional()
  page: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  limit: number;

  @Field(() => String, {
    nullable: true,
    description: 'cursor-based pagination',
  })
  @IsOptional()
  cursor: string;
}

@InputType()
export class ApiFeaturesInput {
  @Field(() => OrderBy, { nullable: true })
  @IsOptional()
  orderBy: OrderBy;

  @Field(() => String, { description: 'regex based search', nullable: true })
  @IsOptional()
  keyword?: string;

  @Field(() => [Filtration], { nullable: true })
  @IsOptional()
  filtration?: [Filtration];

  @Field(() => Pagination, { nullable: true })
  @IsOptional()
  pagination?: Pagination;
}
