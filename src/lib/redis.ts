import Redis from "ioredis";

class RedisCacheClient {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryFallback = new Map<string, { value: string; expiresAt: number }>();

  constructor() {
    if (typeof window === "undefined") {
      try {
        const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          retryStrategy: () => null, // Do not retry indefinitely
        });

        this.client.on("connect", () => {
          this.isConnected = true;
          console.log("Redis Cache: Connected successfully! 🚀");
        });

        this.client.on("error", (err) => {
          this.isConnected = false;
          // Silent warning, failover to memory cache
          console.warn("Redis Cache connection failed, using in-memory fallback.");
        });
      } catch (e) {
        console.warn("Could not construct Redis client, using in-memory fallback.");
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        console.warn("Redis GET error:", err);
      }
    }
    // Memory fallback
    const cached = this.memoryFallback.get(key);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        this.memoryFallback.delete(key);
        return null;
      }
      return cached.value;
    }
    return null;
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, value, "EX", ttlSeconds);
        return;
      } catch (err) {
        console.warn("Redis SET error:", err);
      }
    }
    // Memory fallback
    this.memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err) {
        console.warn("Redis DEL error:", err);
      }
    }
    this.memoryFallback.delete(key);
  }

  async clearFeedCache(): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys("feed:*");
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        return;
      } catch (err) {
        console.warn("Redis Clear feed cache error:", err);
      }
    }
    // Memory fallback clear
    for (const key of this.memoryFallback.keys()) {
      if (key.startsWith("feed:")) {
        this.memoryFallback.delete(key);
      }
    }
  }
}

export const redisCache = new RedisCacheClient();
