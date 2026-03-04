import { Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import * as driverNotificationService from '../services/driverNotificationService';

export class PassengerController {
  /** 乘客点击拨打电话前调用：创建「联系」通知并尝试推送给司机 */
  async contactDriver(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const passengerId = req.user?.id ?? null;
      if (!req.user || req.user.role !== 'user') {
        return sendError(res, '未认证', 401);
      }

      const driverId = req.body?.driverId;
      if (driverId === undefined || driverId === null) {
        return sendError(res, '缺少 driverId', 400);
      }
      const driverIdNum = typeof driverId === 'string' ? parseInt(driverId, 10) : Number(driverId);
      if (!Number.isFinite(driverIdNum) || driverIdNum < 1) {
        return sendError(res, 'driverId 无效', 400);
      }

      const notification = await driverNotificationService.createContactNotification(
        driverIdNum,
        passengerId
      );
      sendSuccess(res, { id: notification.id }, '已通知司机', 200);
    } catch (e: unknown) {
      next(e);
    }
  }
}

export default new PassengerController();
