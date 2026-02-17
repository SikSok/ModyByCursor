import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import verificationCodeService from '../services/verificationCodeService';
import driverLocationService from '../services/driverLocationService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class UserController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, name, code } = req.body;
      
      if (!phone || !password || !code) {
        return sendError(res, '手机号、密码、验证码不能为空', 400);
      }

      // 验证码校验（register）
      await verificationCodeService.verifyCode(phone, 'register', code);

      const result = await userService.register(phone, password, name);
      sendSuccess(res, result, '注册成功', 201);
    } catch (error: any) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return sendError(res, '手机号和密码不能为空', 400);
      }

      const result = await userService.login(phone, password);
      sendSuccess(res, result, '登录成功');
    } catch (error: any) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, '未认证', 401);
      }

      const user = await userService.getUserById(userId);
      sendSuccess(res, user, '获取成功');
    } catch (error: any) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, '未认证', 401);
      }

      const { name, avatar } = req.body;
      const user = await userService.updateUser(userId, { name, avatar });
      sendSuccess(res, user, '更新成功');
    } catch (error: any) {
      next(error);
    }
  }

  async nearbyDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm = req.query.radius_km != null ? Number(req.query.radius_km) : 10;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return sendError(res, 'lat/lng 必须为数字', 400);
      }
      if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
        return sendError(res, 'radius_km 必须为正数', 400);
      }

      const items = await driverLocationService.listApprovedAvailableWithLatestLocation();
      const result = items
        .map(({ driver, location }) => {
          const d = haversineKm(lat, lng, Number(location!.latitude), Number(location!.longitude));
          return {
            driver: {
              id: driver.id,
              phone: driver.phone,
              name: driver.name,
              avatar: driver.avatar,
              vehicle_type: driver.vehicle_type
            },
            location: {
              latitude: Number(location!.latitude),
              longitude: Number(location!.longitude),
              accuracy: location!.accuracy != null ? Number(location!.accuracy) : null,
              created_at: location!.created_at
            },
            distance_km: d
          };
        })
        .filter((x) => x.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km);

      sendSuccess(res, result, '获取成功');
    } catch (e) {
      next(e);
    }
  }
}

export default new UserController();

