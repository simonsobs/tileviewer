// Uses a user-defined VITE_SERVICE_URL environment variable for development; otherwise
// uses the window.location object's href string, minus the trailing forward slash
export const SERVICE_URL: string =
  import.meta.env.VITE_SERVICE_URL || window.location.href.slice(0, -1);

export const DEFAULT_MAP_SETTINGS = {
  projection: 'EPSG:4326',
  center: [0, 0],
  zoom: 0,
  extent: [-180, -90, 180, 90],
  showFullExtent: true,
  multiWorld: true,
};

// related to controls
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;
