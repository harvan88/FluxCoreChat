import { pgTable, uuid, varchar, timestamp, text, real, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const accountLocations = pgTable('account_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),

  // Identificación
  name: varchar('name', { length: 255 }).notNull(),       // "Sede Central", "Sucursal Norte"
  address: text('address'),                                 // Dirección completa legible
  country: varchar('country', { length: 100 }),            // País
  state: varchar('state', { length: 100 }),              // Provincia / Estado
  city: varchar('city', { length: 100 }),               // Ciudad
  neighborhood: varchar('neighborhood', { length: 100 }),   // Barrio
  streetAddress: text('street_address'),                  // Calle y número
  postalCode: varchar('postal_code', { length: 50 }),     // Código postal
  
  // Coordenadas (sin PostGIS — Haversine en app)
  lat: real('lat'),
  lon: real('lon'),

  // Servicio
  serviceType: varchar('service_type', { length: 20 })     // 'delivery' | 'pickup' | 'both' | 'online_only'
    .default('both'),
  coverageRadiusKm: real('coverage_radius_km'),            // Comportamiento según serviceType

  // Contacto por sede
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),

  // Estado
  status: varchar('status', { length: 20 })
    .default('active'),                                     // 'active' | 'temp_closed' | 'perm_closed'
  isDefault: boolean('is_default').default(false),          // Para escenario "un solo local"

  // Extensible
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('idx_account_locations_account').on(table.accountId),
  statusIdx: index('idx_account_locations_status').on(table.status),
}));

export type AccountLocation = typeof accountLocations.$inferSelect;
export type NewAccountLocation = typeof accountLocations.$inferInsert;
