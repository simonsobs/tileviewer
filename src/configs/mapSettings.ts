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

export const EXTERNAL_DETAILS_ID = 'external-comparison-maps';

export const EXTERNAL_BASELAYERS: ExternalBaselayer[] = [
  {
    layer_id: 'external-unwise-neo6',
    name: 'Legacy Survey | unWISE neo6',
    projection: 'EPSG:3857',
    url: 'https://s3.us-west-2.amazonaws.com/unwise-neo6.legacysurvey.org/{z}/{x}/{y}.jpg',
    extent: transformExtent(
      [-180, -MERCATOR_MAX_LAT, 180, MERCATOR_MAX_LAT],
      'EPSG:4326',
      'EPSG:3857'
    ),
    maxZoom: 10,
    disabledState: (isFlipped: boolean) => !isFlipped,
  },
  {
    layer_id: 'external-unwise-neo4',
    name: 'Legacy Survey | unWISE neo4',
    projection: 'EPSG:3857',
    url: 'https://imagine.legacysurvey.org/static/tiles/unwise-neo4/1/{z}/{x}/{y}.jpg',
    extent: transformExtent(
      [-180, -MERCATOR_MAX_LAT, 180, MERCATOR_MAX_LAT],
      'EPSG:4326',
      'EPSG:3857'
    ),
    maxZoom: 8,
    disabledState: (isFlipped: boolean) => !isFlipped,
  },
];

// related to controls
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;
export const NUMBER_OF_FIXED_GRATICULE_DECIMALS = 3;

export const LOGIN_URL =
  'https://identity.simonsobservatory.org/login/0686c201-b234-70fe-8000-3036b7a36d47';
export const LOGOUT_URL = 'https://maps.simonsobservatory.org/logout';

// Taken from the "vibrant" colorway defined at https://sronpersonalpages.nl/~pault/
export const CATALOG_COLORWAY = [
  '#EE3377',
  '#0077BB',
  '#33BBEE',
  '#EE7733',
  '#CC3311',
  '#009988',
  '#BBBBBB',
];
