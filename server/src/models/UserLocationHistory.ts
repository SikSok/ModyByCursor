import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserLocationHistoryAttributes {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  name: string;
  created_at?: Date;
}

interface UserLocationHistoryCreationAttributes
  extends Optional<UserLocationHistoryAttributes, 'id' | 'created_at'> {}

class UserLocationHistory
  extends Model<UserLocationHistoryAttributes, UserLocationHistoryCreationAttributes>
  implements UserLocationHistoryAttributes
{
  public id!: number;
  public user_id!: number;
  public latitude!: number;
  public longitude!: number;
  public name!: string;
  public readonly created_at!: Date;
}

UserLocationHistory.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_location_history',
    timestamps: false,
  }
);

export default UserLocationHistory;
