import { HistogramResponse } from './histogram';

export type MapGroupSummary = {
  map_group_id: string;
  name: string;
  description: string;
};

export type MapSummary = {
  map_id: string;
  name: string;
  description: string;
};

export type BandSummary = {
  band_id: string;
  name: string;
  description: string;
};

export type LayerSummary = {
  layer_id: string;
  name: string;
  description: string;
};

export type MapGroup = MapGroupSummary & {
  maps: (MapSummary & {
    bands: (BandSummary & { layers: LayerSummary[] })[];
  })[];
};

export type LayerResponse = LayerSummary & {
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
  /** layers' vmin/vmax are either predefined or set to 'auto' */
  vmin: number | 'auto';
  vmax: number | 'auto';
  cmap: string;
};

export type DefaultLayer = LayerResponse & {
  map_group_id: string;
  map_id: string;
  band_id: string;
};

type EnhancedLayerAttributes = {
  mapId: string;
  bandId: string;
  isLogScale: boolean;
  isAbsoluteValue: boolean;
};

export type InternalBaselayer = Omit<LayerResponse, 'vmin' | 'vmax'> & {
  /** After processing layer response, 'auto' gets set to undefined and later
   * set to a value from the layer's histogram response
   */
  vmin: undefined | number;
  vmax: undefined | number;
} & EnhancedLayerAttributes;

export type GraticuleDetails = {
  pixelWidth: number;
  interval: number;
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
  internalBaselayers?: Map<string, InternalBaselayer>;
  /** the active baselayer's histogram data */
  histogramData?: HistogramResponse;
};
