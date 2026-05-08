import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { locationService } from '../services/location.service';
import type { NewAccountLocation } from '@fluxcore/db';

export const locationsRoutes = new Elysia({ prefix: '/locations' })
  .use(authMiddleware)
  .get(
    '/:accountId',
    async ({ params, set }) => {
      try {
        const locations = await locationService.getLocationsByAccountId(params.accountId);
        return { success: true, data: locations };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['Locations'],
        summary: 'Get all locations for an account',
      },
    }
  )
  .post(
    '/:accountId',
    async ({ params, body, set }) => {
      try {
        const locationData: NewAccountLocation = {
          ...body,
          accountId: params.accountId,
        } as NewAccountLocation;

        const location = await locationService.createLocation(locationData);
        set.status = 201;
        return { success: true, data: location };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        address: t.Optional(t.Nullable(t.String())),
        country: t.Optional(t.Nullable(t.String())),
        state: t.Optional(t.Nullable(t.String())),
        city: t.Optional(t.Nullable(t.String())),
        neighborhood: t.Optional(t.Nullable(t.String())),
        streetAddress: t.Optional(t.Nullable(t.String())),
        postalCode: t.Optional(t.Nullable(t.String())),
        lat: t.Optional(t.Nullable(t.Number())),
        lon: t.Optional(t.Nullable(t.Number())),
        serviceType: t.Optional(t.String({ default: 'both' })),
        coverageRadiusKm: t.Optional(t.Nullable(t.Number())),
        phone: t.Optional(t.Nullable(t.String())),
        email: t.Optional(t.Nullable(t.String())),
        timezone: t.Optional(t.Nullable(t.String())),
        status: t.Optional(t.String({ default: 'active' })),
        isDefault: t.Optional(t.Boolean({ default: false })),
        metadata: t.Optional(t.Any()),
      }),
      detail: {
        tags: ['Locations'],
        summary: 'Create a new location',
      },
    }
  )
  .patch(
    '/:accountId/:locationId',
    async ({ params, body, set }) => {
      try {
        const location = await locationService.updateLocation(
          params.locationId,
          params.accountId,
          body as Partial<NewAccountLocation>
        );
        return { success: true, data: location };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
        locationId: t.String(),
      }),
      body: t.Partial(t.Object({
        name: t.String(),
        address: t.Nullable(t.String()),
        country: t.Nullable(t.String()),
        state: t.Nullable(t.String()),
        city: t.Nullable(t.String()),
        neighborhood: t.Nullable(t.String()),
        streetAddress: t.Nullable(t.String()),
        postalCode: t.Nullable(t.String()),
        lat: t.Nullable(t.Number()),
        lon: t.Nullable(t.Number()),
        serviceType: t.String(),
        coverageRadiusKm: t.Nullable(t.Number()),
        phone: t.Nullable(t.String()),
        email: t.Nullable(t.String()),
        timezone: t.Nullable(t.String()),
        status: t.String(),
        isDefault: t.Boolean(),
        metadata: t.Any(),
      })),
      detail: {
        tags: ['Locations'],
        summary: 'Update a location',
      },
    }
  )
  .delete(
    '/:accountId/:locationId',
    async ({ params, set }) => {
      try {
        await locationService.deleteLocation(params.locationId, params.accountId);
        return { success: true };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
        locationId: t.String(),
      }),
      detail: {
        tags: ['Locations'],
        summary: 'Delete a location',
      },
    }
  )
  .get(
    '/geocode',
    async ({ query, set }) => {
      const googleKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!googleKey) {
        set.status = 400;
        return { success: false, message: 'Google API Key not configured in backend' };
      }

      try {
        const { address, latlng } = query;
        let url = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleKey}`;
        
        if (address) url += `&address=${encodeURIComponent(address)}`;
        if (latlng) url += `&latlng=${encodeURIComponent(latlng)}`;

        const response = await fetch(url);
        const data = await response.json();
        
        return { success: true, data };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Partial(t.Object({
        address: t.Optional(t.String()),
        latlng: t.Optional(t.String()),
      })),
      detail: {
        tags: ['Locations'],
        summary: 'Proxy geocoding requests to Google Maps (Safe for CORS)',
      },
    }
  );
