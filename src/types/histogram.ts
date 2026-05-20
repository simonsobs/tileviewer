export type HistogramResponse = {
  edges: number[];
  histogram: number[];
  band_id: number;
  vmin: number;
  vmax: number;
};

export type HistogramData = Omit<HistogramResponse, 'vmin' | 'vmax'>;
