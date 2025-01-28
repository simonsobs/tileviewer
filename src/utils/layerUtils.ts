import { Band } from "../types/maps";

/**
 * A utility function to format a layer's name.
 * @param band The band object
 * @returns A string of map_name + quantity, where quantity is conditionally
 *          rendered based on its truthiness
 */
export function makeLayerName(band: Band) {
    return band.map_name + (band.quantity ? ` ${band.quantity}` : '')
}
