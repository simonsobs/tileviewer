export type MapResponse = {
    id: number;
    description: string;
    tags: string;
    telescope: string;
    name: string;
    data_release: string;
    season: string;
    patch: string;
}

export type Band = {
    id: number;
    map_id: number;
    map_name: string;
    units: string;
    tiles_available: boolean;
    tile_size: number;
    frequency: number;
    levels: number;
    stokes_parameter: string;
    quantity: string;
    bounding_top: number;
    bounding_right: number;
    bounding_bottom: number;
    bounding_left: number;
    recommended_cmap: string;
    recommended_cmap_min: number;
    recommended_cmap_max: number;
}

export type MapMetadataResponse = MapResponse & {
    bands: Band[];
}

export type HistogramResponse = {
    edges: number[];
    histogram: number[];
    band_id: number;
}

export type GraticuleDetails = {
    pixelWidth: number;
    interval: number;
}

export type SourceListResponse = {
    /** id of the source catalog */
    id: number;
    /** name of the source list */
    name: string;
    /** optional description attribute */
    description?: string;
}

export type Source = {
    /** id of the source */
    id: number;
    /** id of the source catalog containing this source */
    source_list_id: number;
    /** value of flux for the source */
    flux: number;
    /** value of right ascension for the source */
    ra: number;
    /** value of declination for the source */
    dec: number;
    /** optional name attribute */
    name?: string;
}

export interface SourceList extends SourceListResponse {
    /** the list of sources associated with a SourceList catalog */
    sources: Source[];
}

export type Box = {
    id: number;
    name: string;
    description: string;
    top_left_ra: number;
    top_left_dec: number;
    bottom_right_ra: number;
    bottom_right_dec: number;
}