/**
 * 高德逆地理编码：经纬度 → 位置文案（如 宁德市-蕉城区）
 * 使用 Web 服务 API：https://restapi.amap.com/v3/geocode/regeo
 */

export interface RegeoAddressComponent {
  province?: string;
  city?: string | string[];
  district?: string;
}

export interface RegeoResult {
  status: string;
  regeocode?: {
    addressComponent?: RegeoAddressComponent;
  };
}

/**
 * 将经纬度解析为「城市-区县」风格的位置文案
 * @param lat 纬度
 * @param lng 经度
 * @param key 高德 Web 服务 Key（与地图 SDK Key 可同可不同，需开通 Web 服务）
 * @returns 如 "宁德市-蕉城区"、"福州市-闽清县"，失败返回 "当前位置"
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  key: string
): Promise<string> {
  if (!key || key === 'YOUR_AMAP_KEY') return '当前位置';
  const location = `${lng},${lat}`;
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${encodeURIComponent(key)}&location=${location}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json()) as RegeoResult;
    const addr = json?.regeocode?.addressComponent;
    if (!addr) return '当前位置';
    const province = typeof addr.province === 'string' ? addr.province : '';
    const city = Array.isArray(addr.city) ? '' : (addr.city as string) || '';
    const district = typeof addr.district === 'string' ? addr.district : '';
    if (city && district) return `${city}-${district}`;
    if (city) return city;
    if (province && district) return `${province}-${district}`;
    if (district) return district;
    if (province) return province;
    return '当前位置';
  } catch {
    return '当前位置';
  }
}
