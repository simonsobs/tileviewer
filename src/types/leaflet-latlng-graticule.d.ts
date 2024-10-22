import * as L from 'leaflet';
import { GraticuleDetails } from './maps';

/**  
 * Refer to leaflet.latlng-graticule's README for more details about the options
 * https://github.com/cloudybay/leaflet.latlng-graticule?tab=readme-ov-file#options
*/
type GraticuleOptions = {
    showLabel?: boolean;
    opacity?: number;
    weight?: number;
    color?: string;
    font?: string;
    fontColor?: string;
    dashArray?: number[];
    sides?: string[];
    zoomInterval?: {start: number, end: number, interval: number}[];
    lngFormatTickLabel?: (lng: number) => number;
    latFormatTickLabel?: (lat: number) => number;
    getCurrentGraticuleDetails?: (details: GraticuleDetails) => void;
}

declare module 'leaflet' {
    function latlngGraticule(options?: GraticuleOptions): L.Layer;
}