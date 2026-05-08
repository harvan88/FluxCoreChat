import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

export interface WeeklyScheduleItem {
  dayOfWeek: number;
  isClosed: boolean;
}

export interface WeeklyIntervalItem {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface SpecialDateItem {
  id: string;
  date: string;
  isClosed: boolean;
  label: string | null;
  intervals: {
    id: string;
    openTime: string;
    closeTime: string;
  }[];
}

export interface ScheduleData {
  weekly: WeeklyScheduleItem[];
  intervals: WeeklyIntervalItem[];
  special: SpecialDateItem[];
}

export function useSchedules(ownerType: string, ownerId: string | null) {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    if (!ownerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getSchedules(ownerType, ownerId);
      if (response.success && response.data) {
        setSchedule(response.data);
      } else {
        setError(response.error || 'Error al cargar horarios');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }, [ownerType, ownerId]);

  const updateWeeklyStatus = useCallback(async (days: WeeklyScheduleItem[]) => {
    if (!ownerId) return false;
    try {
      const response = await api.updateWeeklySchedule(ownerType, ownerId, days);
      if (response.success) {
        await loadSchedule();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating weekly status:', err);
      return false;
    }
  }, [ownerType, ownerId, loadSchedule]);

  const updateIntervals = useCallback(async (dayOfWeek: number, intervals: { openTime: string, closeTime: string }[]) => {
    if (!ownerId) return false;
    try {
      const response = await api.updateWeeklyIntervals(ownerType, ownerId, dayOfWeek, intervals);
      if (response.success) {
        await loadSchedule();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating intervals:', err);
      return false;
    }
  }, [ownerType, ownerId, loadSchedule]);

  const upsertSpecial = useCallback(async (data: any) => {
    if (!ownerId) return null;
    try {
      const response = await api.upsertSpecialDate(ownerType, ownerId, data);
      if (response.success) {
        await loadSchedule();
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error updating special date:', err);
      return null;
    }
  }, [ownerType, ownerId, loadSchedule]);

  const deleteSpecial = useCallback(async (specialDateId: string) => {
    try {
      const response = await api.deleteSpecialDate(specialDateId);
      if (response.success) {
        await loadSchedule();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting special date:', err);
      return false;
    }
  }, [loadSchedule]);

  const clearAllSchedules = useCallback(async () => {
    if (!ownerId) return false;
    try {
      const response = await api.clearAllSchedules(ownerType, ownerId);
      if (response.success) {
        await loadSchedule();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error clearing schedules:', err);
      return false;
    }
  }, [ownerType, ownerId, loadSchedule]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  return {
    schedule,
    isLoading,
    error,
    loadSchedule,
    updateWeeklyStatus,
    updateIntervals,
    upsertSpecial,
    deleteSpecial,
    clearAllSchedules
  };
}
