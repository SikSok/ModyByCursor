import WebSocket from 'ws';

const driverWsMap = new Map<number, WebSocket>();

export function registerDriverWs(driverId: number, ws: WebSocket): void {
  const existing = driverWsMap.get(driverId);
  if (existing && existing.readyState === WebSocket.OPEN) {
    try {
      existing.close();
    } catch (_) {}
  }
  driverWsMap.set(driverId, ws);
}

export function unregisterDriverWs(driverId: number): void {
  driverWsMap.delete(driverId);
}

/** 向指定司机推送消息，成功返回 true */
export function sendToDriver(driverId: number, payload: object): boolean {
  const ws = driverWsMap.get(driverId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
