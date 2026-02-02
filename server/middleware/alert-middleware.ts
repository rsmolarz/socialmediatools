import { Request, Response, NextFunction } from 'express';
import { loggingService } from '../lib/logging-service';
import { logger } from '../lib/logger';

interface AlertMetrics {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    avgResponseTime: number;
    memoryUsage: number;
}

class AlertMiddleware {
    private metrics: AlertMetrics = {
          totalRequests: 0,
          errorCount: 0,
          errorRate: 0,
          avgResponseTime: 0,
          memoryUsage: 0,
    };

    private responseTimes: number[] = [];
    private checkInterval: NodeJS.Timeout | null = null;
    private lastCircuitBreakerStates: Record<string, string> = {};

    constructor() {
          this.startMonitoring();
    }

    middleware() {
          return (req: Request, res: Response, next: NextFunction) => {
                  const startTime = Date.now();
                  this.metrics.totalRequests++;

                  const originalSend = res.send;
                  res.send = function (data: any) {
                            const responseTime = Date.now() - startTime;
                            this.responseTimes = this.responseTimes || [];
                            this.responseTimes.push(responseTime);

                            if (this.responseTimes.length > 1000) {
                                        this.responseTimes.shift();
                            }

                            if (res.statusCode >= 400) {
                                        this.errorCount = (this.errorCount || 0) + 1;
                            }

                            return originalSend.call(this, data);
                  };

                  next();
          };
    }

    private startMonitoring(): void {
          this.checkInterval = setInterval(() => {
                  this.checkHealth();
          }, 60000);

          this.checkHealth();
    }

    private async checkHealth(): Promise<void> {
          try {
                  await this.calculateMetrics();
                  await this.checkForAlerts();
                  logger.debug('Health check completed', { metrics: this.metrics });
          } catch (error) {
                  logger.error('Error during health check', { error });
          }
    }

    private async calculateMetrics(): Promise<void> {
          const memUsage = process.memoryUsage();
          const totalMemory = require('os').totalmem();

          this.metrics.memoryUsage = (memUsage.heapUsed / totalMemory) * 100;
          this.metrics.errorRate = this.metrics.totalRequests > 0
            ? (this.metrics.errorCount / this.metrics.totalRequests) * 100
                  : 0;

          if (this.responseTimes.length > 0) {
                  this.metrics.avgResponseTime =
                            this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
          }
    }

    private async checkForAlerts(): Promise<void> {
          if (this.metrics.errorRate > 5) {
                  await loggingService.alertHighErrorRate(this.metrics.errorRate, this.metrics.errorCount);
          }

          if (this.metrics.memoryUsage > 80) {
                  await loggingService.alertHighMemoryUsage(
                            this.metrics.memoryUsage,
                            process.memoryUsage().heapUsed,
                            require('os').totalmem()
                          );
          }

                if (this.metrics.avgResponseTime > 1000) {
                        await loggingService.alertSlowResponseTime(this.metrics.avgResponseTime);
                }
    }

    getMetrics(): AlertMetrics {
          return { ...this.metrics };
    }

    stop(): void {
          if (this.checkInterval) {
                  clearInterval(this.checkInterval);
          }
    }
}

export const alertMiddleware = new AlertMiddleware();