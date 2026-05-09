import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../store/uiStore';

export interface LocationData {
  id: string;
  accountId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  lat?: number | null;
  lon?: number | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  streetAddress?: string | null;
  isDefault: boolean;
  status: string;
  timezone?: string | null;
  serviceType?: string | null;
  postalCode?: string | null;
}

export interface UseLocationsReturn {
  locations: LocationData[];
  defaultLocation: LocationData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadLocations: () => Promise<void>;
  addLocation: (data: Partial<LocationData>) => Promise<LocationData | null>;
  updateLocation: (id: string, data: Partial<LocationData>) => Promise<LocationData | null>;
  deleteLocation: (id: string) => Promise<boolean>;
  ensureDefaultLocation: () => Promise<LocationData | null>;
  generateNextSedeName: () => string;
}

export function useLocations(): UseLocationsReturn {
  const { selectedAccountId, accounts } = useUIStore();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getLocations(selectedAccountId);
      if (response.success && response.data) {
        setLocations(response.data as LocationData[]);
      } else {
        setError(response.error || 'Error al cargar ubicaciones');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId]);

  const generateNextSedeName = useCallback(() => {
    const account = accounts.find(a => a.id === selectedAccountId);
    const baseName = account?.displayName || account?.alias || 'Sede';
    const existingCount = locations.length;
    const letter = String.fromCharCode(65 + existingCount);
    return `${baseName} - Sede ${letter}`;
  }, [selectedAccountId, accounts, locations]);

  // Función para limpiar ABSOLUTAMENTE TODO lo que no sea un campo de datos
  const sanitizeData = (data: Partial<LocationData>) => {
    const allowedFields = [
      'name', 'address', 'phone', 'email', 'lat', 'lon', 
      'country', 'state', 'city', 'neighborhood', 'streetAddress',
      'isDefault', 'status', 'timezone', 'serviceType'
    ];
    
    const cleanData: any = {};
    allowedFields.forEach(field => {
      if (data[field as keyof LocationData] !== undefined) {
        cleanData[field] = data[field as keyof LocationData];
      }
    });
    return cleanData;
  };

  const addLocation = useCallback(async (data: Partial<LocationData>) => {
    if (!selectedAccountId) return null;
    setIsSaving(true);
    try {
      const cleanData = sanitizeData(data);
      const finalData = {
        ...cleanData,
        name: cleanData.name || generateNextSedeName()
      };
      const response = await api.createLocation(selectedAccountId, finalData);
      if (response.success && response.data) {
        const newLoc = response.data as LocationData;
        setLocations(prev => [...prev, newLoc]);
        return newLoc;
      }
      return null;
    } catch (err) {
      console.error('Error creating location:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [selectedAccountId, generateNextSedeName]);

  const updateLocation = useCallback(async (id: string, data: Partial<LocationData>) => {
    if (!selectedAccountId) return null;
    setIsSaving(true);
    try {
      const cleanData = sanitizeData(data);
      const response = await api.updateLocation(selectedAccountId, id, cleanData);
      if (response.success && response.data) {
        const updated = response.data as LocationData;
        setLocations(prev => prev.map(l => l.id === id ? updated : l));
        return updated;
      }
      return null;
    } catch (err) {
      console.error('Error updating location:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [selectedAccountId]);

  const deleteLocation = useCallback(async (id: string) => {
    if (!selectedAccountId) return false;
    try {
      const response = await api.deleteLocation(selectedAccountId, id);
      if (response.success) {
        setLocations(prev => prev.filter(l => l.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting location:', err);
      return false;
    }
  }, [selectedAccountId]);

  const ensureDefaultLocation = useCallback(async () => {
    if (!selectedAccountId) return null;
    let existingDefault = locations.find(l => l.isDefault);
    if (existingDefault) return existingDefault;
    
    const response = await api.getLocations(selectedAccountId);
    if (response.success && response.data) {
      const refreshedLocations = response.data as LocationData[];
      setLocations(refreshedLocations);
      existingDefault = refreshedLocations.find(l => l.isDefault);
      if (existingDefault) return existingDefault;
    }

    return await addLocation({
      name: generateNextSedeName(),
      isDefault: true,
      status: 'active'
    });
  }, [selectedAccountId, locations, addLocation, generateNextSedeName]);

  useEffect(() => {
    if (selectedAccountId) {
      loadLocations();
    }
  }, [selectedAccountId, loadLocations]);

  const defaultLocation = locations.find(l => l.isDefault) || null;

  return {
    locations,
    defaultLocation,
    isLoading,
    isSaving,
    error,
    loadLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    ensureDefaultLocation,
    generateNextSedeName,
  };
}
