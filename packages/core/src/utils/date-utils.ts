import { format, parseISO, isValid, addDays, subDays, startOfDay, endOfDay, differenceInDays, formatDistanceToNow } from 'date-fns';

export type DateFormat = 'short' | 'medium' | 'long' | 'full' | 'iso' | 'timestamp';
export type TimeFormat = '12h' | '24h';

export interface DateFormatOptions {
  format?: DateFormat;
  timeFormat?: TimeFormat;
  includeTime?: boolean;
  relative?: boolean;
  locale?: string;
}

export class DateUtils {
  private static readonly DEFAULT_FORMAT = 'medium';
  private static readonly DEFAULT_TIME_FORMAT = '12h';

  private static readonly FORMAT_PATTERNS = {
    short: 'MM/dd/yyyy',
    medium: 'MMM dd, yyyy',
    long: 'MMMM dd, yyyy',
    full: 'EEEE, MMMM dd, yyyy',
    iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    timestamp: 'yyyy-MM-dd HH:mm:ss',
  };

  private static readonly TIME_PATTERNS = {
    '12h': 'h:mm a',
    '24h': 'HH:mm',
  };

  /**
   * Format date according to specified options
   */
  static formatDate(
    date: Date | string | number,
    options: DateFormatOptions = {}
  ): string {
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';

    const {
      format: dateFormat = this.DEFAULT_FORMAT,
      timeFormat = this.DEFAULT_TIME_FORMAT,
      includeTime = false,
      relative = false,
    } = options;

    if (relative) {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    }

    let pattern = this.FORMAT_PATTERNS[dateFormat];
    
    if (includeTime) {
      pattern += ` ${this.TIME_PATTERNS[timeFormat]}`;
    }

    return format(dateObj, pattern);
  }

  /**
   * Parse date from various formats
   */
  static parseDate(date: Date | string | number): Date | null {
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }

    if (typeof date === 'string') {
      // Try ISO format first
      const isoDate = parseISO(date);
      if (isValid(isoDate)) return isoDate;

      // Try general Date constructor
      const generalDate = new Date(date);
      if (isValid(generalDate)) return generalDate;

      return null;
    }

    if (typeof date === 'number') {
      const numberDate = new Date(date);
      return isValid(numberDate) ? numberDate : null;
    }

    return null;
  }

  /**
   * Get current date in specified format
   */
  static now(options: DateFormatOptions = {}): string {
    return this.formatDate(new Date(), options);
  }

  /**
   * Get current timestamp
   */
  static timestamp(): number {
    return Date.now();
  }

  /**
   * Get current date as ISO string
   */
  static nowISO(): string {
    return new Date().toISOString();
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string | number): boolean {
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;

    const today = new Date();
    return this.isSameDay(dateObj, today);
  }

  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date | string | number): boolean {
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;

    const yesterday = subDays(new Date(), 1);
    return this.isSameDay(dateObj, yesterday);
  }

  /**
   * Check if date is tomorrow
   */
  static isTomorrow(date: Date | string | number): boolean {
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;

    const tomorrow = addDays(new Date(), 1);
    return this.isSameDay(dateObj, tomorrow);
  }

  /**
   * Check if two dates are the same day
   */
  static isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
    const d1 = this.parseDate(date1);
    const d2 = this.parseDate(date2);
    
    if (!d1 || !d2) return false;

    return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
  }

  /**
   * Get relative time description
   */
  static timeAgo(date: Date | string | number): string {
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';

    return formatDistanceToNow(dateObj, { addSuffix: true });
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date | string | number): Date | null {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;

    return startOfDay(dateObj);
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date | string | number): Date | null {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;

    return endOfDay(dateObj);
  }

  /**
   * Add days to date
   */
  static addDays(date: Date | string | number, days: number): Date | null {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;

    return addDays(dateObj, days);
  }

  /**
   * Subtract days from date
   */
  static subtractDays(date: Date | string | number, days: number): Date | null {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;

    return subDays(dateObj, days);
  }

  /**
   * Get difference between dates in days
   */
  static daysBetween(
    startDate: Date | string | number,
    endDate: Date | string | number
  ): number | null {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    
    if (!start || !end) return null;

    return differenceInDays(end, start);
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date | string | number): boolean {
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;

    return dateObj < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date | string | number): boolean {
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;

    return dateObj > new Date();
  }

  /**
   * Get age from birthdate
   */
  static getAge(birthdate: Date | string | number): number | null {
    const birthdateObj = this.parseDate(birthdate);
    if (!birthdateObj) return null;

    const today = new Date();
    const age = today.getFullYear() - birthdateObj.getFullYear();
    const monthDiff = today.getMonth() - birthdateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
      return age - 1;
    }
    
    return age;
  }

  /**
   * Format date for database storage (ISO string)
   */
  static toDatabase(date: Date | string | number): string | null {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;

    return dateObj.toISOString();
  }

  /**
   * Format date for display in admin interface
   */
  static forAdmin(date: Date | string | number): string {
    return this.formatDate(date, {
      format: 'medium',
      includeTime: true,
      timeFormat: '24h',
    });
  }

  /**
   * Format date for API responses
   */
  static forAPI(date: Date | string | number): string {
    return this.formatDate(date, { format: 'iso' });
  }

  /**
   * Format date for user display
   */
  static forUser(date: Date | string | number, includeTime = false): string {
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';

    // Show relative time for recent dates
    const daysDiff = this.daysBetween(dateObj, new Date());
    
    if (daysDiff !== null && Math.abs(daysDiff) <= 7) {
      return this.timeAgo(dateObj);
    }

    return this.formatDate(date, {
      format: 'medium',
      includeTime,
      timeFormat: '12h',
    });
  }

  /**
   * Get date range for queries
   */
  static getDateRange(period: 'today' | 'yesterday' | 'week' | 'month' | 'year'): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    
    switch (period) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
      
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday),
        };
      
      case 'week':
        return {
          start: subDays(startOfDay(now), 7),
          end: endOfDay(now),
        };
      
      case 'month':
        return {
          start: subDays(startOfDay(now), 30),
          end: endOfDay(now),
        };
      
      case 'year':
        return {
          start: subDays(startOfDay(now), 365),
          end: endOfDay(now),
        };
      
      default:
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
    }
  }

  /**
   * Validate date string
   */
  static isValidDate(date: any): boolean {
    const dateObj = this.parseDate(date);
    return dateObj !== null;
  }

  /**
   * Get timezone offset
   */
  static getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
  }

  /**
   * Convert date to user's timezone
   */
  static toUserTimezone(date: Date | string | number, timezone?: string): Date | null {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;

    // If timezone is provided, use it; otherwise use system timezone
    if (timezone) {
      try {
        return new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
      } catch {
        return dateObj;
      }
    }

    return dateObj;
  }
}