import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from 'leaflet';
import '../plugins/leaflet.latlng-graticule.js';
import { GraticuleDetails } from "../types/maps.js";

type Props = {
    setGraticuleDetails: (details: GraticuleDetails) => void;
}

export function GraticuleLayer({setGraticuleDetails}: Props) {
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
                {start: 5, end: 5, interval: 2},
                {start: 6, end: 6, interval: 1},
                {start: 7, end: 7, interval: 0.5},
                {start: 8, end: 8, interval: 0.2},
                {start: 9, end: 20, interval: 0.1}
              ],
              fontColor: '#000',
              lngFormatTickLabel: function(lng) { return Math.round(lng*1000)/1000; },
              latFormatTickLabel: function(lat) { return Math.round(lat*1000)/1000; },
              getCurrentGraticuleDetails: setGraticuleDetails,
        }).addTo(map);

        return () => {
            map.removeLayer(graticule)
        }
    }, [map])
    return null;
}