import { Band } from "../types/maps";

/**
 * A utility function to format a layer's name.
 * @param band The band object
 * @returns A string of map_name + stokes_parameter + quantity, where quantity 
 *  and stokes_parameter are conditionally rendered based on their truthiness
 */
export function makeLayerName(band: Band) {
    return band.map_name + 
        (band.stokes_parameter ? ` ${band.stokes_parameter}` : '') + 
        (band.quantity ? ` ${band.quantity}` : '')
}

export function getTopLeftBottomRightFromBounds(bounds: L.LatLngBounds) {
    const top = bounds.getNorth();
    const left = bounds.getWest();
    const bottom = bounds.getSouth();
    const right = bounds.getEast();

    return {
        top,
        left,
        bottom,
        right,
    }
}
