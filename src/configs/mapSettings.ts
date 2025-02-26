import { LatLngExpression } from 'leaflet';

// Uses a user-defined VITE_SERVICE_URL environment variable for development; otherwise
// uses the window.location object's href string, minus the trailing forward slash
export const SERVICE_URL: string =
  import.meta.env.VITE_SERVICE_URL || window.location.href.slice(0, -1);

export const DEFAULT_MAP_ZOOM_LEVEL = 0;
export const DEFAULT_MAP_CENTER: LatLngExpression = [0.0, 0.0];

// related to controls
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;
