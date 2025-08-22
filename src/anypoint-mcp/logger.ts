type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

class Logger {
  private static logger: Logger | null = null;

  static getInstance(): Logger {
    return this.logger ??= new Logger();
  }

  private logLevel: LogLevel;

  private levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  private constructor(level: LogLevel = "INFO") {
    this.logLevel = level;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log("DEBUG", message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log("WARN", message, context);
  }

  error(message: string, context?: Record<string, any>): void;

  error(message: string, error: Error, context?: Record<string, any>): void;
  
  error(message: string, errorOrContext?: Error | Record<string, any>, context?: Record<string, any>): void {
    if (errorOrContext instanceof Error) {
      // error(message, error, context?) のケース
      this.log("ERROR", message, { ...context, error: errorOrContext });
    } else {
      // error(message, context?) のケース
      this.log("ERROR", message, errorOrContext);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    // MCPサーバーはSTDIOを使用するため、すべてのログはstderrに出力
    console.error(this.formatMessage(entry));
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
  }
}

export { Logger, type LogLevel };
