import { ApiFeaturesInput } from 'common/graphql/dto/api-features.input';

type PaginationObject =
  | {
      limit: number;
      previousPage?: number;
      currentPage: number;
      nextPage?: number;
      totalPages: number;
      totalResults: number;
    }
  | {
      cursor: string;
      hasNextPage: boolean;
    };

export class ApiFeatures {
  private orderBy: { field: string; orderDirection: string };
  private filtration: { field: string; operator: string; value: string }[];
  private pagination: { limit: number; page: number; cursor: string };
  private keyword: string;

  constructor(apiFeaturesInput: ApiFeaturesInput) {
    this.orderBy = apiFeaturesInput?.orderBy;
    this.filtration = apiFeaturesInput?.filtration;
    this.pagination = apiFeaturesInput?.pagination;
    this.keyword = apiFeaturesInput?.keyword;
  }

  getOrderBy() {
    if (this.orderBy) {
      return {
        [this.orderBy.field]: this.orderBy.orderDirection,
      };
    }
    return undefined;
  }

  getFiltration() {
    if (this.filtration) {
      return this.filtration.map((filter) => ({
        [filter.field]: {
          [filter.operator]: filter.value,
        },
      }));
    }
    return undefined;
  }

  getSearch<T>(searchFields: Array<keyof T>) {
    if (this.keyword) {
      return searchFields.map((field) => ({
        [field]: {
          contains: this.keyword,
          mode: 'insensitive',
        },
      }));
    }
    return undefined;
  }

  async offsetBasedPagination<IncludeType>(
    prismaModel: any,
    whereClause: any,
    limit: number,
    orderBy: any,
    includeOptions?: IncludeType,
  ) {
    const totalResults = await prismaModel.count({ where: whereClause });

    const currentPage = Number(this.pagination?.page) || 1;
    const skip = (currentPage - 1) * limit;
    const totalPages = Math.ceil(totalResults / limit) || 1;

    const paginationObject: PaginationObject = {
      limit,
      totalResults,
      totalPages,
      currentPage,
    };

    if (currentPage > 1) {
      paginationObject.previousPage = currentPage - 1;
    }
    paginationObject.currentPage = currentPage;
    if (currentPage < totalPages) {
      paginationObject.nextPage = currentPage + 1;
    }

    const records = await prismaModel.findMany({
      where: whereClause,
      orderBy,
      take: limit,
      skip,
      includeOptions,
    });

    return { data: records, paginationData: paginationObject };
  }

  async cursorBasedPagination<IncludeType>(
    prismaModel: any,
    whereClause: any,
    limit: number,
    orderBy: any,
    includeOptions?: IncludeType,
  ) {
    let cursor = undefined;
    if (this.pagination?.cursor) {
      cursor = {
        id: this.pagination.cursor,
      };
    }

    const records = await prismaModel.findMany({
      where: whereClause,
      orderBy,
      take: limit + 1,
      cursor,
      includeOptions,
    });

    const lastResultOnRecords = records?.length && records[records.length - 1];
    const hasNextPage = records?.length > limit;
    const idCursor = hasNextPage ? lastResultOnRecords?.id : undefined;

    const paginationObject: PaginationObject = {
      limit,
      cursor: idCursor,
      hasNextPage,
    };

    const data = hasNextPage ? records.slice(0, -1) : records;

    return { data, paginationData: paginationObject };
  }
}
