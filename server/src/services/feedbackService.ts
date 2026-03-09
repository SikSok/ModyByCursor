import { Op } from 'sequelize';
import Feedback, { FeedbackSource, FeedbackType, FeedbackStatus } from '../models/Feedback';
import User from '../models/User';
import * as driverNotificationService from './driverNotificationService';

const CONTENT_SUMMARY_LEN = 50;

export async function createFromApp(
  userId: number,
  body: { type: FeedbackType; content: string; reported_user_info?: string }
): Promise<Feedback> {
  const { type, content, reported_user_info } = body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('请填写反馈内容');
  }
  return Feedback.create({
    source: 'app',
    user_id: userId,
    type: type || 'suggestion',
    content: content.trim(),
    contact: null,
    reported_user_info:
      type === 'report' && reported_user_info && String(reported_user_info).trim()
        ? String(reported_user_info).trim().slice(0, 500)
        : null,
    status: 'pending',
  });
}

export async function createFromWebsite(body: {
  content: string;
  contact?: string;
}): Promise<Feedback> {
  const { content, contact } = body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('请填写留言内容');
  }
  return Feedback.create({
    source: 'website',
    user_id: null,
    type: 'suggestion',
    content: content.trim(),
    contact: contact && String(contact).trim() ? String(contact).trim().slice(0, 200) : null,
    reported_user_info: null,
    status: 'pending',
  });
}

export async function listForAdmin(params: {
  source?: FeedbackSource;
  type?: FeedbackType;
  status?: FeedbackStatus;
  page?: number;
  limit?: number;
}): Promise<{
  list: Array<{
    id: number;
    source: FeedbackSource;
    user_id: number | null;
    type: FeedbackType;
    content_summary: string;
    content: string;
    contact: string | null;
    reported_user_info: string | null;
    status: FeedbackStatus;
    admin_reply: string | null;
    replied_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.source) where.source = params.source;
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;

  const { rows, count } = await Feedback.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
    attributes: [
      'id',
      'source',
      'user_id',
      'type',
      'content',
      'contact',
      'reported_user_info',
      'status',
      'admin_reply',
      'replied_at',
      'created_at',
      'updated_at',
    ],
  });

  const list = rows.map((r) => {
    const content = r.get('content') as string;
    return {
      id: r.id,
      source: r.source,
      user_id: r.user_id,
      type: r.type,
      content_summary:
        content.length > CONTENT_SUMMARY_LEN
          ? content.slice(0, CONTENT_SUMMARY_LEN) + '…'
          : content,
      content,
      contact: r.contact,
      reported_user_info: r.reported_user_info,
      status: r.status,
      admin_reply: r.admin_reply,
      replied_at: r.replied_at ? r.replied_at.toISOString() : null,
      created_at: (r.created_at as Date).toISOString(),
      updated_at: (r.updated_at as Date).toISOString(),
    };
  });

  return { list, total: count, page, limit };
}

export async function getByIdForAdmin(id: number): Promise<Feedback | null> {
  return Feedback.findByPk(id);
}

export async function updateForAdmin(
  id: number,
  body: { status?: FeedbackStatus; admin_reply?: string }
): Promise<Feedback> {
  const feedback = await Feedback.findByPk(id);
  if (!feedback) {
    throw new Error('反馈不存在');
  }

  const updates: Partial<{
    status: FeedbackStatus;
    admin_reply: string;
    replied_at: Date;
  }> = {};

  if (body.status !== undefined) {
    updates.status = body.status;
  }

  if (body.admin_reply !== undefined && body.admin_reply.trim() !== '') {
    updates.admin_reply = body.admin_reply.trim();
    updates.status = 'replied';
    updates.replied_at = new Date();
  }

  await feedback.update(updates);

  if (updates.admin_reply && feedback.source === 'app' && feedback.user_id) {
    const user = await User.findByPk(feedback.user_id, { attributes: ['id', 'driver_status'] });
    if (user && user.driver_status != null) {
      await driverNotificationService.createFeedbackReplyNotification(
        user.id,
        updates.admin_reply
      );
    }
  }

  return feedback.reload();
}

export async function getMyFeedback(userId: number): Promise<
  Array<{
    id: number;
    type: FeedbackType;
    content: string;
    reported_user_info: string | null;
    status: FeedbackStatus;
    admin_reply: string | null;
    replied_at: string | null;
    created_at: string;
  }>
> {
  const rows = await Feedback.findAll({
    where: { source: 'app', user_id: userId },
    order: [['created_at', 'DESC']],
    attributes: [
      'id',
      'type',
      'content',
      'reported_user_info',
      'status',
      'admin_reply',
      'replied_at',
      'created_at',
    ],
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    content: r.content,
    reported_user_info: r.reported_user_info,
    status: r.status,
    admin_reply: r.admin_reply,
    replied_at: r.replied_at ? r.replied_at.toISOString() : null,
    created_at: (r.created_at as Date).toISOString(),
  }));
}
