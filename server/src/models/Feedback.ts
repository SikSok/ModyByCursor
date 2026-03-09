import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type FeedbackSource = 'app' | 'website';
export type FeedbackType = 'suggestion' | 'experience' | 'report';
export type FeedbackStatus = 'pending' | 'replied' | 'closed';

export interface FeedbackAttributes {
  id: number;
  source: FeedbackSource;
  user_id: number | null;
  type: FeedbackType;
  content: string;
  contact: string | null;
  reported_user_info: string | null;
  status: FeedbackStatus;
  admin_reply: string | null;
  replied_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface FeedbackCreationAttributes
  extends Optional<
    FeedbackAttributes,
    | 'id'
    | 'user_id'
    | 'contact'
    | 'reported_user_info'
    | 'admin_reply'
    | 'replied_at'
    | 'created_at'
    | 'updated_at'
  > {}

class Feedback
  extends Model<FeedbackAttributes, FeedbackCreationAttributes>
  implements FeedbackAttributes
{
  public id!: number;
  public source!: FeedbackSource;
  public user_id!: number | null;
  public type!: FeedbackType;
  public content!: string;
  public contact!: string | null;
  public reported_user_info!: string | null;
  public status!: FeedbackStatus;
  public admin_reply!: string | null;
  public replied_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Feedback.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    source: {
      type: DataTypes.ENUM('app', 'website'),
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('suggestion', 'experience', 'report'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    reported_user_info: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'replied', 'closed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    admin_reply: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    replied_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'feedback',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Feedback;
