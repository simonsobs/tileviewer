import { useCallback, useEffect } from 'react';
import { Graticule, Map } from 'ol';
import Stroke from 'ol/style/Stroke';
import { NUMBER_OF_FIXED_GRATICULE_DECIMALS } from '../../configs/mapSettings';

export function GraticuleLayer({
  mapRef,
  flipped,
}: {
  mapRef: React.RefObject<Map | null>;
  flipped: boolean;
}) {
  const handleLatLabelFormat = useCallback((lat: number) => {
    if (Number.isInteger(lat) || String(lat).length < 5) {
      return String(lat);
    }
    return String(lat.toFixed(NUMBER_OF_FIXED_GRATICULE_DECIMALS));
  }, []);

  const handleLonLabelFormat = useCallback(
    (lon: number) => {
      if (Number.isInteger(lon) || String(lon).length < 5) {
        return String(flipped ? lon * -1 + 180 : lon);
      }
      return String(
        (flipped ? lon * -1 + 180 : lon).toFixed(
          NUMBER_OF_FIXED_GRATICULE_DECIMALS
        )
      );
    },
    [flipped]
  );

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getAllLayers().forEach((l) => {
        const id = l.getProperties().id;
        if (id && id.includes('graticule-')) {
          mapRef.current?.removeLayer(l);
        }
      });

      const graticule1 = new Graticule({
        strokeStyle: new Stroke({
          color: 'rgba(198,198,198,0.5)',
          width: 2,
        }),
        zIndex: 1000,
        showLabels: true,
        lonLabelPosition: 0,
        latLabelPosition: 0.999,
        latLabelFormatter: handleLatLabelFormat,
        lonLabelFormatter: handleLonLabelFormat,
        wrapX: false,
        properties: {
          id: 'graticule-1',
        },
      });

      const graticule2 = new Graticule({
        strokeStyle: new Stroke({
          color: 'rgba(198,198,198,0.5)',
          width: 2,
        }),
        zIndex: 1000,
        showLabels: true,
        lonLabelPosition: 1,
        latLabelPosition: 0.035,
        latLabelFormatter: handleLatLabelFormat,
        lonLabelFormatter: handleLonLabelFormat,
        wrapX: false,
        properties: {
          id: 'graticule-2',
        },
      });

      mapRef.current.addLayer(graticule1);
      mapRef.current.addLayer(graticule2);
    }
  }, [mapRef.current, flipped]);

  return null;
}
