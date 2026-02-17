import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DriverAttributes {
  id: number;
  phone: string;
  password_hash: string;
  name: string;
  avatar?: string;
  id_card?: string;
  license_plate?: string;
  vehicle_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_available: boolean;
  last_location_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

interface DriverCreationAttributes
  extends Optional<
    DriverAttributes,
    | 'id'
    | 'avatar'
    | 'id_card'
    | 'license_plate'
    | 'vehicle_type'
    | 'status'
    | 'is_available'
    | 'last_location_id'
    | 'created_at'
    | 'updated_at'
  > {}

class Driver extends Model<DriverAttributes, DriverCreationAttributes> implements DriverAttributes {
  public id!: number;
  public phone!: string;
  public password_hash!: string;
  public name!: string;
  public avatar?: string;
  public id_card?: string;
  public license_plate?: string;
  public vehicle_type?: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public is_available!: boolean;
  public last_location_id?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Driver.init(
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
      allowNull: false
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    id_card: {
      type: DataTypes.STRING(18),
      allowNull: true
    },
    license_plate: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    vehicle_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    last_location_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'drivers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Driver;

