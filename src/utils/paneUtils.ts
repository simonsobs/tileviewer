import { CSSProperties } from 'react';
import L from 'leaflet';

type ControlPaneStyles = {
  top: CSSProperties['top'];
  left: CSSProperties['left'];
  width: CSSProperties['width'];
  height: CSSProperties['height'];
};

export function getControlPaneOffsets(
  map: L.Map,
  bounds: L.LatLngBounds
): ControlPaneStyles {
  const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
  const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);
  return {
    top: `${topLeft.y}px`,
    left: `${topLeft.x}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
}
