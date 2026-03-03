import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserAttributes {
  id: number;
  phone: string;
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
}

interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'name' | 'avatar' | 'status' | 'last_latitude' | 'last_longitude' | 'last_location_name' | 'last_location_updated_at' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public phone!: string;
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
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
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

