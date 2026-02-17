import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message: string = '成功', statusCode: number = 200): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res: Response, message: string = '失败', statusCode: number = 400): void => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

