import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type DriverStatus = 'pending' | 'approved' | 'rejected';

interface UserAttributes {
  id: number;
  phone: string | null;
  password_hash: string;
  name?: string;
  avatar?: string;
  status: 0 | 1;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_location_name?: string | null;
  last_location_updated_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  wechat_unionid?: string | null;
  wechat_openid?: string | null;
  // 司机身份相关（非司机用户为 NULL）
  driver_status?: DriverStatus | null;
  is_available?: boolean | null;
  id_card?: string | null;
  id_card_front?: string | null;
  id_card_back?: string | null;
  license_plate?: string | null;
  license_plate_photo?: string | null;
  vehicle_type?: string | null;
  last_location_id?: number | null;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'name'
    | 'avatar'
    | 'status'
    | 'phone'
    | 'last_latitude'
    | 'last_longitude'
    | 'last_location_name'
    | 'last_location_updated_at'
    | 'created_at'
    | 'updated_at'
    | 'wechat_unionid'
    | 'wechat_openid'
    | 'driver_status'
    | 'is_available'
    | 'id_card'
    | 'id_card_front'
    | 'id_card_back'
    | 'license_plate'
    | 'license_plate_photo'
    | 'vehicle_type'
    | 'last_location_id'
  > {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public phone!: string | null;
  public password_hash!: string;
  public name?: string;
  public avatar?: string;
  public status!: 0 | 1;
  public last_latitude?: number | null;
  public last_longitude?: number | null;
  public last_location_name?: string | null;
  public last_location_updated_at?: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public wechat_unionid?: string | null;
  public wechat_openid?: string | null;
  public driver_status?: DriverStatus | null;
  public is_available?: boolean | null;
  public id_card?: string | null;
  public id_card_front?: string | null;
  public id_card_back?: string | null;
  public license_plate?: string | null;
  public license_plate_photo?: string | null;
  public vehicle_type?: string | null;
  public last_location_id?: number | null;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING(11),
      allowNull: true,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    last_latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    last_longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    last_location_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    last_location_updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    driver_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    id_card: {
      type: DataTypes.STRING(18),
      allowNull: true
    },
    id_card_front: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    id_card_back: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    license_plate: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    license_plate_photo: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    vehicle_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    last_location_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    wechat_unionid: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    wechat_openid: {
      type: DataTypes.STRING(64),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default User;

