import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Loader2,
  Building2,
  Star,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { api as apiService } from '../../services/api';
import { useLocations } from '../../hooks/useLocations';
import type { LocationData as Location } from '../../hooks/useLocations';
import { Button, Input, SidebarItem, SearchFirstOverlay, SearchFirstHeader } from '../ui';
import { CollectionView, type CollectionColumn } from '../../components/fluxcore/shared/CollectionView';
// import { usePanelStore } from '../../store/panelStore';

function MapHandler({ center, onPanStart, onPanEnd }: { center: { lat: number; lng: number } | null; onPanStart: () => void; onPanEnd: () => void }) {
    const map = useMap();
    useEffect(() => {
        if (map && center) {
            onPanStart();
            map.panTo(center);
            // Dar tiempo a que el panTo termine antes de reactivar onCameraChanged
            setTimeout(onPanEnd, 600);
        }
    }, [map, center]);
    return null;
}

interface LocationSectionProps {
  onBack?: () => void;
  onOpenTab?: (id: string, title: string, data: any) => void;
  locationId?: string;
  tabId?: string;
  containerId?: string;
}

export function LocationSection({ onBack, onOpenTab, locationId }: LocationSectionProps) {
  const {
    locations,
    isLoading,
    isSaving,
    addLocation,
    updateLocation,
    deleteLocation,
    generateNextSedeName,
  } = useLocations();

//   const { closeTab } = usePanelStore();
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false); 
  const [hasSelected, setHasSelected] = useState(false); 
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);
  const [mapMoved, setMapMoved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraJump, setCameraJump] = useState<{ lat: number; lng: number } | null>(null);
  const isPanningRef = useRef(false);
  
  const [formData, setFormData] = useState<Partial<Location>>({
    name: '', address: '', country: '', state: '', city: '', neighborhood: '', streetAddress: '',
    lat: -34.6037, lon: -58.3816, serviceType: 'both', status: 'active', isDefault: false,
  });

  const isFormMode = locationId !== undefined;

  const columns: CollectionColumn<Location>[] = [
    {
      id: 'name',
      header: 'Nombre',
      accessor: (location) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${location.isDefault ? 'bg-accent/10 text-accent' : 'bg-hover text-muted'}`}>
            {location.isDefault ? <Star size={12} fill="currentColor" /> : <Building2 size={12} />}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-primary">{location.name}</div>
            <div className="text-xs text-muted truncate">{location.address}</div>
          </div>
        </div>
      ),
    }
  ];

  const handleFinish = () => {
    console.log('[DEBUG_LOCACIONES] ACCIÓN: Finalizando y cerrando pestaña');
    onBack?.();
  };

  const handleEdit = (location: Location) => {
    if (onOpenTab) {
      onOpenTab(location.id, `Sede: ${location.name}`, { type: 'location', locationId: location.id });
    }
  };

  useEffect(() => {
    if (locationId && locationId !== 'new' && locationId !== 'nueva sede' && locations.length > 0) {
      const loc = locations.find(l => l.id === locationId);
      if (loc) {
        setFormData(loc);
        setEditingId(loc.id);
        setSearchQuery(loc.address || '');
        setCameraJump({ lat: loc.lat || -34.6037, lng: loc.lon || -58.3816 });
        setHasSelected(true);
      }
    } else if (locationId === 'new' || locationId === 'nueva sede') {
      setEditingId(null);
      setHasSelected(false);
      setMapMoved(false);
      setSearchQuery('');
      setCameraJump(null);
      
      const defaultName = generateNextSedeName();
      setFormData({
        name: defaultName,
        address: '',
        country: '',
        state: '',
        city: '',
        neighborhood: '',
        streetAddress: '',
        lat: -34.6037, // Obelisco
        lon: -58.3816, // Obelisco
        serviceType: 'both',
        status: 'active',
        isDefault: false,
      });
      
      // PRIORIDAD GPS: Intentar obtener la ubicación real del dispositivo
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          console.log('[DEBUG_LOCACIONES] GPS: Ubicación detectada al inicio', { lat, lon });
          setFormData(prev => ({ ...prev, lat, lon }));
          setCameraJump({ lat, lng: lon });
        }, (err) => {
          console.warn('[DEBUG_LOCACIONES] GPS: Falló o denegado, usando Obelisco', err);
          setCameraJump({ lat: -34.6037, lng: -58.3816 });
        });
      } else {
        setCameraJump({ lat: -34.6037, lng: -58.3816 });
      }
    }
  }, [locationId, locations, generateNextSedeName]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            setFormData(prev => ({ ...prev, lat, lon }));
            setCameraJump({ lat, lng: lon });
            
            // Geocodificar para mostrar al menos la dirección aproximada en el buscador
            apiService.geocode({ latlng: `${lat},${lon}` }).then(res => {
                if (res.success && res.data?.results?.[0]) {
                    setSearchQuery(res.data.results[0].formatted_address);
                }
            });
        });
    }
  };

  const onMarkerDragEnd = useCallback((lat: number, lon: number) => {
    // Solo actualizamos coordenadas internas (Cero costo de API)
    setFormData(prev => ({ ...prev, lat, lon }));
    setHasSelected(true); 
    setMapMoved(true); // <--- Aquí es donde se activa el posible gasto futuro
  }, []);

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    setFormData(prev => ({ ...prev, address: value }));
    // Si el usuario cambia el texto, invalidamos la selección previa
    // para que el botón de Guardar sepa que debe buscar GPS o Centro
    setHasSelected(false);
    setMapMoved(false);
  };

  const executeSearch = async (query: string) => {
    if (query.length < 3) return;
    setIsSearchingAPI(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) { console.error(e); } finally { setIsSearchingAPI(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.length > 3 && isFocused) {
        executeSearch(searchQuery);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, isFocused]);

  const selectResult = (result: any) => {
    const addr = result.address || {};
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    const searchMatch = searchQuery.match(/\d+/);
    const houseNumber = addr.house_number || (searchMatch ? searchMatch[0] : '');
    const streetName = addr.road || addr.pedestrian || addr.cycleway || '';
    const fullStreet = `${streetName} ${houseNumber}`.trim();

    const newData = {
      ...formData,
      address: result.display_name,
      country: addr.country || '',
      state: addr.state || addr.province || '',
      city: addr.city || addr.town || addr.village || '',
      neighborhood: addr.neighbourhood || addr.suburb || '',
      streetAddress: fullStreet || searchQuery,
      lat,
      lon,
    };
    
    setFormData(newData);
    setCameraJump({ lat, lng: lon });
    setSearchQuery(result.display_name);
    setHasSelected(true);
    setMapMoved(false); // <--- Importante: Si viene de búsqueda, no gastamos en Google al final
    setIsFocused(false);
    setSearchResults([]);
  };

  const handleSave = async () => {
    let dataToSave = { ...formData };

    try {
      // 1. SI NO HUBO SELECCIÓN NI MOVIMIENTO: Forzamos obtención de ubicación (GPS -> Default)
      if (!hasSelected && !mapMoved) {
        console.log('[DEBUG_LOCACIONES] FALLBACK: No hubo selección, verificando GPS...');
        
        const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) reject();
          // Aumentamos a 10 segundos para dar más margen
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
        });

        try {
          const pos = await getPosition();
          dataToSave.lat = pos.coords.latitude;
          dataToSave.lon = pos.coords.longitude;
          console.log('[DEBUG_LOCACIONES] GPS: Coordenadas frescas obtenidas');
        } catch (e) {
          // Si falla la comprobación fresca, miramos si YA teníamos coordenadas (del mount)
          const isAtObelisco = dataToSave.lat === -34.6037 && dataToSave.lon === -58.3816;
          
          if (isAtObelisco) {
            console.log('[DEBUG_LOCACIONES] FALLBACK: Sin GPS previo, usando Centro de Ciudad');
            dataToSave.lat = -34.6037;
            dataToSave.lon = -58.3816;
          } else {
            console.log('[DEBUG_LOCACIONES] FALLBACK: GPS fresco falló, manteniendo ubicación detectada previamente', { lat: dataToSave.lat, lon: dataToSave.lon });
          }
        }
        
        // Sincronizamos el mapa
        if (dataToSave.lat && dataToSave.lon) {
          setCameraJump({ lat: dataToSave.lat, lng: dataToSave.lon });
        }
      }

      // 2. PRIORIDAD DE DIRECCIÓN: Si escribió pero no seleccionó, usamos el texto del buscador
      if (!dataToSave.address || dataToSave.address === '') {
          dataToSave.address = searchQuery;
      }

      // 3. GEOCODIFICACIÓN TÉCNICA: Rellenar Ciudad, País, etc. basándonos en el Pin final
      const needsGeocode = !dataToSave.streetAddress || 
                           dataToSave.streetAddress === 'null' || 
                           !dataToSave.city || 
                           mapMoved || 
                           (!hasSelected); // Forzamos si no seleccionó

      if (needsGeocode && dataToSave.lat && dataToSave.lon) {
          console.log('[DEBUG_LOCACIONES] GEO: Resolviendo datos técnicos para:', { lat: dataToSave.lat, lon: dataToSave.lon });
          const res = await apiService.geocode({ latlng: `${dataToSave.lat},${dataToSave.lon}` });
          
          if (res.success && res.data?.results?.[0]) {
              const result = res.data.results[0];
              const components = result.address_components || [];
              const getComp = (types: string[]) => 
                  components.find((c: any) => types.some(t => c.types.includes(t)))?.long_name || '';

              dataToSave.country = getComp(['country']) || dataToSave.country;
              dataToSave.state = getComp(['administrative_area_level_1']) || dataToSave.state;
              dataToSave.city = getComp(['locality', 'sublocality']) || dataToSave.city;
              dataToSave.neighborhood = getComp(['neighborhood', 'sublocality_level_1']) || dataToSave.neighborhood;
              dataToSave.postalCode = getComp(['postal_code']) || dataToSave.postalCode;
              
              const route = getComp(['route']);
              const streetNumber = getComp(['street_number']);
              if (route) {
                  dataToSave.streetAddress = `${route} ${streetNumber}`.trim();
              }
          }
      }

      // 4. PERSISTENCIA FINAL
      console.log('[DEBUG_LOCACIONES] ACCIÓN: Guardando...', dataToSave);
      const success = editingId 
        ? await updateLocation(editingId, dataToSave)
        : await addLocation(dataToSave);
      
      if (success) {
          handleFinish();
      }
    } catch (e) {
      console.error('Error al guardar:', e);
    }
  };

  if (!isFormMode) {
    return (
      <div className="h-full bg-background overflow-hidden">
        <CollectionView
          icon={MapPin}
          title="Ubicaciones y Sedes"
          createLabel="Nueva Sede"
          onCreate={() => handleEdit({ id: 'new', name: generateNextSedeName() } as any)}
          data={locations}
          getRowKey={(l) => l.id}
          columns={columns}
          loading={isLoading}
          onRowClick={handleEdit}
          renderActions={(l) => (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); handleEdit(l); }} className="p-1 hover:bg-elevated rounded"><Edit size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); deleteLocation(l.id); }} className="p-1 hover:bg-error/10 text-error rounded"><Trash2 size={14} /></button>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {!isFocused && (
        <div className="p-6 pb-2">
          <div className="relative">
            <Input 
              placeholder="Busca dirección o lugar..." 
              value={searchQuery || ''}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => onSearchChange(e.target.value)} 
              className="w-full h-11"
              rightIcon={isSearchingAPI ? (
                <Loader2 size={16} className="animate-spin text-muted" />
              ) : null}
            />
          </div>
        </div>
      )}

      <div className="flex-1 relative flex flex-col overflow-hidden">
        <SearchFirstOverlay isOpen={isFocused} onClose={() => setIsFocused(false)}>
          <SearchFirstHeader 
            value={searchQuery}
            onChange={onSearchChange}
            onClose={() => setIsFocused(false)}
            placeholder="Busca dirección o lugar..."
          />
          
          <div className="flex-1 overflow-y-auto py-4 px-6">
              {/* Opciones fijas iniciales usando componentes del sistema */}
              <div className="mb-4 space-y-0.5">
                  <SidebarItem 
                    icon={<MapPin size={18} className="text-accent" />}
                    label="Ubicación actual"
                    secondaryLabel="Detectar mi posición por GPS"
                    onClick={() => {
                      handleUseCurrentLocation();
                      setIsFocused(false);
                    }}
                    className="rounded-xl mx-0"
                  />

                  <SidebarItem 
                    icon={<Building2 size={18} />}
                    label="Ubicar en el mapa"
                    secondaryLabel="Mover el pin manualmente"
                    onClick={() => setIsFocused(false)}
                    className="rounded-xl mx-0"
                  />
              </div>

              <div className="h-px bg-subtle/50 mb-4 mx-2" />

              {searchResults.map((r, i) => (
                  <SidebarItem 
                    key={i}
                    label={r.display_name.split(',')[0]}
                    secondaryLabel={r.display_name.split(',').slice(1).join(',').trim()}
                    onClick={() => selectResult(r)}
                    className="rounded-xl mx-0 py-3"
                  />
              ))}

              {searchQuery.length > 3 && searchResults.length === 0 && !isSearchingAPI && (
                  <div className="py-10 text-center text-muted text-sm">
                      No se encontraron resultados para "{searchQuery}"
                  </div>
              )}
          </div>
          
          <div className="p-6 border-t border-subtle bg-surface/50">
              <Button variant="primary" onClick={handleSave} disabled={isSaving} className="w-full h-11 font-semibold shadow-lg shadow-accent/20">
                  {isSaving ? 'Guardando...' : 'Guardar sede'}
              </Button>
          </div>
        </SearchFirstOverlay>

        {!isFocused && (
          <div className="flex-1 flex flex-col overflow-y-auto px-6 pb-6 space-y-6">
                <div className="hidden">
                    <Input value={formData.country || ''} readOnly />
                    <Input value={formData.state || ''} readOnly />
                    <Input value={formData.city || ''} readOnly />
                    <Input value={formData.neighborhood || ''} readOnly />
                    <Input value={formData.streetAddress || ''} readOnly />
                    <Input value={formData.postalCode || ''} readOnly />
                </div>

                {hasSelected && (
                  <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="isDefault"
                      checked={formData.isDefault} 
                      onChange={(e) => setFormData({...formData, isDefault: e.target.checked})} 
                      className="w-5 h-5 rounded border-subtle bg-input" 
                    />
                    <label htmlFor="isDefault" className="text-xs font-semibold text-secondary select-none cursor-pointer">
                      Esta es la sede principal
                    </label>
                  </div>
                )}

                {/* MAPA FLUIDO CON PIN FIJO AL CENTRO (Uber Style) */}
                <div className="rounded-2xl overflow-hidden border border-subtle h-[350px] w-full bg-surface relative shadow-xl">
                  {/* Botón GPS Flotante */}
                  <button 
                    onClick={(e) => { e.preventDefault(); handleUseCurrentLocation(); }}
                    className="absolute top-4 right-4 z-20 p-3 bg-background border border-subtle rounded-full shadow-lg hover:bg-hover transition-colors text-accent"
                    title="Usar mi ubicación actual (GPS)"
                  >
                    <MapPin size={20} />
                  </button>

                  {/* INDICADOR FIJO AL CENTRO (Visual) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-10 pointer-events-none">
                    <div className="relative">
                      {/* El Pin */}
                      <MapPin size={40} className="text-accent drop-shadow-lg" fill="white" />
                      {/* Sombra en el suelo */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/20 rounded-full blur-[1px]" />
                    </div>
                  </div>

                  {googleKey ? (
                    <APIProvider apiKey={googleKey}>
                        <Map
                            defaultCenter={{ lat: formData.lat || -34.6037, lng: formData.lon || -58.3816 }}
                            defaultZoom={15}
                            gestureHandling={'cooperative'}
                            disableDefaultUI={true}
                            className="w-full h-full"
                            onCameraChanged={(ev) => {
                              // Solo actualizar coords si el USUARIO movió el mapa, no un panTo programático
                              if (!isPanningRef.current) {
                                const newCenter = ev.detail.center;
                                onMarkerDragEnd(newCenter.lat, newCenter.lng);
                              }
                            }}
                        >
                            <MapHandler 
                              center={cameraJump} 
                              onPanStart={() => { isPanningRef.current = true; }}
                              onPanEnd={() => { isPanningRef.current = false; }}
                            />
                        </Map>
                    </APIProvider>
                  ) : null}
                </div>

                <div className="flex gap-4 pt-2 pb-10">
                  <Button variant="ghost" onClick={handleFinish} className="flex-1 h-12">Cancelar</Button>
                  <Button variant="primary" onClick={handleSave} disabled={isSaving} className="flex-1 h-12 shadow-lg shadow-accent/20 font-semibold">
                    {isSaving ? 'Guardando...' : 'Guardar sede'}
                  </Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
