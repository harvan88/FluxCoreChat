import ct from 'countries-and-timezones';

export interface RegionalOption {
  value: string; // timezone IANA
  country: string; // ISO 3166-1 alpha-2
  label: string; // "City (GMT)"
  secondaryLabel: string; // "Country (Region)"
}

/**
 * Obtiene la lista unificada de opciones regionales siguiendo estándares de ingeniería (IANA + ISO).
 * Utiliza 'countries-and-timezones' como base de datos de autoridad y 'Intl' para localización.
 */
export const getUnifiedRegionalOptions = (): RegionalOption[] => {
  try {
    const allTimezones = ct.getAllTimezones();
    
    // Configuramos el localizador de nombres de países en español (ISO 3166-1)
    const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });

    return Object.values(allTimezones).map(tz => {
      const city = tz.name.split('/').pop()?.replace(/_/g, ' ') || tz.name;
      const gmtOffset = tz.utcOffsetStr;
      
      // Obtenemos el nombre del país localizado dinámicamente desde el estándar ISO
      let countryName = '';
      const countryCode = tz.countries[0]; // Tomamos el primer país asociado según IANA
      
      if (countryCode) {
        try {
          countryName = regionNames.of(countryCode) || countryCode;
        } catch (e) {
          countryName = countryCode;
        }
      }

      const region = tz.name.split('/')[0];

      return {
        value: tz.name,
        country: countryCode || '??',
        label: `${city} (GMT${gmtOffset})`,
        secondaryLabel: countryName ? `${countryName} (${region})` : region
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    
  } catch (e) {
    console.error('[Regional] Error generating options:', e);
    return [];
  }
};
