import { sql } from 'drizzle-orm';

export const up = async (db: any) => {
  // Add source column
  await db.run(sql`
    ALTER TABLE fluxcore_vector_stores
    ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'primary';
  `);

  // Update existing records
  await db.run(sql`
    UPDATE fluxcore_vector_stores
    SET source = 'cache'
    WHERE backend = 'openai';
  `);

  // Remove redundant columns
  await db.run(sql`
    ALTER TABLE fluxcore_vector_stores
    DROP COLUMN file_count,
    DROP COLUMN size_bytes;
  `);
};

export const down = async (db: any) => {
  // Add back the columns
  await db.run(sql`
    ALTER TABLE fluxcore_vector_stores
    ADD COLUMN file_count INTEGER DEFAULT 0,
    ADD COLUMN size_bytes INTEGER DEFAULT 0;
  `);

  // We cannot revert the source update easily, so we leave it
  await db.run(sql`
    ALTER TABLE fluxcore_vector_stores
    DROP COLUMN source;
  `);
};
