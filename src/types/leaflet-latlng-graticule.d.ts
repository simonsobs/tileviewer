import * as L from 'leaflet';

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
}

declare module 'leaflet' {
    function latlngGraticule(options?: GraticuleOptions): L.Layer;
}