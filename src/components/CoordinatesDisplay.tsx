import { useMap } from "react-leaflet";
import { LatLng } from "leaflet";
import { useState } from "react";
import './styles/coordinates-display.css';

const NUMBER_OF_FIXED_DECIMALS = 5;

export function CoordinatesDisplay() {
    const [latLng, setLatLng] = useState<LatLng | undefined>(undefined);
    const map = useMap();
    map.addEventListener('mousemove', (e) => setLatLng(e.latlng))

    return (
        <div
            className="coordinates-display"
        >
            {`( ${latLng?.lat.toFixed(NUMBER_OF_FIXED_DECIMALS)}, ${latLng?.lng.toFixed(NUMBER_OF_FIXED_DECIMALS)} )`}
        </div>
    );
}