import { transformExtent } from 'ol/proj';
import { ExternalBaselayer } from '../types/maps';

// Uses a user-defined VITE_SERVICE_URL environment variable for development; otherwise
// uses the window.location object's href string, minus the trailing forward slash
export const SERVICE_URL: string =
  import.meta.env.VITE_SERVICE_URL || window.location.href.slice(0, -1);

const MERCATOR_MAX_LAT = 85.0511287798066;

export const CAR_BBOX = [-180, -90, 180, 90];
export const MERCATOR_BBOX = [-180, -MERCATOR_MAX_LAT, 180, MERCATOR_MAX_LAT];

export const DEFAULT_INTERNAL_MAP_SETTINGS = {
  projection: 'EPSG:4326',
  center: [0, 0],
  zoom: 2,
  // extent: [-180, -90, 180, 90],
  showFullExtent: true,
  multiWorld: true,
};

export const EXTERNAL_BASELAYERS: ExternalBaselayer[] = [
  {
    id: 'external-unwise-neo4',
    name: 'Legacy Survey | unWISE neo4',
    projection: 'EPSG:3857',
    url: 'http://imagine.legacysurvey.org/static/tiles/unwise-neo4/1/{z}/{x}/{y}.jpg',
    extent: transformExtent(
      [-180, -MERCATOR_MAX_LAT, 180, MERCATOR_MAX_LAT],
      'EPSG:4326',
      'EPSG:3857'
    ),
    disabledState: (isFlipped: boolean) => !isFlipped,
  },
];

// related to controls
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;

export function transformCoords(
  coords: number[],
  isFlipped: boolean
): number[] {
  if (isFlipped) {
    const [ra, dec] = coords;
    return [ra * -1 + 180, dec];
  } else {
    return coords;
  }
}
