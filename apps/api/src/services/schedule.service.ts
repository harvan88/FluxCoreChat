import { 
  db, 
  weeklySchedules, 
  weeklyIntervals, 
  specialDates, 
  specialIntervals,
  accountLocations,
  accounts
} from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import type { 
  WeeklySchedule, 
  NewWeeklySchedule, 
  WeeklyInterval, 
  NewWeeklyInterval,
  SpecialDate,
  NewSpecialDate,
  SpecialInterval,
  NewSpecialInterval
} from '@fluxcore/db';

export class ScheduleService {
  /**
   * Get complete schedule for an owner
   */
  async getSchedule(ownerType: string, ownerId: string) {
    const weekly = await db
      .select()
      .from(weeklySchedules)
      .where(and(
        eq(weeklySchedules.ownerType, ownerType),
        eq(weeklySchedules.ownerId, ownerId)
      ));

    const intervals = await db
      .select()
      .from(weeklyIntervals)
      .where(and(
        eq(weeklyIntervals.ownerType, ownerType),
        eq(weeklyIntervals.ownerId, ownerId)
      ));

    const special = await db
      .select()
      .from(specialDates)
      .where(and(
        eq(specialDates.ownerType, ownerType),
        eq(specialDates.ownerId, ownerId)
      ));

    // Get intervals for special dates
    const specialWithIntervals = await Promise.all(
      special.map(async (sd) => {
        const sIntervals = await db
          .select()
          .from(specialIntervals)
          .where(eq(specialIntervals.specialDateId, sd.id));
        return { ...sd, intervals: sIntervals };
      })
    );

    return {
      weekly,
      intervals,
      special: specialWithIntervals
    };
  }

  /**
   * Upsert weekly schedule (batch)
   */
  async upsertWeeklySchedule(ownerType: string, ownerId: string, days: NewWeeklySchedule[]) {
    return await db.transaction(async (tx) => {
      for (const day of days) {
        await tx
          .insert(weeklySchedules)
          .values({ ...day, ownerType, ownerId })
          .onConflictDoUpdate({
            target: [weeklySchedules.ownerType, weeklySchedules.ownerId, weeklySchedules.dayOfWeek],
            set: { isClosed: day.isClosed }
          });
      }
    });
  }

  /**
   * Replace intervals for a specific day
   */
  async replaceWeeklyIntervals(ownerType: string, ownerId: string, dayOfWeek: number, intervals: { openTime: string, closeTime: string }[]) {
    return await db.transaction(async (tx) => {
      // 1. Delete existing
      await tx
        .delete(weeklyIntervals)
        .where(and(
          eq(weeklyIntervals.ownerType, ownerType),
          eq(weeklyIntervals.ownerId, ownerId),
          eq(weeklyIntervals.dayOfWeek, dayOfWeek)
        ));

      // 2. Insert new
      if (intervals.length > 0) {
        await tx
          .insert(weeklyIntervals)
          .values(intervals.map(i => ({
            ownerType,
            ownerId,
            dayOfWeek,
            openTime: i.openTime,
            closeTime: i.closeTime
          })));
      }
    });
  }

  /**
   * Add or update special date
   */
  async upsertSpecialDate(ownerType: string, ownerId: string, data: NewSpecialDate & { intervals?: { openTime: string, closeTime: string }[] }) {
    return await db.transaction(async (tx) => {
      // 1. Upsert the date
      const [sd] = await tx
        .insert(specialDates)
        .values({ ...data, ownerType, ownerId })
        .onConflictDoUpdate({
          target: [specialDates.ownerType, specialDates.ownerId, specialDates.date],
          set: { 
            isClosed: data.isClosed,
            label: data.label
          }
        })
        .returning();

      // 2. Replace intervals if provided
      if (data.intervals) {
        await tx
          .delete(specialIntervals)
          .where(eq(specialIntervals.specialDateId, sd.id));
        
        if (data.intervals.length > 0) {
          await tx
            .insert(specialIntervals)
            .values(data.intervals.map(i => ({
              specialDateId: sd.id,
              openTime: i.openTime,
              closeTime: i.closeTime
            })));
        }
      }

      return sd;
    });
  }

  /**
   * Remove special date
   */
  async deleteSpecialDate(specialDateId: string) {
    await db.delete(specialDates).where(eq(specialDates.id, specialDateId));
  }

