import { Op } from 'sequelize';
import User from '../models/User';
import UserLocationHistory from '../models/UserLocationHistory';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

const HISTORY_MAX_PER_USER = 20;
const HISTORY_LIST_LIMIT = 5;
const DEDUP_KM = 0.5;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class UserService {
  async register(phone: string, password: string, name?: string) {
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      throw new Error('该手机号已被注册');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      phone,
      password_hash: hashedPassword,
      name,
      status: 1
    });

    const token = generateToken({
      id: user.id,
      role: 'user'
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        status: user.status
      },
      token
    };
  }

  async login(phone: string, password: string) {
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      throw new Error('手机号或密码错误');
    }

    if (user.status !== 1) {
      throw new Error('账户已被禁用');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('手机号或密码错误');
    }

    const token = generateToken({
      id: user.id,
      role: 'user'
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        status: user.status
      },
      token
    };
  }

  async getUserById(id: number) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) {
      throw new Error('用户不存在');
    }
    return user;
  }

  async updateUser(id: number, data: { name?: string; avatar?: string }) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    await user.update(data);
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      status: user.status
    };
  }

  /** 乘客端：更新当前用户的上次定位（可选 name，节流由调用方控制） */
  async updateLastLocation(
    id: number,
    data: { latitude: number; longitude: number; name?: string }
  ) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('用户不存在');
    }
    const payload: Record<string, unknown> = {
      last_latitude: data.latitude,
      last_longitude: data.longitude,
      last_location_updated_at: new Date()
    };
    if (data.name != null && data.name !== '') {
      payload.last_location_name = data.name;
    }
    await user.update(payload);
    return {
      last_latitude: data.latitude,
      last_longitude: data.longitude,
      last_location_name: data.name ?? user.last_location_name,
      last_location_updated_at: new Date()
    };
  }

  /** 乘客端：常用/历史定位列表，最多返回 HISTORY_LIST_LIMIT 条 */
  async getLocationHistory(userId: number, limit: number = HISTORY_LIST_LIMIT) {
    const rows = await UserLocationHistory.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: Math.min(limit, 10),
      attributes: ['id', 'latitude', 'longitude', 'name', 'created_at']
    });
    return rows.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      name: r.name,
      created_at: r.created_at
    }));
  }

  /** 乘客端：新增一条常用/历史定位，同名称或距离过近则更新已有记录，单用户保留最近 HISTORY_MAX_PER_USER 条 */
  async addLocationHistory(
    userId: number,
    data: { latitude: number; longitude: number; name: string }
  ) {
    const name = String(data.name || '当前位置').trim().slice(0, 100);
    const lat = data.latitude;
    const lng = data.longitude;

    const existing = await UserLocationHistory.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    for (const row of existing) {
      if (row.name === name || haversineKm(lat, lng, row.latitude, row.longitude) < DEDUP_KM) {
        await row.update({ latitude: lat, longitude: lng, name, created_at: new Date() });
        return { id: row.id, latitude: lat, longitude: lng, name, created_at: new Date() };
      }
    }

    const created = await UserLocationHistory.create({
      user_id: userId,
      latitude: lat,
      longitude: lng,
      name
    });

    const count = await UserLocationHistory.count({ where: { user_id: userId } });
    if (count > HISTORY_MAX_PER_USER) {
      const toRemove = await UserLocationHistory.findAll({
        where: { user_id: userId },
        order: [['created_at', 'ASC']],
        limit: count - HISTORY_MAX_PER_USER
      });
      for (const row of toRemove) {
        await row.destroy();
      }
    }

    return {
      id: created.id,
      latitude: created.latitude,
      longitude: created.longitude,
      name: created.name,
      created_at: created.created_at
    };
  }

  /** 管理端：用户列表分页查询，支持手机号、状态筛选 */
  async listUsers(options: {
    page?: number;
    pageSize?: number;
    phone?: string;
    status?: 0 | 1;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const where: Record<string, any> = {};
    if (options.phone != null && options.phone !== '') {
      where.phone = { [Op.like]: `%${options.phone}%` };
    }
    if (options.status !== undefined) {
      where.status = options.status;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['id', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    return {
      list: rows,
      total: count,
      page,
      pageSize
    };
  }
}

export default new UserService();

