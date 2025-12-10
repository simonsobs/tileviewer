import { useEffect, useRef } from 'react';
import { Graticule, Map } from 'ol';
import Stroke from 'ol/style/Stroke';
import { NUMBER_OF_FIXED_GRATICULE_DECIMALS } from '../../configs/mapSettings';

export function GraticuleLayer({
  mapRef,
  flipped,
  isMapInitialized,
}: {
  mapRef: React.RefObject<Map | null>;
  flipped: boolean;
  isMapInitialized: boolean;
}) {
  const gratRef = useRef<Graticule[] | null>(null);

  const formatLat = (lat: number) => {
    if (Number.isInteger(lat) || String(lat).length < 5) return String(lat);
    return String(lat.toFixed(NUMBER_OF_FIXED_GRATICULE_DECIMALS));
  };

  const formatLon = (lon: number) => {
    const fixed = flipped ? lon * -1 + 180 : lon;
    if (Number.isInteger(fixed) || String(fixed).length < 5)
      return String(fixed);
    return String(fixed.toFixed(NUMBER_OF_FIXED_GRATICULE_DECIMALS));
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapInitialized) return;

    // Remove old graticule layers
    if (gratRef.current) {
      gratRef.current.forEach((g) => map.removeLayer(g));
      gratRef.current = null;
    }

    const stroke = new Stroke({
      color: 'rgba(198,198,198,0.5)',
      width: 2,
    });

    const g1 = new Graticule({
      strokeStyle: stroke,
      zIndex: 1000,
      showLabels: true,
      lonLabelPosition: 0,
      latLabelPosition: 0.999,
      latLabelFormatter: formatLat,
      lonLabelFormatter: formatLon,
      wrapX: false,
      properties: { id: 'graticule-1' },
    });

    const g2 = new Graticule({
      strokeStyle: stroke,
      zIndex: 1000,
      showLabels: true,
      lonLabelPosition: 1,
      latLabelPosition: 0.035,
      latLabelFormatter: formatLat,
      lonLabelFormatter: formatLon,
      wrapX: false,
      properties: { id: 'graticule-2' },
    });

    gratRef.current = [g1, g2];

    map.addLayer(g1);
    map.addLayer(g2);

    // Cleanup on unmount
    return () => {
      if (!map || !gratRef.current) return;
      gratRef.current.forEach((g) => map.removeLayer(g));
      gratRef.current = null;
    };
  }, [mapRef, flipped, isMapInitialized]);

  return null;
}
