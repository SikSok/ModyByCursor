/**
 * 默认司机头像资源（供乘客端列表、司机信息弹窗、司机端个人中心使用）
 * 3 张男版：可爱 / 友好 / 憨厚，圆脸柔和 3D 卡通风格。当前为 PNG 占位图，待替换为正式默认头像（可改为 WebP、单张 <15KB）。
 */
export const DEFAULT_DRIVER_AVATARS = [
  require('../assets/default-avatars/default-driver-1.png'),
  require('../assets/default-avatars/default-driver-2.png'),
  require('../assets/default-avatars/default-driver-3.png'),
] as const;

/** 按司机 id 轮换选用一款默认头像；无 id 时用第 1 款 */
export function getDefaultDriverAvatarSource(driverId?: number): (typeof DEFAULT_DRIVER_AVATARS)[number] {
  const idx = driverId != null ? Math.abs(driverId) % 3 : 0;
  return DEFAULT_DRIVER_AVATARS[idx];
}
