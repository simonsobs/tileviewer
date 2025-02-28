import { Band, BaselayerState } from '../types/maps';

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
  newBaselayer: Band;
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
      /**
       * If we've yet to set an activeBaselayer or the units change between baselayers,
       * we need to update the state of cmap properties to the band's recommended values
       */
      if (
        !state.activeBaselayer ||
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
    }
    default: {
      throw Error('Unknown action');
    }
  }
}
