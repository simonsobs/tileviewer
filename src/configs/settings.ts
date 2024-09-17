import { CRS, MapOptions } from "leaflet";

export const SERVER: string = 'http://127.0.0.1:9191';

export const mapOptions: MapOptions = {
    center: [0.0, 0.0],
    zoom: 3,
    crs: CRS.EPSG4326,
};

export const MIN_TEMP = -2000;
export const MAX_TEMP = 2000;

export const CMAP_OPTIONS = ['RdBu_r', 'viridis', 'inferno'];