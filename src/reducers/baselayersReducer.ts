import { EXTERNAL_BASELAYERS } from '../configs/mapConfigs';
import {
  BaselayersState,
  ExternalBaselayer,
  InternalBaselayer,
  SyncedCmapValues,
} from '../types/layers';
import { HistogramResponse } from '../types/histogram';
import { safeLog } from '../utils/numberUtils';

export function assertExternalBaselayer(
  baselayer: InternalBaselayer | ExternalBaselayer | undefined
): baselayer is ExternalBaselayer {
  return baselayer !== undefined && 'url' in baselayer;
}

export function assertInternalBaselayer(
  baselayer: InternalBaselayer | ExternalBaselayer | undefined
): baselayer is InternalBaselayer {
  return baselayer !== undefined && 'grant' in baselayer;
}

export function getMapTypeKey(baselayer: InternalBaselayer) {
  return `${baselayer.units}-${baselayer.quantity}`;
}

function getSyncedCmapValues(baselayer: InternalBaselayer): SyncedCmapValues {
  return {
    cmap: baselayer.cmap,
    vmin: baselayer.vmin,
    vmax: baselayer.vmax,
    isLogScale: baselayer.isLogScale,
    isAbsoluteValue: baselayer.isAbsoluteValue,
  };
}

/**
 * Sets the updated active baselayer in state and, if its units-quantity type is synced,
 * propagates its cmap values to the synced Map and all loaded layers of the same type
 */
function applyCmapChange(
  state: BaselayersState,
  updatedActiveBaselayer: InternalBaselayer
): BaselayersState {
  const internalBaselayers = new Map(state.internalBaselayers);
  internalBaselayers.set(
    updatedActiveBaselayer.layer_id,
    updatedActiveBaselayer
  );

  const mapTypeKey = getMapTypeKey(updatedActiveBaselayer);
  if (!state.syncedCmapValuesByType?.has(mapTypeKey)) {
    return {
      ...state,
      internalBaselayers,
      activeBaselayer: updatedActiveBaselayer,
    };
  }

  const syncedValues = getSyncedCmapValues(updatedActiveBaselayer);
  const syncedCmapValuesByType = new Map(state.syncedCmapValuesByType);
  syncedCmapValuesByType.set(mapTypeKey, syncedValues);

  internalBaselayers.forEach((layer, id) => {
    if (getMapTypeKey(layer) === mapTypeKey) {
      internalBaselayers.set(id, { ...layer, ...syncedValues });
    }
  });

  return {
    ...state,
    internalBaselayers,
    activeBaselayer: updatedActiveBaselayer,
    syncedCmapValuesByType,
  };
}

export const initialBaselayersState: BaselayersState = {
  activeBaselayer: undefined,
  internalBaselayers: undefined,
  histogramData: undefined,
  syncedCmapValuesByType: undefined,
};

export const CHANGE_CMAP_TYPE = 'CHANGE_CMAP';
export const CHANGE_LOG_SCALE = 'CHANGE_LOG_SCALE';
export const CHANGE_ABSOLUTE_VALUE = 'CHANGE_ABSOLUTE_VALUE';
export const CHANGE_CMAP_VALUES = 'CHANGE_CMAP_VALUES';
export const CHANGE_BASELAYER = 'CHANGE_BASELAYER';
export const SET_BASELAYERS_STATE = 'SET_BASELAYERS_STATE';
export const CHANGE_SYNC_CMAP_VALUES = 'CHANGE_SYNC_CMAP_VALUES';

export type ChangeCmapAction = {
  type: typeof CHANGE_CMAP_TYPE;
  cmap: string;
};

export type ChangeLogScaleAction = {
  type: typeof CHANGE_LOG_SCALE;
  isLogScale: boolean;
};

export type ChangeAbsoluteValueAction = {
  type: typeof CHANGE_ABSOLUTE_VALUE;
  isAbsoluteValue: boolean;
};

export type ChangeCmapValuesAction = {
  type: typeof CHANGE_CMAP_VALUES;
  vmin: number;
  vmax: number;
};

type ChangeSyncCmapValuesAction = {
  type: typeof CHANGE_SYNC_CMAP_VALUES;
};

type ChangeBaselayerAction = {
  type: typeof CHANGE_BASELAYER;
  newBaselayer: InternalBaselayer | ExternalBaselayer;
  histogramData?: HistogramResponse;
};

type SetBaselayersAction = {
  type: typeof SET_BASELAYERS_STATE;
  defaultInternalBaselayer: InternalBaselayer | undefined;
  histogramData: HistogramResponse | undefined;
};

export type BaselayersAction =
  | ChangeCmapAction
  | ChangeLogScaleAction
  | ChangeAbsoluteValueAction
  | ChangeCmapValuesAction
  | ChangeSyncCmapValuesAction
  | ChangeBaselayerAction
  | SetBaselayersAction;

