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
        latLng && (
            <div
                className="coordinates-display"
            >
                <span className="parens">( </span>
                <span className="coords lat">{latLng?.lat.toFixed(NUMBER_OF_FIXED_DECIMALS)} ,</span>
                <span className="coords lng">{latLng?.lng.toFixed(NUMBER_OF_FIXED_DECIMALS)}</span>
                <span className="parens"> )</span>
            </div>
        )
    );
}