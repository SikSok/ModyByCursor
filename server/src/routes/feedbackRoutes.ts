import { Router } from 'express';
import feedbackController from '../controllers/feedbackController';
import { authenticateToken, authorizeRoles, requireAppUser } from '../middleware/auth';

const router = Router();

// 官网匿名留言（无需鉴权）
router.post('/public', feedbackController.createPublic.bind(feedbackController));

// App 用户提交反馈（需 App 用户 token）
router.post('/', authenticateToken, requireAppUser, feedbackController.createApp.bind(feedbackController));

// App 用户：我的反馈列表
router.get('/my', authenticateToken, requireAppUser, feedbackController.getMy.bind(feedbackController));

// 以下仅管理员
router.get(
  '/',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  feedbackController.list.bind(feedbackController)
);
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  feedbackController.getById.bind(feedbackController)
);
router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('operator', 'admin', 'super_admin'),
  feedbackController.update.bind(feedbackController)
);

export default router;