  /**
   * Determine if a business is open at a given time
   */
  async isBusinessOpen(ownerType: string, ownerId: string, now?: Date) {
    // 1. Get Timezone (SSOT)
    let timezone = 'UTC';
    let manualStatus = 'active';

    if (ownerType === 'location') {
      const [location] = await db
        .select({ 
          status: accountLocations.status,
          timezone: accounts.timezone 
        })
        .from(accountLocations)
        .innerJoin(accounts, eq(accountLocations.accountId, accounts.id))
        .where(eq(accountLocations.id, ownerId))
        .limit(1);

      if (location) {
        timezone = location.timezone || 'UTC';
        manualStatus = location.status || 'active';
      }
    } else {
      // For other types, we might need a different lookup
      // Default to UTC for now
    }

    // 2. Check Manual Status (Priority 1)
    if (manualStatus === 'temp_closed' || manualStatus === 'perm_closed') {
      return { isOpen: false, reason: 'manual_closed', status: manualStatus };
    }

    // 2.5 Load all weekly schedules to check if any exist AND avoid redundant queries later
    const allWeeklyDays = await db.select()
      .from(weeklySchedules)
      .where(and(
        eq(weeklySchedules.ownerType, ownerType),
        eq(weeklySchedules.ownerId, ownerId)
      ));

    if (allWeeklyDays.length === 0) {
      return { isOpen: undefined as unknown as boolean, reason: 'no_schedule_configured' };
    }

    // 3. Resolve Current Time in Local Timezone
    const localNow = now 
      ? DateTime.fromJSDate(now).setZone(timezone)
      : DateTime.now().setZone(timezone);
    
    const currentDateStr = localNow.toISODate(); // 'YYYY-MM-DD'
    const currentTimeStr = localNow.toFormat('HH:mm:ss');
    const currentDayOfWeek = localNow.weekday % 7; // Luxon: 1=Mon, 7=Sun. DB: 0=Sun, 6=Sat.

    // 4. Check Special Dates (Priority 2)
    const [specialDate] = await db
      .select()
      .from(specialDates)
      .where(and(
        eq(specialDates.ownerType, ownerType),
        eq(specialDates.ownerId, ownerId),
        eq(specialDates.date, currentDateStr!)
      ))
      .limit(1);

    if (specialDate) {
      if (specialDate.isClosed) {
        return { isOpen: false, reason: 'special_date_closed', label: specialDate.label };
      }

      // If not explicitly closed, check intervals for this special date
      const intervals = await db
        .select()
        .from(specialIntervals)
        .where(eq(specialIntervals.specialDateId, specialDate.id));
      
      const isOpen = intervals.some(interval => 
        currentTimeStr >= interval.openTime && currentTimeStr < interval.closeTime
      );

      return { 
        isOpen, 
        reason: isOpen ? 'open' : 'special_date_interval_closed', 
        label: specialDate.label 
      };
    }

    // 5. Check Weekly Schedule (Priority 3)
    const weeklyDay = allWeeklyDays.find(d => d.dayOfWeek === currentDayOfWeek);

    if (weeklyDay?.isClosed) {
      return { isOpen: false, reason: 'weekly_closed' };
    }

    // 6. Check Weekly Intervals (Priority 4)
    const intervals = await db
      .select()
      .from(weeklyIntervals)
      .where(and(
        eq(weeklyIntervals.ownerType, ownerType),
        eq(weeklyIntervals.ownerId, ownerId),
        eq(weeklyIntervals.dayOfWeek, currentDayOfWeek)
      ));

    if (intervals.length === 0) {
      // If no intervals defined for a day that isn't explicitly closed, 
      // we assume closed unless it's a 24h business (but here we require intervals)
      return { isOpen: false, reason: 'no_intervals' };
    }

    const isOpen = intervals.some(interval => 
      currentTimeStr >= interval.openTime && currentTimeStr < interval.closeTime
    );

    return { 
      isOpen, 
      reason: isOpen ? 'open' : 'interval_closed'
    };
  }

