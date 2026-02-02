class Logger {
  info(message: string, data?: Record<string, unknown>) {
    this.logg("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.logg("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.logg("error", message, data);
  }

  private logg(
    level: "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
  ) {
    let logglinje: string | Record<string, unknown> = {
      level,
      message,
      ...this.serialiserData(data),
    };
    if (process.env.NODE_ENV !== "development") {
      logglinje = JSON.stringify(logglinje);
    }
    console[level](logglinje);
  }

  private serialiserData(data?: Record<string, unknown>) {
    if (!data) {
      return {};
    }
    const serialisert: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        serialisert[key] = {
          message: value.message,
          stack: value.stack,
          name: value.name,
        };
      } else {
        serialisert[key] = value;
      }
    }
    return serialisert;
  }
}

export const logger = new Logger();
