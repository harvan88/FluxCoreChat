import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { scheduleService } from '../services/schedule.service';

export const schedulesRoutes = new Elysia({ prefix: '/schedules' })
  .use(authMiddleware)
  .get(
    '/:ownerType/:ownerId',
    async ({ params, set }) => {
      try {
        const schedule = await scheduleService.getSchedule(params.ownerType, params.ownerId);
        return { success: true, data: schedule };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        ownerType: t.String(),
        ownerId: t.String(),
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Get complete schedule for an owner',
      },
    }
  )
  .delete(
    '/:ownerType/:ownerId',
    async ({ params, set }) => {
      try {
        await scheduleService.deleteSchedulesForOwner(params.ownerType, params.ownerId);
        return { success: true };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        ownerType: t.String(),
        ownerId: t.String(),
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Delete all schedules for an owner',
      },
    }
  )
  .post(
    '/:ownerType/:ownerId/weekly',
    async ({ params, body, set }) => {
      try {
        await scheduleService.upsertWeeklySchedule(params.ownerType, params.ownerId, body.days);
        return { success: true };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        ownerType: t.String(),
        ownerId: t.String(),
      }),
      body: t.Object({
        days: t.Array(t.Object({
          dayOfWeek: t.Number(),
          isClosed: t.Boolean()
        }))
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Update weekly open/closed status',
      },
    }
  )
  .post(
    '/:ownerType/:ownerId/weekly/:dayOfWeek/intervals',
    async ({ params, body, set }) => {
      try {
        await scheduleService.replaceWeeklyIntervals(
          params.ownerType, 
          params.ownerId, 
          Number(params.dayOfWeek), 
          body.intervals
        );
        return { success: true };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        ownerType: t.String(),
        ownerId: t.String(),
        dayOfWeek: t.String()
      }),
      body: t.Object({
        intervals: t.Array(t.Object({
          openTime: t.String(),
          closeTime: t.String()
        }))
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Replace intervals for a weekly day',
      },
    }
  )
  .post(
    '/:ownerType/:ownerId/special',
    async ({ params, body, set }) => {
      try {
        const specialDate = await scheduleService.upsertSpecialDate(
          params.ownerType, 
          params.ownerId, 
          body as any
        );
        return { success: true, data: specialDate };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        ownerType: t.String(),
        ownerId: t.String(),
      }),
      body: t.Object({
        id: t.Optional(t.String()),
        date: t.String(),
        isClosed: t.Boolean(),
        label: t.Optional(t.Nullable(t.String())),
        intervals: t.Optional(t.Array(t.Object({
          openTime: t.String(),
          closeTime: t.String()
        })))
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Add or update a special date exception',
      },
    }
  )
  .delete(
    '/special/:specialDateId',
    async ({ params, set }) => {
      try {
        await scheduleService.deleteSpecialDate(params.specialDateId);
        return { success: true };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        specialDateId: t.String(),
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Delete a special date exception',
      },
    }
  )
  .get(
    '/:ownerType/:ownerId/is-open',
    async ({ params, query, set }) => {
      try {
        const atDate = query.at ? new Date(query.at) : undefined;
        const result = await scheduleService.isBusinessOpen(
          params.ownerType, 
          params.ownerId, 
          atDate
        );
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        ownerType: t.String(),
        ownerId: t.String(),
      }),
      query: t.Object({
        at: t.Optional(t.String()) // ISO string to check a specific time
      }),
      detail: {
        tags: ['Schedules'],
        summary: 'Check if an owner is open at a given time',
      },
    }
  );
