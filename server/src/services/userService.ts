import { Op } from 'sequelize';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

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
      const err = new Error('该手机号未注册，请先注册') as AppError;
      err.statusCode = 404;
      throw err;
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

