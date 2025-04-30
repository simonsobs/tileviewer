import { useEffect } from 'react';
import { Graticule, Map } from 'ol';
import Stroke from 'ol/style/Stroke';

export function GraticuleLayer({
  mapRef,
}: {
  mapRef: React.RefObject<Map | null>;
}) {
  useEffect(() => {
    if (mapRef.current) {
      const graticule1 = new Graticule({
        strokeStyle: new Stroke({
          color: 'rgba(198,198,198,0.5)',
          width: 2,
        }),
        zIndex: 1000,
        showLabels: true,
        lonLabelPosition: 0,
        latLabelPosition: 0.999,
        latLabelFormatter: (lat) => String(lat),
        lonLabelFormatter: (lon) => String(lon),
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
        latLabelPosition: 0.012,
        latLabelFormatter: (lat) => String(lat),
        lonLabelFormatter: (lon) => String(lon),
        wrapX: false,
        properties: {
          id: 'graticule-2',
        },
      });

      mapRef.current.addLayer(graticule1);
      mapRef.current.addLayer(graticule2);
    }
  }, [mapRef.current]);

  return null;
}
