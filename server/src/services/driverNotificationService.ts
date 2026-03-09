import { Op } from 'sequelize';
import DriverNotification from '../models/DriverNotification';

const CONTACT_DEDUP_MINUTES = 2;
const CONTACT_TYPE = 'contact';
const DEFAULT_CONTENT = '有乘客正在通过摩迪联系您，请接听来电';
const MAX_NOTIFICATIONS_PER_DRIVER = 100;

export type PushToDriverFn = (driverId: number, payload: object) => boolean;

let pushToDriverFn: PushToDriverFn | null = null;

export function setPushToDriver(fn: PushToDriverFn | null) {
  pushToDriverFn = fn;
}

/** 乘客联系司机：去重（同司机+同乘客 2 分钟内仅一条）、创建通知、尝试 WebSocket 推送 */
export async function createContactNotification(
  driverId: number,
  passengerId: number | null
): Promise<DriverNotification> {
  const since = new Date(Date.now() - CONTACT_DEDUP_MINUTES * 60 * 1000);
  const existing = await DriverNotification.findOne({
    where: {
      driver_id: driverId,
      passenger_id: passengerId != null ? passengerId : { [Op.is]: null },
      type: CONTACT_TYPE,
      created_at: { [Op.gte]: since },
    },
  });
  if (existing) {
    return existing;
  }

  const row = await DriverNotification.create({
    driver_id: driverId,
    passenger_id: passengerId ?? null,
    type: CONTACT_TYPE,
    content: DEFAULT_CONTENT,
    delivered: false,
    read: false,
  });

  if (pushToDriverFn && pushToDriverFn(driverId, {
    type: 'NOTIFICATION',
    id: row.id,
    content: row.content,
    created_at: row.created_at,
  })) {
    await row.update({ delivered: true });
  }

  return row;
}

/** 司机端：分页列表，按 created_at 倒序，返回 unreadCount */
export async function getDriverNotifications(
  driverId: number,
  page: number,
  limit: number
): Promise<{
  list: Array<{ id: number; content: string; created_at: Date; read: boolean }>;
  unreadCount: number;
}> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const [list, unreadCount] = await Promise.all([
    DriverNotification.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset,
      attributes: ['id', 'content', 'created_at', 'read'],
    }),
    DriverNotification.count({
      where: { driver_id: driverId, read: false },
    }),
  ]);

  return {
    list: list.map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      read: r.read,
    })),
    unreadCount,
  };
}

/** 司机端：全部标记已读 */
export async function markDriverNotificationsRead(driverId: number): Promise<void> {
  await DriverNotification.update(
    { read: true },
    { where: { driver_id: driverId, read: false } }
  );
}

/** 获取该司机未推送的通知（用于 WebSocket 连接后补发 PENDING_LIST） */
export async function getPendingNotifications(driverId: number): Promise<
  Array<{ id: number; content: string; created_at: Date }>
> {
  const rows = await DriverNotification.findAll({
    where: { driver_id: driverId, delivered: false },
    order: [['created_at', 'ASC']],
    attributes: ['id', 'content', 'created_at'],
  });
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
  }));
}

/** 将一批通知标记为已推送（补发后调用） */
export async function markNotificationsDelivered(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await DriverNotification.update(
    { delivered: true },
    { where: { id: { [Op.in]: ids } } }
  );
}

/** 反馈回复：给司机发一条站内通知（管理员回复 App 用户反馈时，若该用户是司机则推送） */
export async function createFeedbackReplyNotification(
  driverId: number,
  content: string
): Promise<DriverNotification> {
  const text = content.length > 200 ? content.slice(0, 200) + '…' : content;
  const row = await DriverNotification.create({
    driver_id: driverId,
    passenger_id: null,
    type: 'feedback_reply',
    content: `【反馈回复】${text}`,
    delivered: false,
    read: false,
  });
  if (
    pushToDriverFn &&
    pushToDriverFn(driverId, {
      type: 'NOTIFICATION',
      id: row.id,
      content: row.content,
      created_at: row.created_at,
    })
  ) {
    await row.update({ delivered: true });
  }
  return row;
}

/** 可选：清理超出数量的旧通知（如每司机保留最近 100 条） */
export async function trimOldNotifications(): Promise<void> {
  const drivers = await DriverNotification.findAll({
    attributes: ['driver_id'],
    group: ['driver_id'],
  });
  for (const { driver_id } of drivers) {
    const toRemove = await DriverNotification.findAll({
      where: { driver_id },
      order: [['created_at', 'ASC']],
      limit: 1,
      offset: MAX_NOTIFICATIONS_PER_DRIVER,
    });
    for (const row of toRemove) {
      await row.destroy();
    }
  }
}
