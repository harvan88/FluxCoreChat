import { sql } from 'drizzle-orm';

export const up = async (db: any) => {
  // Add source column
  await db.run(sql`
    ALTER TABLE fluxcore_vector_stores
    ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'primary';
  `);
};

export const down = async (db: any) => {
  await db.run(sql`
    ALTER TABLE fluxcore_vector_stores
    DROP COLUMN source;
  `);
};
