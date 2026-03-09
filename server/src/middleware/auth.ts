import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import User from '../models/User';

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

/** 司机相关接口：要求当前用户已申请司机身份（driver_status 非 NULL） */
export const requireDriver = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ message: '未认证' });
    return;
  }
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'driver_status'] });
    if (!user || user.driver_status == null) {
      res.status(403).json({ message: '未申请司机身份' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: '服务器错误' });
  }
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

/** App 用户（非管理员）：仅允许 role === 'user' 或 'driver'（同一 token） */
export const requireAppUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: '未认证' });
    return;
  }
  const role = req.user.role;
  if (role !== 'user' && role !== 'driver') {
    res.status(403).json({ message: '仅限 App 用户' });
    return;
  }
  next();
};

