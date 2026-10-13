import { model, Schema, type InferSchemaType } from 'mongoose';

const translationSchema = new Schema(
  {
    locale: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { timestamps: true },
);

// One value per key per locale; also serves the "all keys for a locale" query.
translationSchema.index({ locale: 1, key: 1 }, { unique: true });

export type Translation = InferSchemaType<typeof translationSchema>;

export const TranslationModel = model('Translation', translationSchema);
