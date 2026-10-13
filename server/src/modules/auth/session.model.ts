import { model, Schema, type InferSchemaType } from 'mongoose';

export const USER_AGENT_MAX_LENGTH = 200;

/** One signed-in device. Holds the hash of its current refresh token, never the token itself. */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    // MongoDB deletes the session automatically once this time has passed.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, maxlength: USER_AGENT_MAX_LENGTH },
  },
  { timestamps: true },
);

export type Session = InferSchemaType<typeof sessionSchema>;

export const SessionModel = model('Session', sessionSchema);
