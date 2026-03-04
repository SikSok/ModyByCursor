import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface DriverLocationAttributes {
  id: number;
  driver_id: number;
  latitude: string;
  longitude: string;
  accuracy?: string;
  created_at?: Date;
}

interface DriverLocationCreationAttributes
  extends Optional<DriverLocationAttributes, 'id' | 'accuracy' | 'created_at'> {}

class DriverLocation
  extends Model<DriverLocationAttributes, DriverLocationCreationAttributes>
  implements DriverLocationAttributes
{
  public id!: number;
  public driver_id!: number;
  public latitude!: string;
  public longitude!: string;
  public accuracy?: string;
  public readonly created_at!: Date;
}

DriverLocation.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    driver_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    accuracy: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'driver_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

DriverLocation.belongsTo(User, { foreignKey: 'driver_id' });

export default DriverLocation;

