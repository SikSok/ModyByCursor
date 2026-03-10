import User from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import type { DriverStatus } from '../models/User';

export class DriverService {
  /** 司机注册：若该手机号已在 users 中存在则只更新司机字段，否则创建 user 并写入司机字段 */
  async register(
    phone: string,
    password: string,
    name: string,
    id_card?: string,
    license_plate?: string,
    vehicle_type?: string
  ) {
    const phoneTrimmed = typeof phone === 'string' ? phone.trim() : '';
    const existingUser = await User.findOne({ where: { phone: phoneTrimmed } });
    const hashedPassword = await bcrypt.hash(password, 10);

    let user: User;
    if (existingUser) {
      await existingUser.update({
        driver_status: 'pending',
        is_available: false,
        id_card: id_card ?? existingUser.id_card,
        license_plate: license_plate ?? existingUser.license_plate,
        vehicle_type: vehicle_type ?? existingUser.vehicle_type,
        name: name || (existingUser.name ?? undefined),
      });
      user = existingUser;
    } else {
      user = await User.create({
        phone: phoneTrimmed,
        password_hash: hashedPassword,
        name,
        driver_status: 'pending',
        is_available: false,
        id_card,
        license_plate,
        vehicle_type,
        status: 1,
      });
    }

    const token = generateToken({ id: user.id, role: 'user' });
    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        token,
      },
      hasDriver: true,
      driverStatus: user.driver_status,
      isAvailable: user.is_available ?? false,
    };
  }

  async login(phone: string, password: string) {
    const phoneTrimmed = typeof phone === 'string' ? phone.trim() : '';
    const user = await User.findOne({ where: { phone: phoneTrimmed } });
    if (!user) {
      throw new Error('手机号或密码错误');
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('手机号或密码错误');
    }
    const token = generateToken({ id: user.id, role: 'user' });
    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        token,
      },
      hasDriver: user.driver_status != null,
      driverStatus: user.driver_status ?? undefined,
      isAvailable: user.is_available ?? false,
    };
  }

  /** 获取拥有司机身份的用户（driver_id = user.id） */
  async getDriverById(id: number) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user || user.driver_status == null) {
      throw new Error('司机不存在');
    }
    const plain = user.get({ plain: true }) as unknown as Record<string, unknown>;
    return { ...plain, status: user.driver_status };
  }

  async updateDriver(
    id: number,
    data: {
      name?: string;
      avatar?: string;
      id_card?: string;
      license_plate?: string;
      vehicle_type?: string;
      phone?: string;
    }
  ) {
    const user = await User.findByPk(id);
    if (!user || user.driver_status == null) {
      throw new Error('司机不存在');
    }
    if (data.phone !== undefined) {
      const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
      if (phone && !/^1\d{10}$/.test(phone)) {
        throw new Error('请输入正确的 11 位手机号');
      }
      const trimmed = phone || null;
      if (trimmed) {
        const existing = await User.findOne({ where: { phone: trimmed } });
        if (existing && existing.id !== id) {
          throw new Error('该手机号已被其他账号使用');
        }
      }
      await user.update({ ...data, phone: trimmed || null });
    } else {
      await user.update(data);
    }
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      id_card: user.id_card,
      license_plate: user.license_plate,
      vehicle_type: user.vehicle_type,
      status: user.driver_status,
      is_available: user.is_available ?? false,
    };
  }

  async updateAvailability(id: number, is_available: boolean) {
    const user = await User.findByPk(id);
    if (!user || user.driver_status == null) {
      throw new Error('司机不存在');
    }
    if (is_available) {
      const phone = user.phone;
      if (!phone || typeof phone !== 'string' || !/^1\d{10}$/.test(phone.trim())) {
        const err = new Error('请先绑定手机号') as Error & { code?: string };
        err.code = 'NO_PHONE';
        throw err;
      }
    }
    await user.update({ is_available });
    return user;
  }

  async submitVerification(
    id: number,
    data: {
      id_card_front: string;
      id_card_back: string;
      license_plate: string;
      license_plate_photo?: string;
    }
  ) {
    const user = await User.findByPk(id);
    if (!user || user.driver_status == null) {
      throw new Error('司机不存在');
    }
    const { id_card_front, id_card_back, license_plate, license_plate_photo } = data;
    if (!id_card_front || !id_card_back || !license_plate?.trim()) {
      throw new Error('身份证正反面与车牌号为必填项');
    }
    const updates: {
      id_card_front: string;
      id_card_back: string;
      license_plate: string;
      license_plate_photo?: string;
      driver_status?: DriverStatus;
    } = {
      id_card_front,
      id_card_back,
      license_plate: license_plate.trim(),
      license_plate_photo: license_plate_photo || undefined,
    };
    if (user.driver_status === 'pending') {
      updates.driver_status = 'approved';
    } else if (user.driver_status === 'rejected') {
      updates.driver_status = 'pending';
    }
    await user.update(updates);
    return user;
  }

  async listPendingDrivers() {
    return await User.findAll({
      where: { driver_status: 'pending' },
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash'] },
    });
  }

  async approveDriver(id: number) {
    const user = await User.findByPk(id);
    if (!user || user.driver_status == null) throw new Error('司机不存在');
    await user.update({ driver_status: 'approved' });
    return user;
  }

  async rejectDriver(id: number) {
    const user = await User.findByPk(id);
    if (!user || user.driver_status == null) throw new Error('司机不存在');
    await user.update({ driver_status: 'rejected', is_available: false });
    return user;
  }

  async disableDriver(id: number) {
    return this.rejectDriver(id);
  }
}

export default new DriverService();
