import winston from 'winston';
import path from 'path';

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  console: boolean;
  file: boolean;
  logDir: string;
  maxFiles: number;
  maxSize: string;
  format: 'json' | 'simple' | 'combined';
}

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'ModularApp', config?: Partial<LoggerConfig>) {
    this.context = context;
    this.logger = this.createLogger(config);
  }

  private createLogger(config?: Partial<LoggerConfig>): winston.Logger {
    const defaultConfig: LoggerConfig = {
      level: process.env.LOG_LEVEL as LoggerConfig['level'] || 'info',
      console: true,
      file: true,
      logDir: './logs',
      maxFiles: 5,
      maxSize: '20m',
      format: 'json',
    };

    const loggerConfig = { ...defaultConfig, ...config };

    const transports: winston.transport[] = [];

    // Console transport
    if (loggerConfig.console) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${context || 'APP'}] ${level}: ${message} ${metaString}`;
            })
          ),
        })
      );
    }

    // File transport
    if (loggerConfig.file) {
      transports.push(
        new winston.transports.File({
          filename: path.join(loggerConfig.logDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: this.parseSize(loggerConfig.maxSize),
          maxFiles: loggerConfig.maxFiles,
        }),
        new winston.transports.File({
          filename: path.join(loggerConfig.logDir, 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: this.parseSize(loggerConfig.maxSize),
          maxFiles: loggerConfig.maxFiles,
        })
      );
    }

    return winston.createLogger({
      level: loggerConfig.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        context: this.context,
      },
      transports,
      exceptionHandlers: [
        new winston.transports.File({ filename: path.join(loggerConfig.logDir, 'exceptions.log') }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: path.join(loggerConfig.logDir, 'rejections.log') }),
      ],
    });
  }

  private parseSize(size: string): number {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+)([kmg]?)$/);
    if (!match) return 5242880; // 5MB default
    const value = parseInt(match[1] || '0');
    const unit = match[2] as keyof typeof units;
    return value * (units[unit] || 1);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  silly(message: string, meta?: any): void {
    this.logger.silly(message, meta);
  }

  // Convenience methods
  logError(error: Error, context?: string): void {
    this.error(`${context ? `[${context}] ` : ''}${error.message}`, {
      stack: error.stack,
      name: error.name,
    });
  }

  logRequest(req: any, res: any, responseTime?: number): void {
    this.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
    });
  }

  logDatabaseQuery(query: string, params?: any, duration?: number): void {
    this.debug('Database Query', {
      query,
      params,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  logPluginAction(plugin: string, action: string, data?: any): void {
    this.info(`Plugin ${action}`, {
      plugin,
      action,
      data,
    });
  }

  logThemeAction(theme: string, action: string, data?: any): void {
    this.info(`Theme ${action}`, {
      theme,
      action,
      data,
    });
  }

  createChild(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

// Export default instance
export const logger = new Logger();

// Export default class for convenience
export default Logger;