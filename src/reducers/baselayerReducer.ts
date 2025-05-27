import { Band, BaselayerState, ExternalBaselayer } from '../types/maps';

export function assertExternalBaselayer(
  baselayer: Band | ExternalBaselayer | undefined
): baselayer is ExternalBaselayer {
  return baselayer !== undefined && 'url' in baselayer;
}

export function assertBand(
  baselayer: Band | ExternalBaselayer | undefined
): baselayer is Band {
  return baselayer !== undefined && 'map_id' in baselayer;
}

export const initialBaselayerState: BaselayerState = {
  activeBaselayer: undefined,
  cmap: undefined,
  cmapValues: undefined,
};

export const CHANGE_CMAP_TYPE = 'CHANGE_CMAP';
export const CHANGE_CMAP_VALUES = 'CHANGE_CMAP_VALUES';
export const CHANGE_BASELAYER = 'CHANGE_BASELAYER';

type ChangeCmapAction = {
  type: typeof CHANGE_CMAP_TYPE;
  cmap: string;
};

type ChangeCmapValuesAction = {
  type: typeof CHANGE_CMAP_VALUES;
  cmapValues: {
    min: number;
    max: number;
  };
};

type ChangeBaselayer = {
  type: typeof CHANGE_BASELAYER;
  newBaselayer: Band | ExternalBaselayer;
};

type Action = ChangeCmapAction | ChangeCmapValuesAction | ChangeBaselayer;

export function baselayerReducer(state: BaselayerState, action: Action) {
  switch (action.type) {
    case 'CHANGE_CMAP': {
      return {
        ...state,
        cmap: action.cmap,
      };
    }
    case 'CHANGE_CMAP_VALUES': {
      return {
        ...state,
        cmapValues: {
          min: action.cmapValues.min,
          max: action.cmapValues.max,
        },
      };
    }
    case 'CHANGE_BASELAYER': {
      const { newBaselayer } = action;

      if (assertExternalBaselayer(newBaselayer)) {
        return {
          cmap: undefined,
          cmapValues: undefined,
          activeBaselayer: newBaselayer,
        };
      }

      if (assertBand(newBaselayer)) {
        /**
         * If we've yet to set an activeBaselayer or we're switching from ExternalBaselayer to a
         * Band or the units change between Band baselayers, we need to update the state of cmap
         * properties to the band's recommended values
         */
        if (
          !state.activeBaselayer ||
          assertExternalBaselayer(state.activeBaselayer) ||
          newBaselayer.units !== state.activeBaselayer.units
        ) {
          return {
            cmap: newBaselayer.recommended_cmap,
            cmapValues: {
              min: newBaselayer.recommended_cmap_min,
              max: newBaselayer.recommended_cmap_max,
            },
            activeBaselayer: newBaselayer,
          };
        } else {
          /**
           * Since units aren't changing and we have an already-defined activeBaselayer,
           * simply set a new activeBaselayer
           */
          return {
            ...state,
            activeBaselayer: action.newBaselayer,
          };
        }
      } else {
        /** Fallback to only updating activeBaselayer */
        return {
          ...state,
          activeBaselayer: action.newBaselayer,
        };
      }
    }
    default: {
      throw Error('Unknown action');
    }
  }
}
