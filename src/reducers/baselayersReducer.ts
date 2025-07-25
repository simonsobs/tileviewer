import {
  BandWithCmapValues,
  BaselayersState,
  ExternalBaselayer,
  MapMetadataResponseWithClientBand,
} from '../types/maps';

export function assertExternalBaselayer(
  baselayer: BandWithCmapValues | ExternalBaselayer | undefined
): baselayer is ExternalBaselayer {
  return baselayer !== undefined && 'url' in baselayer;
}

export function assertBand(
  baselayer: BandWithCmapValues | ExternalBaselayer | undefined
): baselayer is BandWithCmapValues {
  return baselayer !== undefined && 'map_id' in baselayer;
}

export const initialBaselayersState: BaselayersState = {
  activeBaselayer: undefined,
  internalBaselayerMaps: undefined,
};

export const CHANGE_CMAP_TYPE = 'CHANGE_CMAP';
export const CHANGE_CMAP_VALUES = 'CHANGE_CMAP_VALUES';
export const CHANGE_BASELAYER = 'CHANGE_BASELAYER';
export const SET_BASELAYERS_STATE = 'SET_BASELAYERS_STATE';

type ChangeCmapAction = {
  type: typeof CHANGE_CMAP_TYPE;
  activeBaselayer: BandWithCmapValues | ExternalBaselayer;
  cmap: string;
};

type ChangeCmapValuesAction = {
  type: typeof CHANGE_CMAP_VALUES;
  activeBaselayer: BandWithCmapValues | ExternalBaselayer;
  cmapValues: {
    min: number;
    max: number;
  };
};

type ChangeBaselayerAction = {
  type: typeof CHANGE_BASELAYER;
  newBaselayer: BandWithCmapValues | ExternalBaselayer;
};

type SetBaselayersAction = {
  type: typeof SET_BASELAYERS_STATE;
  baselayerMaps: MapMetadataResponseWithClientBand[];
};

export type Action =
  | ChangeCmapAction
  | ChangeCmapValuesAction
  | ChangeBaselayerAction
  | SetBaselayersAction;

export function baselayersReducer(state: BaselayersState, action: Action) {
  switch (action.type) {
    case 'SET_BASELAYERS_STATE': {
      return {
        internalBaselayerMaps: action.baselayerMaps,
        activeBaselayer: action.baselayerMaps[0].bands[0],
      };
    }
    case 'CHANGE_CMAP': {
      if (assertBand(action.activeBaselayer)) {
        const activeBaselayer = {
          ...action.activeBaselayer,
          cmap: action.cmap,
        };
        return {
          internalBaselayerMaps: state.internalBaselayerMaps?.map((map) => {
            if (
              'map_id' in action.activeBaselayer &&
              map.id === action.activeBaselayer.map_id
            ) {
              return {
                ...map,
                bands: map.bands.map((b) =>
                  b.id === action.activeBaselayer.id ? activeBaselayer : b
                ),
              };
            } else {
              return map;
            }
          }),
          activeBaselayer,
        };
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_CMAP_VALUES': {
      if (assertBand(action.activeBaselayer)) {
        const activeBaselayer = {
          ...action.activeBaselayer,
          cmapValues: {
            min: action.cmapValues.min,
            max: action.cmapValues.max,
            recommendedRange:
              action.activeBaselayer.cmapValues.recommendedRange,
          },
        };
        return {
          internalBaselayerMaps: state.internalBaselayerMaps?.map((map) => {
            if (
              'map_id' in action.activeBaselayer &&
              map.id === action.activeBaselayer.map_id
            ) {
              return {
                ...map,
                bands: map.bands.map((b) =>
                  b.id === action.activeBaselayer.id ? activeBaselayer : b
                ),
              };
            } else {
              return map;
            }
          }),
          activeBaselayer,
        };
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_BASELAYER': {
      const { newBaselayer } = action;

      return {
        ...state,
        activeBaselayer: newBaselayer,
      };
    }
    default: {
      throw Error('Unknown action');
    }
  }
}
