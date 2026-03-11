import { Request, Response, NextFunction } from 'express';
import driverService from '../services/driverService';
import driverLocationService from '../services/driverLocationService';
import * as driverNotificationService from '../services/driverNotificationService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export class DriverController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, name, id_card, license_plate, vehicle_type } = req.body;

      if (!phone || !password || !name) {
        return sendError(res, '手机号、密码、姓名不能为空', 400);
      }

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

      const { name, avatar, id_card, license_plate, vehicle_type, phone } = req.body;
      const driver = await driverService.updateDriver(driverId, {
        name,
        avatar,
        id_card,
        license_plate,
        vehicle_type,
        phone
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
    } catch (e: any) {
      if (e?.code === 'DRIVER_NOT_VERIFIED') {
        return sendError(res, e.message || '请先完成身份认证', 403, {
          code: 'DRIVER_NOT_VERIFIED',
        });
      }
      if (e?.code === 'NO_PHONE') {
        return sendError(res, e.message || '请先绑定手机号', 400, {
          code: 'NO_PHONE',
        });
      }
      next(e);
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

  /** 提交身份认证材料（身份证正反面、车牌号、可选车牌照片） */
  async submitVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) {
        return sendError(res, '未认证', 401);
      }

      const { id_card_front, id_card_back, license_plate, license_plate_photo } = req.body;
      if (!id_card_front || !id_card_back || !license_plate) {
        return sendError(res, '身份证正反面与车牌号为必填项', 400);
      }

      const driver = await driverService.submitVerification(driverId, {
        id_card_front,
        id_card_back,
        license_plate: String(license_plate).trim(),
        license_plate_photo: license_plate_photo || undefined,
      });
      sendSuccess(res, driver, '认证材料已提交');
    } catch (e: any) {
      if (e?.message && /必填|不存在/.test(e.message)) {
        return sendError(res, e.message, 400);
      }
      next(e);
    }
  }

  /** 司机证件图片上传：接收单个文件并返回可访问 URL */
  async uploadImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) {
        return sendError(res, '未认证', 401);
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return sendError(res, '未收到文件', 400);
      }

      const relativePath = `/uploads/drivers/${file.filename}`;
      // 说明：这里仅返回相对路径，由前端基于 API_BASE_URL 计算完整 URL，
      // 保证与当前 App 所使用的后端地址（本地局域网 / 线上域名）一致。
      sendSuccess(res, { path: relativePath }, '上传成功');
    } catch (e) {
      next(e);
    }
  }

  /** 司机端：通知列表分页，带未读数量 */
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) return sendError(res, '未认证', 401);

      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit), 10) || 20));

      const result = await driverNotificationService.getDriverNotifications(
        driverId,
        page,
        limit
      );
      sendSuccess(res, result, '获取成功');
    } catch (e) {
      next(e);
    }
  }

  /** 司机端：全部标记已读 */
  async markNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user?.id;
      if (!driverId) return sendError(res, '未认证', 401);

      await driverNotificationService.markDriverNotificationsRead(driverId);
      sendSuccess(res, null, '已标记已读');
    } catch (e) {
      next(e);
    }
  }
}

export default new DriverController();

