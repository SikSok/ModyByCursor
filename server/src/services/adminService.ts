import Admin from '../models/Admin';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { generateToken } from '../utils/jwt';

export class AdminService {
  async register(
    username: string,
    password: string,
    name?: string,
    email?: string,
    role: 'super_admin' | 'admin' | 'operator' = 'operator'
  ) {
    const existingAdmin = await Admin.findOne({ where: { username } });
    if (existingAdmin) {
      throw new Error('该用户名已被使用');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      username,
      password_hash: hashedPassword,
      name,
      email,
      role,
      status: 'active'
    });

    const token = generateToken({
      id: admin.id,
      role: admin.role
    });

    return {
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      },
      token
    };
  }

  async login(username: string, password: string) {
    // 写死：admin / 123456 允许登录（不存在则先创建）
    if (username === 'admin' && password === '123456') {
      let admin = await Admin.findOne({ where: { username: 'admin' } });
      if (!admin) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        admin = await Admin.create({
          username: 'admin',
          password_hash: hashedPassword,
          role: 'super_admin',
          status: 'active'
        });
      }
      const token = generateToken({ id: admin.id, role: admin.role });
      return {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          status: admin.status
        },
        token
      };
    }

    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      throw new Error('用户名或密码错误');
    }

    if (admin.status !== 'active') {
      throw new Error('账户已被禁用');
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      throw new Error('用户名或密码错误');
    }

    const token = generateToken({
      id: admin.id,
      role: admin.role
    });

    return {
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      },
      token
    };
  }

  async getAdminById(id: number) {
    const admin = await Admin.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!admin) {
      throw new Error('管理员不存在');
    }
    return admin;
  }

  async updateAdmin(
    id: number,
    data: {
      name?: string;
      email?: string;
      role?: 'super_admin' | 'admin' | 'operator';
      status?: 'active' | 'inactive';
    }
  ) {
    const admin = await Admin.findByPk(id);
    if (!admin) {
      throw new Error('管理员不存在');
    }

    await admin.update(data);
    return {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status
    };
  }

  async getAllAdmins() {
    return await Admin.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });
  }

  /** 数据统计面板：用户数、司机数（拥有司机身份的用户）、待审核司机数等 */
  async getStats() {
    const [totalUsers, totalDrivers, driversPending, driversApproved, driversRejected, totalAdmins] =
      await Promise.all([
        User.count(),
        User.count({ where: { driver_status: { [Op.ne]: null } } }),
        User.count({ where: { driver_status: 'pending' } }),
        User.count({ where: { driver_status: 'approved' } }),
        User.count({ where: { driver_status: 'rejected' } }),
        Admin.count()
      ]);

    return {
      totalUsers,
      totalDrivers,
      driversPending,
      driversApproved,
      driversRejected,
      totalAdmins
    };
  }
}

export default new AdminService();

