import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: 'user' | 'driver' | 'super_admin' | 'admin' | 'operator';
    [key: string]: any;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: '未提供认证令牌' });
    return;
  }

  jwt.verify(token, jwtConfig.secret, (err, decoded) => {
    if (err) {
      res.status(403).json({ message: '无效的认证令牌' });
      return;
    }
    req.user = decoded as AuthRequest['user'];
    next();
  });
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '未认证' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: '权限不足' });
      return;
    }

    next();
  };
};

