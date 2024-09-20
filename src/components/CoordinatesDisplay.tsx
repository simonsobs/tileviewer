import { useMap } from "react-leaflet";
import { LatLng } from "leaflet";
import { useState } from "react";
import { NUMBER_OF_FIXED_COORDINATE_DECIMALS } from "../configs/mapSettings";
import './styles/coordinates-display.css';

/**
 * QUESTION: Would this be better as an extended L.Control?
 */

export function CoordinatesDisplay() {
    const [latLng, setLatLng] = useState<LatLng | undefined>(undefined);
    const map = useMap();
    map.addEventListener('mousemove', (e) => setLatLng(e.latlng));
    map.addEventListener('mouseout', () => latLng ? setLatLng(undefined) : null);

    return (
        latLng && (
            <div
                className="coordinates-display"
            >
                <span className="parens">( </span>
                <span className="coords lat">{latLng?.lat.toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)} ,</span>
                <span className="coords lng">{latLng?.lng.toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)}</span>
                <span className="parens"> )</span>
            </div>
        )
    );
}