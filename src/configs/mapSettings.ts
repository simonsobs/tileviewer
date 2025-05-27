import { ExternalBaselayer } from '../types/maps';

// Uses a user-defined VITE_SERVICE_URL environment variable for development; otherwise
// uses the window.location object's href string, minus the trailing forward slash
export const SERVICE_URL: string =
  import.meta.env.VITE_SERVICE_URL || window.location.href.slice(0, -1);

export const DEFAULT_INTERNAL_MAP_SETTINGS = {
  projection: 'EPSG:4326',
  center: [0, 0],
  zoom: 0,
  extent: [-180, -90, 180, 90],
  showFullExtent: true,
  multiWorld: true,
};

export const EXTERNAL_BASELAYERS: ExternalBaselayer[] = [
  {
    id: 'external-unwise-neo4',
    name: 'Legacy Survey | unWISE neo4',
    projection: 'EPSG:3857',
    url: 'http://imagine.legacysurvey.org/static/tiles/unwise-neo4/1/{z}/{x}/{y}.jpg',
    extent: [0, -90, 360, 90],
    // url: function ([z, x, y]) {
    //   const tileX = (x + 2 ** z) % (2 ** z); // wrap-around X at 360° RA
    //   return `http://imagine.legacysurvey.org/static/tiles/unwise-neo4/1/${z}/${tileX}/${y}.jpg`;
    // },
  },
];

// related to controls
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;
