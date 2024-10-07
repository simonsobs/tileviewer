import { CRS, latLng, latLngBounds, MapOptions } from "leaflet";

export const SERVICE_URL: string = import.meta.env.VITE_SERVICE_URL || 'http://127.0.0.1:9191';

export const mapOptions: MapOptions = {
    center: [0.0, 0.0],
    zoom: 3,
    crs: CRS.EPSG4326,
    maxBounds: latLngBounds(
        latLng(-180, -90),
        latLng(180, 90),
    ),
    maxBoundsViscosity: 1,
};

export const DEFAULT_MIN_ZOOM = 0;

// related to controls
export const MAX_SCALE_WIDTH = 300;
export const NUMBER_OF_FIXED_COORDINATE_DECIMALS = 5;
