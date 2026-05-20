export type BoxExtent = {
  top_left_ra: number;
  top_left_dec: number;
  bottom_right_ra: number;
  bottom_right_dec: number;
};

export type BoxResponse = BoxExtent & {
  name: string;
  description: string;
};

export type Box = BoxResponse & {
  id: number;
};

export type SubmapData = {
  layer_id: string;
  vmin: number | undefined;
  vmax: number | undefined;
  cmap: string | undefined;
  isLogScale: boolean;
  isAbsoluteValue: boolean;
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

export type NewBoxData = Omit<Box, 'id' | 'name' | 'description'> & {
  width: number;
  height: number;
};