  /**
   * Cleanup all schedules for an owner (called on owner deletion)
   */
  async deleteSchedulesForOwner(ownerType: string, ownerId: string) {
    await db.transaction(async (tx) => {
      await tx.delete(weeklySchedules).where(and(eq(weeklySchedules.ownerType, ownerType), eq(weeklySchedules.ownerId, ownerId)));
      await tx.delete(weeklyIntervals).where(and(eq(weeklyIntervals.ownerType, ownerType), eq(weeklyIntervals.ownerId, ownerId)));
      
      const special = await tx.select({ id: specialDates.id }).from(specialDates).where(and(eq(specialDates.ownerType, ownerType), eq(specialDates.ownerId, ownerId)));
      for (const sd of special) {
        await tx.delete(specialIntervals).where(eq(specialIntervals.specialDateId, sd.id));
      }
      await tx.delete(specialDates).where(and(eq(specialDates.ownerType, ownerType), eq(specialDates.ownerId, ownerId)));
    });
  }
  /**
   * Generates a human-readable summary of all schedules for an account.
   * Useful for RAG template content.
   */
  /**
   * Generates a human-readable summary of all schedules for an account.
   * Optimized for human readability in RAG templates.
   */
  async getScheduleSummary(accountId: string): Promise<string> {
    const locations = await db
      .select({ 
        id: accountLocations.id, 
        name: accountLocations.name, 
        address: accountLocations.address,
        streetAddress: accountLocations.streetAddress,
        neighborhood: accountLocations.neighborhood,
        city: accountLocations.city,
        postalCode: accountLocations.postalCode
      })
      .from(accountLocations)
      .where(and(
        eq(accountLocations.accountId, accountId),
        eq(accountLocations.status, 'active')
      ));

    if (locations.length === 0) return 'No hay sedes activas configuradas.';

    const summaries = await Promise.all(locations.map(async (loc) => {
      const sched = await this.getSchedule('location', loc.id);
      const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      // 1. Format Address
      let addressLine = loc.streetAddress || loc.address;
      const addressParts = [];
      if (loc.neighborhood) addressParts.push(loc.neighborhood);
      if (loc.city) addressParts.push(loc.city);
      if (loc.postalCode) addressParts.push(`(${loc.postalCode})`);
      
      const fullAddressLine = addressParts.length > 0 
        ? `${addressLine}, ${addressParts.join(', ')}`
        : addressLine;

      const lines = [
        `Sede ${loc.name}`,
        fullAddressLine || 'Dirección no disponible',
        ''
      ];

      // 2. Weekly Schedule Grouping
      lines.push('Horario habitual:');
      const dailySchedules: string[] = [];
      for (let i = 0; i < 7; i++) {
        const day = sched.weekly.find(d => d.dayOfWeek === i);
        if (day?.isClosed) {
          dailySchedules.push('Cerrado');
        } else {
          const intervals = sched.intervals.filter(int => int.dayOfWeek === i);
          dailySchedules.push(intervals.length > 0 
            ? intervals.map(t => `${t.openTime.slice(0, 5)} a ${t.closeTime.slice(0, 5)}`).join(', ')
            : 'Cerrado');
        }
      }

      // Dynamic Grouping
      const groups: { days: number[], schedule: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const currentSchedule = dailySchedules[i];
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.schedule === currentSchedule) {
          lastGroup.days.push(i);
        } else {
          groups.push({ days: [i], schedule: currentSchedule });
        }
      }

      groups.forEach(group => {
        const dayNames = group.days.map(d => daysMap[d]);
        let dayRange = '';
        if (group.days.length === 1) {
          dayRange = dayNames[0];
        } else if (group.days.length === group.days[group.days.length - 1] - group.days[0] + 1) {
          // Consecutive
          dayRange = `${dayNames[0]} a ${dayNames[dayNames.length - 1]}`;
        } else {
          // Non-consecutive
          dayRange = dayNames.join(', ');
        }
        lines.push(`${dayRange}: ${group.schedule}`);
      });

      // 3. Special Dates
      if (sched.special.length > 0) {
        lines.push('');
        lines.push('Fecha especial:');
        sched.special.forEach(s => {
          let status = s.isClosed ? 'Cerrado' : 'Abierto';
          if (!s.isClosed && s.intervals && s.intervals.length > 0) {
            status = s.intervals.map(i => `${i.openTime.slice(0, 5)} a ${i.closeTime.slice(0, 5)}`).join(', ');
          }
          
          // Format date to "Día Mes"
          const dateObj = DateTime.fromISO(s.date);
          const dateFormatted = dateObj.isValid ? dateObj.setLocale('es').toFormat('d \'de\' MMMM') : s.date;
          
          lines.push(`${s.label || 'Feriado'} (${dateFormatted}): ${status}`);
        });
      }

      return lines.join('\n');
    }));

    return summaries.join('\n\n');
  }
}

export const scheduleService = new ScheduleService();
