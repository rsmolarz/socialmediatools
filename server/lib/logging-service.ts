import { logger } from './logger';

interface LogAggregator {
  logLevel: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AlertConfig {
  enabled: boolean;
  emailRecipients: string[];
  alertThresholds: {
    errorRatePercentage: number;
    circuitBreakerOpen: boolean;
    memoryUsagePercentage: number;
    responseTimeMs: number;
  };
}

class LoggingService {
  private emailTransporter: any = null;
  private alertConfig: AlertConfig;
  private logs: LogAggregator[] = [];
  private alertsSent: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000;

  constructor() {
    this.alertConfig = {
      enabled: process.env.ENABLE_ALERTS === 'true',
      emailRecipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
      alertThresholds: {
        errorRatePercentage: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || '5'),
        circuitBreakerOpen: true,
        memoryUsagePercentage: parseFloat(process.env.ALERT_MEMORY_THRESHOLD || '80'),
        responseTimeMs: parseFloat(process.env.ALERT_RESPONSE_TIME_THRESHOLD || '1000'),
      },
    };

    this.initializeEmailTransport();
  }

  private initializeEmailTransport(): void {
    if (!this.alertConfig.enabled) return;

    if (process.env.SMTP_HOST) {
      const nodemailer = require('nodemailer');
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  aggregateLog(level: string, message: string, metadata?: Record<string, any>): void {
    const log: LogAggregator = {
      logLevel: level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.logs.push(log);

    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  async sendAlert(
    alertType: string,
    subject: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.alertConfig.enabled || !this.emailTransporter) {
      logger.warn('Alerts disabled or email not configured', { alertType });
      return;
    }

    const lastAlertTime = this.alertsSent.get(alertType) || 0;
    const timeSinceLastAlert = Date.now() - lastAlertTime;

    if (timeSinceLastAlert < this.ALERT_COOLDOWN_MS) {
      logger.debug('Alert skipped due to cooldown', { alertType });
      return;
    }

    try {
      const htmlContent = `
        <h2>${subject}</h2>
        <p>${message}</p>
        ${metadata ? `<pre>${JSON.stringify(metadata, null, 2)}</pre>` : ''}
        <p style="color: gray; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
      `;

      await this.emailTransporter.sendMail({
        from: process.env.ALERT_FROM_EMAIL || 'alerts@thumb-meta-tool.com',
        to: this.alertConfig.emailRecipients.join(','),
        subject: `[ALERT] ${subject}`,
        html: htmlContent,
      });

      this.alertsSent.set(alertType, Date.now());
      logger.info('Alert email sent', { alertType });
    } catch (error) {
      logger.error('Failed to send alert email', { error, alertType });
    }
  }

  async alertCircuitBreakerOpen(service: string): Promise<void> {
    await this.sendAlert(
      `circuit-breaker-${service}`,
      `Circuit Breaker Opened: ${service}`,
      `The circuit breaker for ${service} has opened to prevent cascading failures.`,
      { service, timestamp: new Date().toISOString() }
    );
  }

  async alertHighErrorRate(errorRate: number, errorCount: number): Promise<void> {
    if (errorRate < this.alertConfig.alertThresholds.errorRatePercentage) return;

    await this.sendAlert(
      'high-error-rate',
      `High Error Rate Detected: ${errorRate.toFixed(2)}%`,
      `Error rate exceeded threshold. Current: ${errorRate.toFixed(2)}% (${errorCount} errors)`,
      { errorRate, errorCount }
    );
  }

  async alertHighMemoryUsage(
    usagePercentage: number,
    usedBytes: number,
    totalBytes: number
  ): Promise<void> {
    if (usagePercentage < this.alertConfig.alertThresholds.memoryUsagePercentage) return;

    await this.sendAlert(
      'high-memory-usage',
      `High Memory Usage: ${usagePercentage.toFixed(2)}%`,
      `Memory usage exceeded threshold. Current: ${usagePercentage.toFixed(2)}% (${Math.round(usedBytes / 1024 / 1024)}MB)`,
      { usagePercentage, usedBytes, totalBytes }
    );
  }

  async alertSlowResponseTime(avgResponseTime: number): Promise<void> {
    if (avgResponseTime < this.alertConfig.alertThresholds.responseTimeMs) return;

    await this.sendAlert(
      'slow-response-time',
      `Slow Response Times: ${avgResponseTime.toFixed(0)}ms`,
      `Average response time exceeded threshold. Current: ${avgResponseTime.toFixed(0)}ms`,
      { avgResponseTime }
    );
  }

  getRecentLogs(limit: number = 100): LogAggregator[] {
    return this.logs.slice(-limit);
  }

  getLogsByLevel(level: string, limit: number = 100): LogAggregator[] {
    return this.logs.filter((log) => log.logLevel === level).slice(-limit);
  }

  async exportLogs(): Promise<LogAggregator[]> {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    logger.info('Logs cleared');
  }
}

export const loggingService = new LoggingService();
