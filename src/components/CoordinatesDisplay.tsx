import { useMap } from "react-leaflet";
import { LatLng, LeafletMouseEvent } from "leaflet";
import { useCallback, useEffect, useState } from "react";
import { NUMBER_OF_FIXED_COORDINATE_DECIMALS } from "../configs/mapSettings";
import './styles/coordinates-display.css';

/**
 * QUESTION: Would this be better as an extended L.Control?
 */

export function CoordinatesDisplay() {
    const [latLng, setLatLng] = useState<LatLng | undefined>(undefined);
    const map = useMap();

    const handleMouseMove = useCallback(
        (e: LeafletMouseEvent) => {
            setLatLng(e.latlng)
        }, [setLatLng]
    );

    const handleMouseOut = useCallback(
        () => latLng ? setLatLng(undefined) : null,
        [latLng, setLatLng]
    )
    
    useEffect(
        () => {
            map.on('mousemove', handleMouseMove);
            map.on('mouseout', handleMouseOut);

            return function cleanup() {
                map.off('mousemove', handleMouseMove);
                map.off('mouseout', handleMouseOut);
            }
        }, [map, handleMouseMove, handleMouseOut]
    )

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