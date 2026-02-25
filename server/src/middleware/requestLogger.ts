import { Request, Response, NextFunction } from 'express';

const MAX_ENTRIES = 100;

export type RequestLogEntry = {
  time: string;
  method: string;
  path: string;
  statusCode?: number;
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

export function getRequestLog(): RequestLogEntry[] {
  return [...requestLog];
}

export default function requestLogger(req: Request, res: Response, next: NextFunction) {
  const time = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl || req.baseUrl + req.path;
  const body = maskBody(req.body);

  const entry: RequestLogEntry = { time, method, path, body };
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
  });

  next();
}
