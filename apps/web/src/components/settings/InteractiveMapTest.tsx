import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { useState } from 'react';

export function InteractiveMapTest() {
  const [position, setPosition] = useState({ lat: -34.6037, lng: -58.3816 }); // Obelisco default
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) return <div className="p-4 text-error">API Key faltante</div>;

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-subtle">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={position}
          defaultZoom={15}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          onCenterChanged={(ev) => {
            // console.log('Center changed:', ev.detail.center);
          }}
        >
          <Marker 
            position={position} 
            draggable={true} 
            onDragEnd={(ev) => {
              if (ev.latLng) {
                setPosition({ lat: ev.latLng.lat(), lng: ev.latLng.lng() });
              }
            }}
          />
        </Map>
      </APIProvider>
      <div className="p-2 text-[10px] text-muted">
        Lat: {position.lat.toFixed(6)} | Lon: {position.lng.toFixed(6)}
      </div>
    </div>
  );
}
