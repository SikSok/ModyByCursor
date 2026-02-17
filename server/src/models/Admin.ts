import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AdminAttributes {
  id: number;
  username: string;
  password_hash: string;
  name?: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'operator';
  status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

interface AdminCreationAttributes
  extends Optional<AdminAttributes, 'id' | 'name' | 'email' | 'status' | 'created_at' | 'updated_at'> {}

class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
  public id!: number;
  public username!: string;
  public password_hash!: string;
  public name?: string;
  public email?: string;
  public role!: 'super_admin' | 'admin' | 'operator';
  public status!: 'active' | 'inactive';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Admin.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
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
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'operator'),
      defaultValue: 'operator'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  },
  {
    sequelize,
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Admin;

