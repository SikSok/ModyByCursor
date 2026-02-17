import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type VerificationCodeType = 'register' | 'login';

interface VerificationCodeAttributes {
  id: number;
  phone: string;
  code: string;
  type: VerificationCodeType;
  expires_at: Date;
  used: boolean;
  created_at?: Date;
}

interface VerificationCodeCreationAttributes
  extends Optional<VerificationCodeAttributes, 'id' | 'used' | 'created_at'> {}

class VerificationCode
  extends Model<VerificationCodeAttributes, VerificationCodeCreationAttributes>
  implements VerificationCodeAttributes
{
  public id!: number;
  public phone!: string;
  public code!: string;
  public type!: VerificationCodeType;
  public expires_at!: Date;
  public used!: boolean;
  public readonly created_at!: Date;
}

VerificationCode.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING(11),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('register', 'login'),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    sequelize,
    tableName: 'verification_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default VerificationCode;

