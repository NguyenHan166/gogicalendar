import mongoose, { type HydratedDocument, type Model } from 'mongoose';

const { model, models, Schema } = mongoose;

export interface SchemaMigration {
  migrationId: string;
  checksum: string;
  appliedAt: Date;
}

export type SchemaMigrationDocument = HydratedDocument<SchemaMigration>;

export const schemaMigrationSchema = new Schema<SchemaMigration>(
  {
    migrationId: { type: String, required: true, trim: true, maxlength: 200 },
    checksum: { type: String, required: true, trim: true, maxlength: 128 },
    appliedAt: { type: Date, required: true },
  },
  {
    collection: 'schema_migrations',
    versionKey: false,
    strict: 'throw',
    autoIndex: false,
  },
);

schemaMigrationSchema.index({ migrationId: 1 }, { unique: true, name: 'uq_schema_migration_id' });

export const SchemaMigrationModel =
  (models.SchemaMigration as Model<SchemaMigration> | undefined) ??
  model<SchemaMigration>('SchemaMigration', schemaMigrationSchema);