export function baselayersReducer(
  state: BaselayersState,
  action: BaselayersAction
) {
  switch (action.type) {
    case 'SET_BASELAYERS_STATE': {
      const internalBaselayers = new Map();
      const hasDefaultBaselayer = assertInternalBaselayer(
        action.defaultInternalBaselayer
      );

      if (hasDefaultBaselayer) {
        internalBaselayers.set(
          action.defaultInternalBaselayer!.layer_id,
          action.defaultInternalBaselayer
        );
      }
      return {
        internalBaselayers,
        // If no internalBaselayers are returned from server request, set activeBaselayer to be first external baselayer; note
        // that the histogramData in this scenario will be set to undefined
        activeBaselayer: hasDefaultBaselayer
          ? action.defaultInternalBaselayer
          : EXTERNAL_BASELAYERS[0],
        histogramData: action.histogramData,
        syncedCmapValuesByType: new Map(),
      };
    }
    case 'CHANGE_CMAP': {
      const { activeBaselayer } = state;
      if (assertInternalBaselayer(activeBaselayer)) {
        const updatedActiveBaselayer = {
          ...activeBaselayer,
          cmap: action.cmap,
        };
        return applyCmapChange(state, updatedActiveBaselayer);
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_LOG_SCALE': {
      const { activeBaselayer } = state;
      if (assertInternalBaselayer(activeBaselayer)) {
        const { isLogScale } = action;
        const { vmin, vmax } = activeBaselayer;

        // Return early if vmin or vmax are undefined
        if (vmin === undefined || vmax === undefined) return { ...state };

        const safeLogMin = safeLog(vmin);
        const safeLogMax = safeLog(vmax);

        const newMin = isLogScale
          ? safeLogMin === 0
            ? 1
            : safeLogMin
          : Math.pow(10, vmin);

        // Handle case in which vmax is invalid in log scale
        const newMax = isLogScale
          ? safeLogMax === 0
            ? 2
            : safeLogMax
          : Math.pow(10, vmax);

        const updatedActiveBaselayer = {
          ...activeBaselayer,
          vmin: newMin,
          vmax: newMax,
          isLogScale: action.isLogScale,
        };

        return applyCmapChange(state, updatedActiveBaselayer);
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_ABSOLUTE_VALUE': {
      const { activeBaselayer } = state;
      if (assertInternalBaselayer(activeBaselayer)) {
        const { vmin, vmax } = activeBaselayer;

        // Return early if vmin or vmax are undefined
        if (vmin === undefined || vmax === undefined) return { ...state };

        let min = vmin;
        let max = vmax;

        if (action.isAbsoluteValue && vmin < 0) {
          min = 0;
        }

        if (action.isAbsoluteValue && vmax < 0 && state.histogramData) {
          max = state.histogramData.vmax - state.histogramData.vmin;
        }

        const updatedActiveBaselayer = {
          ...activeBaselayer,
          isAbsoluteValue: action.isAbsoluteValue,
          vmin: min,
          vmax: max,
        };

        return applyCmapChange(state, updatedActiveBaselayer);
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_CMAP_VALUES': {
      const { activeBaselayer } = state;
      if (assertInternalBaselayer(activeBaselayer)) {
        const updatedActiveBaselayer = {
          ...activeBaselayer,
          vmin: action.vmin,
          vmax: action.vmax,
        };
        return applyCmapChange(state, updatedActiveBaselayer);
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_SYNC_CMAP_VALUES': {
      const { activeBaselayer } = state;
      if (!assertInternalBaselayer(activeBaselayer)) return { ...state };

      const mapTypeKey = getMapTypeKey(activeBaselayer);
      const syncedCmapValuesByType = new Map(state.syncedCmapValuesByType);

      // if map type was synced, just delete from Map and do nothing else
      if (syncedCmapValuesByType.has(mapTypeKey)) {
        syncedCmapValuesByType.delete(mapTypeKey);
        return {
          ...state,
          syncedCmapValuesByType,
        };
      }

      // otherwise, mark the map type as synced and sync any matching "map type" layers
      syncedCmapValuesByType.set(
        mapTypeKey,
        getSyncedCmapValues(activeBaselayer)
      );
      return applyCmapChange(
        { ...state, syncedCmapValuesByType },
        activeBaselayer
      );
    }
    case 'CHANGE_BASELAYER': {
      const { newBaselayer, histogramData } = action;
      const internalBaselayers = new Map(state.internalBaselayers);

      const isNewInternalBaselayer =
        assertInternalBaselayer(newBaselayer) &&
        !state.internalBaselayers?.has(newBaselayer.layer_id);

      let layer = newBaselayer;

      // when loading a new baselayer, check if its units-quantity is in the synced Map and apply if so
      if (isNewInternalBaselayer) {
        const syncedValues = state.syncedCmapValuesByType?.get(
          getMapTypeKey(newBaselayer)
        );

        layer = syncedValues
          ? {
              ...newBaselayer,
              ...syncedValues,
            }
          : {
              ...newBaselayer,
            };

        internalBaselayers.set(layer.layer_id, layer);
      }

      return {
        ...state,
        internalBaselayers,
        activeBaselayer: layer,
        ...(histogramData && { histogramData }),
      };
    }
    default: {
      throw Error('Unknown action');
    }
  }
}
