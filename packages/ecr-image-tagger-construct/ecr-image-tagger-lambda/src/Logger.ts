/* eslint-disable no-console */
export class Logger {
  info(message: string, data?: unknown): void {
    const logEntry: Record<string, unknown> = {
      level: "INFO",
      message,
      timestamp: new Date().toISOString(),
    };
    if (data !== undefined) {
      logEntry.data = data;
    }
    console.log(JSON.stringify(logEntry));
  }

  error(message: string, error?: unknown): void {
    const logEntry: Record<string, unknown> = {
      level: "ERROR",
      message,
      timestamp: new Date().toISOString(),
    };
    if (error !== undefined) {
      logEntry.error = this.serializeError(error);
    }
    console.error(JSON.stringify(logEntry));
  }

  private serializeError(error: unknown): unknown {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return error;
  }
}
