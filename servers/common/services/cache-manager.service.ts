import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache, Milliseconds } from 'cache-manager';

@Injectable()
export class CacheManagerService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async cacheResult(
    key: string,
    callback: () => Promise<unknown>,
    ttl?: Milliseconds,
  ) {
    const cachedResult = await this.cacheManager.get(key);
    if (cachedResult) return cachedResult;

    const result = await callback();
    if (result) await this.cacheManager.set(key, result, ttl);
    return result;
  }

  async get(key: string) {
    return await this.cacheManager.get(key);
  }

  async getCacheItemFromCachedList(key: string, itemId: string) {
    const cachedList: unknown[] = await this.cacheManager.get(key);
    if (!cachedList) return;

    const cacheItem = cachedList.find(
      (item: { id: string }) => item.id === itemId,
    );
    if (!cacheItem) return;

    return cacheItem;
  }

  async set(key: string, item: unknown, ttl?: Milliseconds) {
    await this.cacheManager.set(key, item, ttl);
  }

  async setCacheItemOnCachedList(key: string, newItem: unknown) {
    const cachedResult: [] = await this.cacheManager.get(key);
    if (!cachedResult) return;

    const updatedResult = [...cachedResult, newItem];
    await this.cacheManager.set(key, updatedResult);
  }

  async update(key: string, item: unknown, ttl?: Milliseconds) {
    await this.cacheManager.set(key, item, ttl);
  }

  async updateCacheItemOnCachedList(
    key: string,
    itemId: string,
    item: unknown,
  ) {
    const cachedList: unknown[] = await this.cacheManager.get(key);
    if (!cachedList) return;
    const itemIndex = cachedList.findIndex(
      (item: { id: string }) => item.id === itemId,
    );
    if (itemIndex === -1) return;
    cachedList[itemIndex] = item;
  }

  async delete(key: string) {
    await this.cacheManager.del(key);
  }

  async deleteCacheItemOnCachedList(key: string, itemId: string) {
    const cachedList: any[] = await this.cacheManager.get(key);
    if (!cachedList) return;
    const updatedResult = cachedList.filter(
      (item: { id: string }) => item.id !== itemId,
    );
    await this.cacheManager.set(key, updatedResult);
  }
}
