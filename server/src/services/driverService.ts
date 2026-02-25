import Driver from '../models/Driver';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

export class DriverService {
  async register(
    phone: string,
    password: string,
    name: string,
    id_card?: string,
    license_plate?: string,
    vehicle_type?: string
  ) {
    const existingDriver = await Driver.findOne({ where: { phone } });
    if (existingDriver) {
      throw new Error('该手机号已被注册');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const driver = await Driver.create({
      phone,
      password_hash: hashedPassword,
      name,
      id_card,
      license_plate,
      vehicle_type,
      status: 'pending',
      is_available: false
    });

    const token = generateToken({
      id: driver.id,
      role: 'driver'
    });

    return {
      driver: {
        id: driver.id,
        phone: driver.phone,
        name: driver.name,
        avatar: driver.avatar,
        id_card: driver.id_card,
        license_plate: driver.license_plate,
        vehicle_type: driver.vehicle_type,
        status: driver.status
      },
      token
    };
  }

  async login(phone: string, password: string) {
    const driver = await Driver.findOne({ where: { phone } });
    if (!driver) {
      throw new Error('手机号或密码错误');
    }

    const isValidPassword = await bcrypt.compare(password, driver.password_hash);
    if (!isValidPassword) {
      throw new Error('手机号或密码错误');
    }

    const token = generateToken({
      id: driver.id,
      role: 'driver'
    });

    return {
      driver: {
        id: driver.id,
        phone: driver.phone,
        name: driver.name,
        avatar: driver.avatar,
        id_card: driver.id_card,
        license_plate: driver.license_plate,
        vehicle_type: driver.vehicle_type,
        status: driver.status,
        is_available: driver.is_available
      },
      token
    };
  }

  async getDriverById(id: number) {
    const driver = await Driver.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!driver) {
      throw new Error('司机不存在');
    }
    return driver;
  }

  async updateDriver(
    id: number,
    data: {
      name?: string;
      avatar?: string;
      id_card?: string;
      license_plate?: string;
      vehicle_type?: string;
    }
  ) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error('司机不存在');
    }

    await driver.update(data);
    return {
      id: driver.id,
      phone: driver.phone,
      name: driver.name,
      avatar: driver.avatar,
      id_card: driver.id_card,
      license_plate: driver.license_plate,
      vehicle_type: driver.vehicle_type,
      status: driver.status,
      is_available: driver.is_available
    };
  }

  async updateAvailability(id: number, is_available: boolean) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error('司机不存在');
    }
    if (is_available && driver.status !== 'approved') {
      const err = new Error(
        driver.status === 'rejected' ? '已被禁用，请重新认证' : '请先完成身份认证'
      ) as Error & { code?: string };
      err.code = 'DRIVER_NOT_VERIFIED';
      throw err;
    }

    await driver.update({ is_available });
    return driver;
  }

  /** 提交身份认证材料。首次（status=pending）自动通过；二次（status=rejected/曾被禁用）设为 pending 待审核 */
  async submitVerification(
    id: number,
    data: {
      id_card_front: string;
      id_card_back: string;
      license_plate: string;
      license_plate_photo?: string;
    }
  ) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error('司机不存在');
    }
    const { id_card_front, id_card_back, license_plate, license_plate_photo } = data;
    if (!id_card_front || !id_card_back || !license_plate || !license_plate.trim()) {
      throw new Error('身份证正反面与车牌号为必填项');
    }

    const updates: {
      id_card_front: string;
      id_card_back: string;
      license_plate: string;
      license_plate_photo?: string;
      status?: 'pending' | 'approved';
    } = {
      id_card_front,
      id_card_back,
      license_plate: license_plate.trim(),
      license_plate_photo: license_plate_photo || undefined,
    };

    if (driver.status === 'pending') {
      updates.status = 'approved';
    } else if (driver.status === 'rejected') {
      updates.status = 'pending';
    }

    await driver.update(updates);
    return driver;
  }

  async listPendingDrivers() {
    return await Driver.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'DESC']]
    });
  }

  async approveDriver(id: number) {
    const driver = await Driver.findByPk(id);
    if (!driver) throw new Error('司机不存在');
    await driver.update({ status: 'approved' });
    return driver;
  }

  async rejectDriver(id: number) {
    const driver = await Driver.findByPk(id);
    if (!driver) throw new Error('司机不存在');
    await driver.update({ status: 'rejected', is_available: false });
    return driver;
  }

  /** 管理台禁用司机（与驳回效果一致：status=rejected，不可接单） */
  async disableDriver(id: number) {
    return this.rejectDriver(id);
  }
}

export default new DriverService();

