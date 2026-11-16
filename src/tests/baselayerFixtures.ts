import { BaselayersState, InternalBaselayer } from '../types/layers';
import { HistogramResponse } from '../types/histogram';

/**
 * Builds an internal baselayer of the 'uK-T' map type, with overrides for anything a test cares about.
 * Includes 'grant' since that's what assertInternalBaselayer checks for.
 */
export function makeLayer(
  layerId: string,
  overrides: Partial<InternalBaselayer> = {}
): InternalBaselayer {
  return {
    layer_id: layerId,
    name: layerId,
    description: '',
    grant: null,
    units: 'uK',
    quantity: 'T',
    cmap: 'viridis',
    vmin: -100,
    vmax: 100,
    isLogScale: false,
    isAbsoluteValue: false,
    ...overrides,
  } as unknown as InternalBaselayer;
}

export const HISTOGRAM_DATA: HistogramResponse = {
  vmin: -200,
  vmax: 200,
  edges: [-200, -100, 0, 100, 200],
  histogram: [1, 10, 10, 1],
  band_id: 1,
};

/** Builds a loaded state whose active baselayer is the first of the given layers */
export function makeState(
  layers: InternalBaselayer[],
  syncedKeys: string[] = []
): BaselayersState {
  return {
    activeBaselayer: layers[0],
    internalBaselayers: new Map(layers.map((l) => [l.layer_id, l])),
    histogramData: HISTOGRAM_DATA,
    syncedCmapValuesByType: new Map(
      syncedKeys.map((key) => {
        const layer = layers.find((l) => `${l.units}-${l.quantity}` === key)!;
        const { cmap, vmin, vmax, isLogScale, isAbsoluteValue } = layer;
        return [key, { cmap, vmin, vmax, isLogScale, isAbsoluteValue }];
      })
    ),
  };
}
