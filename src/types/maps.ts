export type MapGroupResponse = {
  grant: string;
  name: string;
  description: string;
  maps: MapResponse[];
};

export type MapResponse = {
  grant: string;
  map_id: string;
  name: string;
  description: string;
  bands: BandResponse[];
};

export type BandResponse = {
  grant: string;
  band_id: string;
  name: string;
  description: string;
  layers: LayerResponse[];
};

export type LayerResponse = {
  grant: string;
  layer_id: string;
  name: string;
  description: string;
  provider: {
    provider_name: string;
    filename: string;
    hdu: number;
    index: number;
  };
  bounding_left: number;
  bounding_right: number;
  bounding_top: number;
  bounding_bottom: number;
  quantity: string;
  units: string;
  number_of_levels: number;
  tile_size: number;
  vmin: number;
  vmax: number;
  cmap: string;
};

type EnhancedLayerAttributes = {
  mapId: string;
  bandId: string;
  recommendedCmapValuesRange: number;
  isLogScale: boolean;
  isAbsoluteValue: boolean;
};

export type InternalBaselayer = LayerResponse & EnhancedLayerAttributes;

export type HistogramResponse = {
  edges: number[];
  histogram: number[];
  band_id: number;
};

export type GraticuleDetails = {
  pixelWidth: number;
  interval: number;
};

export type SourceGroupResponse = {
  /** id of the source catalog */
  source_group_id: string;
  /** name of the source group */
  name: string;
  /** optional description attribute */
  description?: string;
};

export type Source = {
  /** optional name attribute */
  name?: string;
  /** value of right ascension for the source */
  ra: number;
  /** value of declination for the source */
  dec: number;
  /** additional information about the source */
  extra: Record<string, unknown>;
};

export type SourceData = Source & { id: string };

export interface SourceGroup extends SourceGroupResponse {
  /** the list of sources associated with a source catalog */
  sources: Source[];
}

export type BoxExtent = {
  top_left_ra: number;
  top_left_dec: number;
  bottom_right_ra: number;
  bottom_right_dec: number;
};

export type BoxResponse = BoxExtent & {
  grant: string;
  name: string;
  description: string;
};

export type Box = BoxResponse & {
  id: number;
};

type TileUrlFunction = (x: number[]) => string;

export type ExternalBaselayer = {
  layer_id: string;
  name: string;
  projection: string;
  url: string | TileUrlFunction;
  extent: number[];
  maxZoom: number;
  disabledState: (state: boolean) => boolean;
};

export type BaselayersState = {
  /** the active baselayer selected in the map's legend */
  activeBaselayer?: InternalBaselayer | ExternalBaselayer;
  /** the internal SO layers used as baselayers */
  internalBaselayers?: InternalBaselayer[];
};

export type SubmapData = {
  layer_id: string;
  vmin: number | undefined;
  vmax: number | undefined;
  cmap: string | undefined;
};

export type SubmapDataWithBounds = SubmapData & {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type BoxWithDimensions = Box & {
  width: number;
  height: number;
};

export type NewBoxData = Omit<Box, 'id' | 'name' | 'description' | 'grant'> & {
  width: number;
  height: number;
};
