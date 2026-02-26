import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const MAX_ENTRIES = 100;

/** 是否写入访问日志文件（生产默认开启；可通过 LOG_REQUEST_TO_FILE=0 关闭） */
const shouldLogToFile = (): boolean => {
  if (process.env.LOG_REQUEST_TO_FILE === '0' || process.env.LOG_REQUEST_TO_FILE === 'false') return false;
  if (process.env.LOG_REQUEST_TO_FILE === '1' || process.env.LOG_REQUEST_TO_FILE === 'true') return true;
  return process.env.NODE_ENV === 'production';
};

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');

function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (_) {}
}

export type RequestLogEntry = {
  time: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  errorMessage?: string;
  body?: Record<string, unknown>;
};

const requestLog: RequestLogEntry[] = [];

function maskBody(body: any): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const masked = { ...body };
  if (masked.password !== undefined) masked.password = '***';
  if (masked.code !== undefined) masked.code = '***';
  return masked as Record<string, unknown>;
}

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return String(forwarded[0]).trim();
  return req.socket?.remoteAddress || (req as any).ip;
}

export function getRequestLog(): RequestLogEntry[] {
  return [...requestLog];
}

export default function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startAt = Date.now();
  const time = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl || req.baseUrl + req.path;
  const body = maskBody(req.body);
  const ip = getClientIp(req);

  const entry: RequestLogEntry = { time, method, path, body, ip };
  requestLog.push(entry);
  if (requestLog.length > MAX_ENTRIES) requestLog.shift();

  // 控制台：请求地址
  const bodyStr = body && Object.keys(body).length ? ` body=${JSON.stringify(body)}` : '';
  console.log(`[请求] ${method} ${path}${bodyStr}`);

  // 捕获响应体，便于在 finish 时输出报错原因
  const originalJson = res.json.bind(res);
  res.json = function (bodySent: any) {
    (res as any).__requestLoggerBody = bodySent;
    return originalJson(bodySent);
  };

  res.on('finish', () => {
    entry.statusCode = res.statusCode;
    entry.durationMs = Date.now() - startAt;
    const responseBody = (res as any).__requestLoggerBody;
    const errMsg =
      res.statusCode >= 400 &&
      responseBody &&
      typeof responseBody === 'object' &&
      responseBody.message
        ? String(responseBody.message)
        : undefined;
    if (errMsg) entry.errorMessage = errMsg;

    // 控制台：响应码，有报错时显示报错原因
    if (errMsg) {
      console.log(`[响应] ${res.statusCode}  报错原因: ${errMsg}`);
    } else {
      console.log(`[响应] ${res.statusCode}`);
    }

    // 持久化：每行一条 JSON（NDJSON），便于生产环境用 grep/awk 或日志系统采集
    if (shouldLogToFile()) {
      ensureLogDir();
      const line = JSON.stringify({
        time: entry.time,
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        durationMs: entry.durationMs,
        ip: entry.ip,
        ...(entry.errorMessage ? { errorMessage: entry.errorMessage } : {}),
      }) + '\n';
      fs.appendFile(ACCESS_LOG_FILE, line, (err) => {
        if (err && process.env.NODE_ENV === 'development') console.error('[requestLogger] 写入 access.log 失败:', err.message);
      });
    }
  });

  next();
}
