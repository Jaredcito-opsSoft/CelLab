import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;
const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function normalize(value: unknown) {
  if (!(value instanceof Error)) return value;
  const cause = value.cause instanceof Error
    ? { name: value.cause.name, message: value.cause.message, code: 'code' in value.cause ? value.cause.code : undefined }
    : undefined;
  return { name: value.name, message: value.message, cause, stack: env.NODE_ENV === 'development' ? value.stack : undefined };
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  if (priorities[level] < priorities[env.LOG_LEVEL]) return;
  const fields = Object.fromEntries(Object.entries(context).map(([key, value]) => [key, normalize(value)]));
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
