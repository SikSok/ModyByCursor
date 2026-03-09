import { Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import * as feedbackService from '../services/feedbackService';
import { AuthRequest } from '../middleware/auth';

export class FeedbackController {
  /** App 端提交反馈（需登录） */
  async createApp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, '未认证', 401);
      const body = req.body as { type?: string; content?: string; reported_user_info?: string };
      const type = body.type as 'suggestion' | 'experience' | 'report' | undefined;
      if (type && !['suggestion', 'experience', 'report'].includes(type)) {
        return sendError(res, '无效的反馈类型', 400);
      }
      const row = await feedbackService.createFromApp(userId, {
        type: type || 'suggestion',
        content: body.content ?? '',
        reported_user_info: body.reported_user_info,
      });
      sendSuccess(res, { id: row.id }, '提交成功', 201);
    } catch (e: any) {
      if (e?.message && /请填写/.test(e.message)) return sendError(res, e.message, 400);
      next(e);
    }
  }

  /** 官网公开提交留言（无需登录） */
  async createPublic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { content?: string; contact?: string };
      const row = await feedbackService.createFromWebsite({
        content: body.content ?? '',
        contact: body.contact,
      });
      sendSuccess(res, { id: row.id }, '感谢您的留言，我们已收到。', 201);
    } catch (e: any) {
      if (e?.message && /请填写/.test(e.message)) return sendError(res, e.message, 400);
      next(e);
    }
  }

  /** 管理员：列表（分页、筛选） */
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const source = req.query.source as string | undefined;
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const page = req.query.page != null ? Number(req.query.page) : undefined;
      const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const result = await feedbackService.listForAdmin({
        source: source as any,
        type: type as any,
        status: status as any,
        page,
        limit,
      });
      sendSuccess(res, result, '获取成功');
    } catch (e) {
      next(e);
    }
  }

  /** 管理员：详情 */
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return sendError(res, '无效的 ID', 400);
      const row = await feedbackService.getByIdForAdmin(id);
      if (!row) return sendError(res, '反馈不存在', 404);
      sendSuccess(res, row, '获取成功');
    } catch (e) {
      next(e);
    }
  }

  /** 管理员：更新状态与回复 */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return sendError(res, '无效的 ID', 400);
      const body = req.body as { status?: string; admin_reply?: string };
      const status = body.status as 'pending' | 'replied' | 'closed' | undefined;
      const row = await feedbackService.updateForAdmin(id, {
        status,
        admin_reply: body.admin_reply,
      });
      sendSuccess(res, row, '更新成功');
    } catch (e: any) {
      if (e?.message === '反馈不存在') return sendError(res, e.message, 404);
      next(e);
    }
  }

  /** App 用户：我的反馈列表（含回复） */
  async getMy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, '未认证', 401);
      const list = await feedbackService.getMyFeedback(userId);
      sendSuccess(res, list, '获取成功');
    } catch (e) {
      next(e);
    }
  }
}

export default new FeedbackController();
