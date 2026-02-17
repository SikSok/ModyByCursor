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

    if (driver.status !== 'approved') {
      throw new Error('司机未通过审核');
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

    await driver.update({ is_available });
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
}

export default new DriverService();

