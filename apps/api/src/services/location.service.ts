import { db, accountLocations } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';
import type { AccountLocation, NewAccountLocation } from '@fluxcore/db';
import { scheduleService } from './schedule.service';

export class LocationService {
  /**
   * Get all locations for an account
   */
  async getLocationsByAccountId(accountId: string): Promise<AccountLocation[]> {
    return await db
      .select()
      .from(accountLocations)
      .where(eq(accountLocations.accountId, accountId))
      .orderBy(desc(accountLocations.isDefault), accountLocations.name);
  }

  /**
   * Get a specific location
   */
  async getLocationById(locationId: string): Promise<AccountLocation | null> {
    const [location] = await db
      .select()
      .from(accountLocations)
      .where(eq(accountLocations.id, locationId))
      .limit(1);
    
    return location || null;
  }

  /**
   * Create a new location
   */
  async createLocation(data: NewAccountLocation): Promise<AccountLocation> {
    // If this is the default location, unset any other default location
    if (data.isDefault) {
      await this.unsetDefaultLocation(data.accountId);
    }

    const [location] = await db
      .insert(accountLocations)
      .values(data)
      .returning();
    
    return location;
  }

  /**
   * Update a location
   */
  async updateLocation(locationId: string, accountId: string, data: Partial<NewAccountLocation>): Promise<AccountLocation> {
    console.log(`[DB_DEBUG] Actualizando sede ${locationId}:`, JSON.stringify(data, null, 2));
    // If setting as default, unset others
    if (data.isDefault) {
      await this.unsetDefaultLocation(accountId);
    }

    const [updated] = await db
      .update(accountLocations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(accountLocations.id, locationId),
        eq(accountLocations.accountId, accountId)
      ))
      .returning();

    if (!updated) {
      throw new Error('Location not found or unauthorized');
    }

    return updated;
  }

  /**
   * Delete a location
   */
  async deleteLocation(locationId: string, accountId: string): Promise<void> {
    // 1. Cleanup schedules
    await scheduleService.deleteSchedulesForOwner('location', locationId);

    // 2. Delete location
    await db
      .delete(accountLocations)
      .where(and(
        eq(accountLocations.id, locationId),
        eq(accountLocations.accountId, accountId)
      ));
  }

  /**
   * Helper to ensure only one location is marked as default
   */
  private async unsetDefaultLocation(accountId: string): Promise<void> {
    await db
      .update(accountLocations)
      .set({ isDefault: false })
      .where(and(
        eq(accountLocations.accountId, accountId),
        eq(accountLocations.isDefault, true)
      ));
  }
}

export const locationService = new LocationService();
