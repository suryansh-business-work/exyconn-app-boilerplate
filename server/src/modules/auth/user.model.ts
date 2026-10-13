import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ROLES } from '@common/types';
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from '@common/validators';

export const USER_STATUS = { active: 'active', disabled: 'disabled' } as const;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: EMAIL_MAX_LENGTH,
    },
    name: { type: String, required: true, trim: true, maxlength: NAME_MAX_LENGTH },
    passwordHash: { type: String, required: true },
    roles: { type: [String], required: true, default: () => [ROLES.user] },
    status: {
      type: String,
      required: true,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.active,
    },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
