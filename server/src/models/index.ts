/**
 * 统一加载所有模型，确保 Sequelize.sync() 能创建全部表。
 * driver_id 在 driver_locations、driver_notifications 中均指向 users.id（拥有司机身份的用户）。
 */
import Admin from './Admin';
import User from './User';
import UserLocationHistory from './UserLocationHistory';
import DriverLocation from './DriverLocation';
import DriverNotification from './DriverNotification';
import VerificationCode from './VerificationCode';
import Feedback from './Feedback';

export { Admin, User, UserLocationHistory, DriverLocation, DriverNotification, VerificationCode, Feedback };

User.hasMany(DriverLocation, { foreignKey: 'driver_id' });
User.hasMany(Feedback, { foreignKey: 'user_id' });
