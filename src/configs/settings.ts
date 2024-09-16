import { CRS, MapOptions } from "leaflet";

export const SERVER: string = 'http://127.0.0.1:9191';

export const mapOptions: MapOptions = {
    center: [0.0, 0.0],
    zoom: 3,
    crs: CRS.EPSG4326,
};