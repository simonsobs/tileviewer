import { Band, MapMetadataResponse } from "../types/maps";

export function makeLayerName(mapMetadata: MapMetadataResponse, bandData: Band) {
    return `${mapMetadata.telescope} ${mapMetadata.data_release} ${bandData.frequency} GHz (${bandData.stokes_parameter}, ${mapMetadata.tags})`
}
