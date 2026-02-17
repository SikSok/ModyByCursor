import { Request, Response, NextFunction } from 'express';
import adminService from '../services/adminService';
import driverService from '../services/driverService';
import userService from '../services/userService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export class AdminController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, name, email, role } = req.body;
      
      if (!username || !password) {
        return sendError(res, '用户名和密码不能为空', 400);
      }

      const result = await adminService.register(username, password, name, email, role);
      sendSuccess(res, result, '注册成功', 201);
    } catch (error: any) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return sendError(res, '用户名和密码不能为空', 400);
      }

      const result = await adminService.login(username, password);
      sendSuccess(res, result, '登录成功');
    } catch (error: any) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return sendError(res, '未认证', 401);
      }

      const admin = await adminService.getAdminById(adminId);
      sendSuccess(res, admin, '获取成功');
    } catch (error: any) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return sendError(res, '未认证', 401);
      }

      const { name, email, role, status } = req.body;
      const admin = await adminService.updateAdmin(adminId, {
        name,
        email,
        role,
        status
      });
      sendSuccess(res, admin, '更新成功');
    } catch (error: any) {
      next(error);
    }
  }

  async getAllAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await adminService.getAllAdmins();
      sendSuccess(res, admins, '获取成功');
    } catch (error: any) {
      next(error);
    }
  }

  async getPendingDrivers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const drivers = await driverService.listPendingDrivers();
      sendSuccess(res, drivers, '获取成功');
    } catch (e) {
      next(e);
    }
  }

  async approveDriver(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return sendError(res, '无效的司机ID', 400);
      const driver = await driverService.approveDriver(id);
      sendSuccess(res, driver, '审核通过');
    } catch (e) {
      next(e);
    }
  }

  async rejectDriver(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return sendError(res, '无效的司机ID', 400);
      const driver = await driverService.rejectDriver(id);
      sendSuccess(res, driver, '已驳回');
    } catch (e) {
      next(e);
    }
  }

  /** 管理端：用户列表查询（分页、手机号、状态筛选） */
  async getUserList(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page != null ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize != null ? Number(req.query.pageSize) : undefined;
      const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined;
      const status = req.query.status != null ? Number(req.query.status) as 0 | 1 : undefined;
      const result = await userService.listUsers({ page, pageSize, phone, status });
      sendSuccess(res, result, '获取成功');
    } catch (e) {
      next(e);
    }
  }

  /** 管理端：数据统计面板 */
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getStats();
      sendSuccess(res, stats, '获取成功');
    } catch (e) {
      next(e);
    }
  }
}

export default new AdminController();

