/**
 * 手机号脱敏：11 位且 1 开头时中间 4 位替换为 ****，否则原样或截断显示。
 * 用于乘客端展示司机号码，拨号仍使用原始号码。
 */
export function maskPhone(phone: string | undefined | null): string {
  if (phone == null || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.length === 11 && /^1\d{10}$/.test(trimmed)) {
    return trimmed.slice(0, 3) + '****' + trimmed.slice(7);
  }
  if (trimmed.length > 4) {
    return trimmed.slice(0, 3) + '****' + trimmed.slice(-4);
  }
  return trimmed;
}
