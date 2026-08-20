import { Injectable } from '@nestjs/common';
import type { AuthUser } from './auth.types';

const AUTH_TTL_MS = 10_000;

type CacheEntry<T> = { value: T; expiresAt: number };

@Injectable()
export class AuthContextCache {
  private readonly authUsers = new Map<string, CacheEntry<AuthUser>>();
  private readonly meProfiles = new Map<string, CacheEntry<unknown>>();
  private readonly farmContexts = new Map<string, CacheEntry<unknown>>();

  getAuthUser(key: string): AuthUser | undefined {
    return this.read(this.authUsers, key);
  }

  setAuthUser(key: string, user: AuthUser) {
    this.write(this.authUsers, key, user);
  }

  getMeProfile<T>(userId: string): T | undefined {
    return this.read(this.meProfiles, userId) as T | undefined;
  }

  setMeProfile(userId: string, profile: unknown) {
    this.write(this.meProfiles, userId, profile);
  }

  getFarmContext<T>(userId: string, farmId: string): T | undefined {
    return this.read(this.farmContexts, `${userId}:${farmId}`) as T | undefined;
  }

  setFarmContext(userId: string, farmId: string, value: unknown) {
    this.write(this.farmContexts, `${userId}:${farmId}`, value);
  }

  invalidateUser(userId: string) {
    this.meProfiles.delete(userId);
    for (const [key, entry] of this.authUsers) {
      if (entry.value.id === userId) this.authUsers.delete(key);
    }
    for (const key of [...this.farmContexts.keys()]) {
      if (key.startsWith(`${userId}:`)) this.farmContexts.delete(key);
    }
  }

  private read<T>(
    store: Map<string, CacheEntry<T>>,
    key: string,
  ): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private write<T>(store: Map<string, CacheEntry<T>>, key: string, value: T) {
    store.set(key, { value, expiresAt: Date.now() + AUTH_TTL_MS });
  }
}
