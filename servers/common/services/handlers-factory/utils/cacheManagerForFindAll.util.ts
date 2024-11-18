import { Milliseconds } from 'cache-manager';
import { ApiFeaturesInput } from 'common/graphql/dto/api-features.input';
import { CacheManagerService } from 'common/services/cache-manager.service';

export class CacheManagerForFindAll {
  private cacheManagerService: CacheManagerService;

  private apiFeaturesInput: ApiFeaturesInput;
  private page: number;
  private limit: number;
  private cursor: string;
  private filtration: any;
  private orderBy: any;
  private keyword: string;

  constructor(
    cacheManagerService: CacheManagerService,
    apiFeaturesInput: ApiFeaturesInput,
  ) {
    this.cacheManagerService = cacheManagerService;
    this.apiFeaturesInput = apiFeaturesInput;
    this.page = apiFeaturesInput?.pagination?.page;
    this.limit = apiFeaturesInput?.pagination?.limit;
    this.cursor = apiFeaturesInput?.pagination?.cursor;
    this.filtration = apiFeaturesInput?.filtration;
    this.orderBy = apiFeaturesInput?.orderBy;
    this.keyword = apiFeaturesInput?.keyword;
  }

  async getFromCacheForFindAll(cacheKey: string) {
    // offset pagination with page only
    if (
      this.page &&
      !this.limit &&
      !this.cursor &&
      !this.filtration &&
      !this.keyword &&
      !this.orderBy
    ) {
      const cachedResult = await this.cacheManagerService.get(
        `${cacheKey}s-offset-page:${this.page}`,
      );
      if (cachedResult) return cachedResult;
    }

    // cursor paginatoin for first round
    if (!this.apiFeaturesInput) {
      const cachedResult = await this.cacheManagerService.get(
        `${cacheKey}s-cursor-first`,
      );
      if (cachedResult) return cachedResult;
    }

    // cursor paginatoin with cursor only
    if (
      this.cursor &&
      !this.page &&
      !this.limit &&
      !this.filtration &&
      !this.keyword &&
      !this.orderBy
    ) {
      const cachedResult = await this.cacheManagerService.get(
        `${cacheKey}s-cursor:${this.cursor}`,
      );
      if (cachedResult) return cachedResult;
    }
    return undefined;
  }

  async setCacheForOffsetPagination(
    cacheKey: string,
    cacheItem: unknown,
    ttl: Milliseconds,
  ) {
    // offset pagination with page only
    if (
      this.page &&
      !this.limit &&
      !this.cursor &&
      !this.filtration &&
      !this.keyword &&
      !this.orderBy
    ) {
      await this.cacheManagerService.set(
        `${cacheKey}s-offset-page:${this.page}`,
        cacheItem,
        ttl,
      );
    }
  }

  async setCacheForCursorPagination(
    cacheKey: string,
    cacheItem: unknown,
    ttl: Milliseconds,
  ) {
    // cursor paginatoin for first round
    if (!this.apiFeaturesInput) {
      await this.cacheManagerService.set(
        `${cacheKey}s-cursor-first`,
        cacheItem,
        ttl,
      );
    }

    // cursor paginatoin with cursor only
    if (
      this.cursor &&
      !this.page &&
      !this.limit &&
      !this.filtration &&
      !this.keyword &&
      !this.orderBy
    ) {
      await this.cacheManagerService.set(
        `${cacheKey}s-cursor:${this.cursor}`,
        cacheItem,
        ttl,
      );
    }
  }
}
