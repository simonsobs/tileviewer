import { useEffect } from 'react';
import { Graticule, Map } from 'ol';
import Stroke from 'ol/style/Stroke';

export function GraticuleLayer({
  mapRef,
  flipped,
}: {
  mapRef: React.RefObject<Map | null>;
  flipped: boolean;
}) {
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
        latLabelFormatter: (lat) => String(lat),
        lonLabelFormatter: (lon) => String(flipped ? lon * -1 + 180 : lon),
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
        lonLabelFormatter: (lon) => String(flipped ? lon * -1 + 180 : lon),
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
