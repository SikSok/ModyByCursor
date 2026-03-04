import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface DriverNotificationAttributes {
  id: number;
  driver_id: number;
  passenger_id: number | null;
  type: string;
  content: string;
  created_at?: Date;
  delivered: boolean;
  read: boolean;
}

interface DriverNotificationCreationAttributes
  extends Optional<
    DriverNotificationAttributes,
    'id' | 'passenger_id' | 'created_at' | 'delivered' | 'read'
  > {}

class DriverNotification
  extends Model<DriverNotificationAttributes, DriverNotificationCreationAttributes>
  implements DriverNotificationAttributes
{
  public id!: number;
  public driver_id!: number;
  public passenger_id!: number | null;
  public type!: string;
  public content!: string;
  public readonly created_at!: Date;
  public delivered!: boolean;
  public read!: boolean;
}

DriverNotification.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    passenger_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'contact',
    },
    content: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    delivered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'driver_notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default DriverNotification;
