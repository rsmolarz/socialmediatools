
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 *  * Token Bucket Rate Limiter Implementation
 *  * Provides request rate limiting with configurable limits per endpoint
 *  */

export interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

class RateLimiter {
    private buckets = new Map<string, TokenBucket>();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
          this.config = {
                  keyGenerator: (req) => req.ip || 'unknown',
                  skipSuccessfulRequests: false,
                  skipFailedRequests: false,
                  ...config,
          };

          // Cleanup old buckets every 5 minutes
          setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    private getKey(req: Request): string {
          return this.config.keyGenerator!(req);
    }

    private getOrCreateBucket(key: string): TokenBucket {
          if (!this.buckets.has(key)) {
                  this.buckets.set(key, {
                            tokens: this.config.maxRequests,
                            lastRefill: Date.now(),
                  });
          }
          return this.buckets.get(key)!;
    }

    private refillBucket(bucket: TokenBucket): void {
          const now = Date.now();
          const timePassed = now - bucket.lastRefill;
          const refillRate = this.config.maxRequests / this.config.windowMs;
          const tokensToAdd = (timePassed * refillRate);

          bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
          bucket.lastRefill = now;
    }

    middleware() {
          return (req: Request, res: Response, next: NextFunction) => {
                  const key = this.getKey(req);
                  const bucket = this.getOrCreateBucket(key);

                  this.refillBucket(bucket);

                  if (bucket.tokens < 1) {
                            logger.warn('Rate limit exceeded', {
                                        ip: key,
                                        method: req.method,
                                        path: req.path,
                            });

                            res.status(429).json({
                                        error: 'Too many requests',
                                        retryAfter: Math.ceil(this.config.windowMs / 1000),
                            });
                            return;
                  }

                  bucket.tokens -= 1;

                  // Add rate limit headers
                  res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
                  res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
                  res.setHeader('X-RateLimit-Reset', new Date(bucket.lastRefill + this.config.windowMs).toISOString());

                  next();
          };
    }

    private cleanup(): void {
          const now = Date.now();
          const expireTime = 2 * this.config.windowMs;

          for (const [key, bucket] of this.buckets.entries()) {
                  if (now - bucket.lastRefill > expireTime) {
                            this.buckets.delete(key);
                  }
          }
    }

    reset(key?: string): void {
          if (key) {
                  this.buckets.delete(key);
          } else {
                  this.buckets.clear();
          }
    }
}

// Pre-configured rate limiters for different endpoints
export const globalLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
});

export const apiLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
});

export const authLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
});

export const youtubeLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
});

export { RateLimiter };
})
})
})
})
          }
          }
    }
                  }
          }
    }
                            })
                            })
                  }
          }
    }
    }
                  })
          }
    }
    }
          }
    }
}
}
}
 */