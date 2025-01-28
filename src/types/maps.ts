export type MapResponse = {
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
    pixelWidth: number,
    interval: number,
}