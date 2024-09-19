import { useState, useEffect } from "react";
import { useMap, useMapEvent } from "react-leaflet";
import { Map } from "leaflet";
import './styles/astro-scale.css';

const MAX_WIDTH = 300;

export function AstroScale() {
    const map = useMap();
    const [scaleUnitName, setScaleUnitName] = useState('arcsec');
    const [scaleUnit, setScaleUnit] = useState<number | undefined>(undefined);
    const [scaleWidth, setScaleWidth] = useState<number | undefined>(undefined)
    
    useMapEvent('moveend', () => {
        const { unitName, unit, width } = getScaleParams(map)
        setScaleUnitName(unitName);
        setScaleUnit(unit);
        setScaleWidth(width);
    })

    useEffect(() => {
        const { unitName, unit, width } = getScaleParams(map)
        setScaleUnitName(unitName);
        setScaleUnit(unit);
        setScaleWidth(width);
    }, [])

    return (
        <div
            className="astro-scale"
            style={{
                width: scaleWidth + 'px',
            }}
        >
            {scaleUnit} {scaleUnitName}
        </div>
    )
}

function getScaleParams(map: Map): { unitName: string, unit: number, width: number } {
    const center = map.getCenter();
    const y = map.getSize().y / 2;
    const maxMeters = map.distance(
        map.containerPointToLatLng([0, y]),
        map.containerPointToLatLng([MAX_WIDTH, y]),
    )

    const maxArcsec = Math.abs(maxMeters / (Math.cos(center.lat) * 1852 / 60));
    let maxUnit = maxArcsec;
    let unitName = 'arcsec';

    if (maxArcsec > 7200) {
        maxUnit /= 3600;
        unitName = 'deg';
    } else if (maxArcsec >= 180) {
        maxUnit /= 60;
        unitName = 'arcmin';
    }

    const unit = getRoundNum(maxUnit);
    const ratio = unit / maxUnit;

    return {
        unitName,
        unit,
        width: Math.round(MAX_WIDTH * ratio),
    }
}

// method taken from leaflet's Control.Scale source code
function getRoundNum(num: number) {
    const pow10 = Math.pow(10, (`${Math.floor(num)}`).length - 1);
    let d = num / pow10;

    d = d >= 10 ? 10 :
        d >= 5 ? 5 :
        d >= 3 ? 3 :
        d >= 2 ? 2 : 1;

    return pow10 * d;
}