import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
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
      const { phone, password, name } = req.body;

      if (!phone || !password) {
        return sendError(res, '手机号、密码不能为空', 400);
      }

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

      const { name, avatar, phone } = req.body;
      const user = await userService.updateUser(userId, { name, avatar, phone });
      sendSuccess(res, user, '更新成功');
    } catch (error: any) {
      next(error);
    }
  }

  /** 乘客端：更新当前用户的上次定位（鉴权：当前登录用户；可选 name） */
  async updateLastLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, '未认证', 401);
      }

      const latitude = Number(req.body?.latitude);
      const longitude = Number(req.body?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return sendError(res, 'latitude、longitude 必须为有效数字', 400);
      }
      const name = req.body?.name != null ? String(req.body.name).trim().slice(0, 100) : undefined;

      const result = await userService.updateLastLocation(userId, {
        latitude,
        longitude,
        ...(name !== undefined && name !== '' && { name })
      });
      sendSuccess(res, result, '更新成功');
    } catch (error: any) {
      next(error);
    }
  }

  /** 乘客端：常用/历史定位列表（最多 4～5 条），鉴权 */
  async getLocationHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, '未认证', 401);
      }
      const limit = Math.min(Number(req.query?.limit) || 5, 10);
      const list = await userService.getLocationHistory(userId, limit);
      sendSuccess(res, list, '获取成功');
    } catch (error: any) {
      next(error);
    }
  }

  /** 乘客端：新增一条常用/历史定位（重新定位成功后调用），鉴权 */
  async addLocationHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, '未认证', 401);
      }
      const latitude = Number(req.body?.latitude);
      const longitude = Number(req.body?.longitude);
      const name = req.body?.name != null ? String(req.body.name).trim().slice(0, 100) : '当前位置';
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return sendError(res, 'latitude、longitude 必须为有效数字', 400);
      }
      const result = await userService.addLocationHistory(userId, {
        latitude,
        longitude,
        name
      });
      sendSuccess(res, result, '添加成功', 201);
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
        .map(({ user, location }) => {
          const d = haversineKm(lat, lng, Number(location.latitude), Number(location.longitude));
          return {
            driver: {
              id: user.id,
              phone: user.phone,
              name: user.name,
              avatar: user.avatar,
              vehicle_type: user.vehicle_type ?? undefined
            },
            location: {
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
              accuracy: location.accuracy != null ? Number(location.accuracy) : null,
              created_at: location.created_at
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

