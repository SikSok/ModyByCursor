/**
 * 司机端：收到 WebSocket 推送后展示系统本地通知（系统通知栏/设置-通知）
 * 仅使用系统通知权限，无自定义权限。
 */
import { Platform } from 'react-native';

const NOTIFEE_CHANNEL_ID = 'mody_driver_contact';
const NOTIFEE_CHANNEL_NAME = '乘客联系';

let channelCreated = false;

async function ensureChannel(): Promise<string> {
  if (channelCreated) return NOTIFEE_CHANNEL_ID;
  try {
    const notifee = require('@notifee/react-native').default;
    await notifee.createChannel({
      id: NOTIFEE_CHANNEL_ID,
      name: NOTIFEE_CHANNEL_NAME,
    });
    channelCreated = true;
    return NOTIFEE_CHANNEL_ID;
  } catch (e) {
    if (__DEV__) console.warn('[DriverNotificationDisplay] createChannel failed', e);
    return NOTIFEE_CHANNEL_ID;
  }
}

/**
 * 展示一条系统本地通知（标题「摩迪」，正文自定义）
 * 用于：单条联系通知、补发汇总「您有 N 条未读通知，点击查看」
 */
export async function showDriverContactNotification(options: {
  title?: string;
  body: string;
}): Promise<void> {
  const title = options.title ?? '摩迪';
  const body = options.body || '有乘客正在通过摩迪联系您，请接听来电';

  try {
    const notifee = require('@notifee/react-native').default;

    if (Platform.OS === 'ios') {
      await notifee.requestPermission();
    }

    const channelId = await ensureChannel();

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[DriverNotificationDisplay] displayNotification failed', e);
  }
}
