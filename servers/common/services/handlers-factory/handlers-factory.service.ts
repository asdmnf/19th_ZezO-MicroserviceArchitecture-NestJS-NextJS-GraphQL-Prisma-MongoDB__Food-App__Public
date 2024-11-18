import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheManagerService } from '../cache-manager.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'common/types/environment-variables.type';
import { ApiFeaturesInput } from 'common/graphql/dto/api-features.input';
import { ApiFeatures } from './utils/apiFeatures.util';
import { CacheManagerForFindAll } from './utils/cacheManagerForFindAll.util';

@Injectable()
export class HandlersFactoryService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly cacheManagerService: CacheManagerService,
  ) {}
  async create<CreateArgsType>(
    prismaModel: any,
    createArgs: CreateArgsType,
    cacheKey?: string,
  ) {
    const record = await prismaModel.create(createArgs);
  
    if (cacheKey) {
      await this.cacheManagerService.set(`${cacheKey}:${record.id}`, record);
    }

    return record;
  }

  async getAll(prismaModel: any, cacheKey: string) {
    const records = await this.cacheManagerService.cacheResult(
      cacheKey,
      prismaModel.findMany,
    );

    return records;
  }

  async getAllWithApiFeatures<ModelType, IncludeType>(
    prismaModel: any,
    apiFeaturesInput: ApiFeaturesInput,
    searchFields: Array<keyof ModelType>,
    cacheKey?: string,
    includeOptions?: IncludeType,
  ) {
    const apiFeatures = new ApiFeatures(apiFeaturesInput);
    const cacheManager = new CacheManagerForFindAll(
      this.cacheManagerService,
      apiFeaturesInput,
    );

    // get from cache
    const cachedResult = await cacheManager.getFromCacheForFindAll(cacheKey);
    if (cachedResult) return cachedResult;

    // sorting
    const orderBy = apiFeatures.getOrderBy();

    // filtering
    const filtration = apiFeatures.getFiltration();

    // searching
    const search = apiFeatures.getSearch<ModelType>(searchFields);

    // pagination
    const limit =
      Math.min(
        Number(apiFeaturesInput?.pagination?.limit),
        this.configService.get('DEFAULT_PAGINATION_LIMIT'),
      ) || Number(this.configService.get('DEFAULT_PAGINATION_LIMIT'));

    const whereClause = {
      AND: filtration,
      OR: search,
    };

    // offset-based pagination
    const isOffsetBased = !!apiFeaturesInput?.pagination?.page;
    if (isOffsetBased) {
      const data = await apiFeatures.offsetBasedPagination<IncludeType>(
        prismaModel,
        whereClause,
        limit,
        orderBy,
        includeOptions,
      );

      // set to cache
      if (data?.data?.length)
        await cacheManager.setCacheForOffsetPagination(
          cacheKey,
          data,
          this.configService.get('CACHE_TTL_FOR_FIND_ALL_'),
        );

      return data;
    }

    // cursor-based pagination( default pagination )
    else {
      const data = await apiFeatures.cursorBasedPagination<IncludeType>(
        prismaModel,
        whereClause,
        limit,
        orderBy,
        includeOptions,
      );

      // set to cache
      if (data?.data?.length)
        await cacheManager.setCacheForCursorPagination(
          cacheKey,
          data,
          this.configService.get('CACHE_TTL_FOR_FIND_ALL_'),
        );

      return data;
    }
  }

  async getOneById<IncludeType>(
    prismaModel: any,
    id: string,
    cacheKey?: string,
    includeOptions?: IncludeType,
  ) {
    // get from cache
    if (cacheKey) {
      const cachedResult = await this.cacheManagerService.get(
        `${cacheKey}:${id}`,
      );
      if (cachedResult) return cachedResult;
    }

    const record = await prismaModel.findUnique({
      where: { id },
      includeOptions,
    });
    if (!record) {
      throw new NotFoundException('Record Not Found');
    }

    // set on cache
    if (cacheKey) {
      await this.cacheManagerService.set(`${cacheKey}:${id}`, record);
    }

    return record;
  }

  async getOneByField<WhereType, IncludeType>(
    prismaModel: any,
    whereClause: WhereType,
    skipNotFoundException?: boolean,
    uniqueCacheKey?: string,
    includeOptions?: IncludeType,
  ) {
    // get from cache
    if (uniqueCacheKey) {
      const cachedResult = await this.cacheManagerService.get(uniqueCacheKey);
      if (cachedResult) return cachedResult;
    }

    const record = await prismaModel.findFirst({
      where: whereClause,
      includeOptions,
    });
    if (!skipNotFoundException && !record) {
      throw new NotFoundException('Record Not Found');
    }

    // set on cache
    if (uniqueCacheKey && record) {
      await this.cacheManagerService.set(uniqueCacheKey, record);
    }

    return record;
  }

  async update<UpdateInputType, IncludeType>(
    prismaModel: any,
    id: string,
    data: UpdateInputType,
    cacheKey?: string,
    includeOptions?: IncludeType,
  ) {
    await this.getOneById(prismaModel, id, cacheKey);

    const updatedRecord = await prismaModel.update({
      where: { id },
      data,
      includeOptions,
    });

    // update cache
    if (cacheKey) {
      await this.cacheManagerService.update(`${cacheKey}:${id}`, updatedRecord);
    }

    return updatedRecord;
  }

  async remove(
    prismaModel: any,
    id: string,
    cacheKey?: string,
  ) {
    await this.getOneById(prismaModel, id, cacheKey);

    const deletedRecord = await prismaModel.delete({ where: { id } });

    // remove from cache
    if (cacheKey) {
      await this.cacheManagerService.delete(`${cacheKey}:${id}`);
    }

    return deletedRecord;
  }
}
