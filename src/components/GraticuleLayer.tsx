import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from 'leaflet';
import '../plugins/leaflet.latlng-graticule.js';

export function GraticuleLayer() {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const graticule = L.latlngGraticule({
            sides: ['', '', '', ''],
            zoomInterval: [
                {start: 0, end: 1, interval: 40},
                {start: 2, end: 2, interval: 20},
                {start: 3, end: 3, interval: 10},
                {start: 4, end: 4, interval: 5},
                {start: 5, end: 7, interval: 2},
                {start: 8, end: 20, interval: 1}
              ]
        }).addTo(map);

        return () => {
            map.removeLayer(graticule)
        }
    }, [map])
    return null;
}