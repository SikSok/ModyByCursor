import { Request, Response, NextFunction } from 'express';
import driverService from '../services/driverService';
import verificationCodeService from '../services/verificationCodeService';
import driverLocationService from '../services/driverLocationService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export class DriverController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, name, id_card, license_plate, vehicle_type, code } = req.body;
      
      if (!phone || !password || !name || !code) {
        return sendError(res, '手机号、密码、姓名、验证码不能为空', 400);
      }

      await verificationCodeService.verifyCode(phone, 'register', code);

      const result = await driverService.register(
        phone,
        password,
        name,
        id_card,
        license_plate,
        vehicle_type
      );
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

      const result = await driverService.login(phone, password);
      sendSuccess(res, result, '登录成功');
    } catch (error: any) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) {
        return sendError(res, '未认证', 401);
      }

      const driver = await driverService.getDriverById(driverId);
      sendSuccess(res, driver, '获取成功');
    } catch (error: any) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) {
        return sendError(res, '未认证', 401);
      }

      const { name, avatar, id_card, license_plate, vehicle_type } = req.body;
      const driver = await driverService.updateDriver(driverId, {
        name,
        avatar,
        id_card,
        license_plate,
        vehicle_type
      });
      sendSuccess(res, driver, '更新成功');
    } catch (error: any) {
      next(error);
    }
  }

  async updateAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) {
        return sendError(res, '未认证', 401);
      }

      const { is_available } = req.body;
      if (typeof is_available !== 'boolean') {
        return sendError(res, 'is_available 必须为 boolean', 400);
      }

      const driver = await driverService.updateAvailability(driverId, is_available);
      sendSuccess(res, driver, '接客状态更新成功');
    } catch (error: any) {
      next(error);
    }
  }

  async reportLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) return sendError(res, '未认证', 401);

      const { latitude, longitude, accuracy } = req.body;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return sendError(res, 'latitude/longitude 必须为 number', 400);
      }

      const location = await driverLocationService.reportLocation({
        driver_id: driverId,
        latitude,
        longitude,
        accuracy: typeof accuracy === 'number' ? accuracy : undefined
      });
      sendSuccess(res, location, '定位上报成功');
    } catch (e) {
      next(e);
    }
  }
}

export default new DriverController();

