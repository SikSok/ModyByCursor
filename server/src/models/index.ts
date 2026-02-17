/**
 * 统一加载所有模型，确保 Sequelize.sync() 能创建全部表。
 * 加载顺序：先 Driver（被 DriverLocation 依赖），再 DriverLocation，其余任意。
 */
import Admin from './Admin';
import User from './User';
import Driver from './Driver';
import DriverLocation from './DriverLocation';
import VerificationCode from './VerificationCode';

export { Admin, User, Driver, DriverLocation, VerificationCode };
