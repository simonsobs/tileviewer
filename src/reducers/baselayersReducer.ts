import {
  BaselayersState,
  ExternalBaselayer,
  InternalBaselayer,
} from '../types/maps';
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

export const initialBaselayersState: BaselayersState = {
  activeBaselayer: undefined,
  internalBaselayers: undefined,
};

export const CHANGE_CMAP_TYPE = 'CHANGE_CMAP';
export const CHANGE_LOG_SCALE = 'CHANGE_LOG_SCALE';
export const CHANGE_ABSOLUTE_VALUE = 'CHANGE_ABSOLUTE_VALUE';
export const CHANGE_CMAP_VALUES = 'CHANGE_CMAP_VALUES';
export const CHANGE_BASELAYER = 'CHANGE_BASELAYER';
export const SET_BASELAYERS_STATE = 'SET_BASELAYERS_STATE';

type ChangeCmapAction = {
  type: typeof CHANGE_CMAP_TYPE;
  activeBaselayer: InternalBaselayer | ExternalBaselayer;
  cmap: string;
};

type ChangeLogScaleAction = {
  type: typeof CHANGE_LOG_SCALE;
  activeBaselayer: InternalBaselayer | ExternalBaselayer;
  isLogScale: boolean;
};

type ChangeAbsoluteValueAction = {
  type: typeof CHANGE_ABSOLUTE_VALUE;
  activeBaselayer: InternalBaselayer | ExternalBaselayer;
  isAbsoluteValue: boolean;
};

type ChangeCmapValuesAction = {
  type: typeof CHANGE_CMAP_VALUES;
  activeBaselayer: InternalBaselayer | ExternalBaselayer;
  vmin: number;
  vmax: number;
};

type ChangeBaselayerAction = {
  type: typeof CHANGE_BASELAYER;
  newBaselayer: InternalBaselayer | ExternalBaselayer;
};

type SetBaselayersAction = {
  type: typeof SET_BASELAYERS_STATE;
  internalBaselayers: InternalBaselayer[];
};

export type Action =
  | ChangeCmapAction
  | ChangeLogScaleAction
  | ChangeAbsoluteValueAction
  | ChangeCmapValuesAction
  | ChangeBaselayerAction
  | SetBaselayersAction;

export function baselayersReducer(state: BaselayersState, action: Action) {
  switch (action.type) {
    case 'SET_BASELAYERS_STATE': {
      return {
        internalBaselayers: action.internalBaselayers,
        activeBaselayer: action.internalBaselayers[0],
      };
    }
    case 'CHANGE_CMAP': {
      if (assertInternalBaselayer(action.activeBaselayer)) {
        const updatedActiveBaselayer = {
          ...action.activeBaselayer,
          cmap: action.cmap,
        };
        return {
          internalBaselayers: state.internalBaselayers?.map((layer) => {
            if (
              layer.layer_id ===
              (action.activeBaselayer as InternalBaselayer).layer_id
            ) {
              return updatedActiveBaselayer;
            } else {
              return layer;
            }
          }),
          activeBaselayer: updatedActiveBaselayer,
        };
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_LOG_SCALE': {
      if (assertInternalBaselayer(action.activeBaselayer)) {
        const { activeBaselayer, isLogScale } = action;
        const { vmin, vmax } = action.activeBaselayer;
        const safeLogMin = safeLog(vmin);

        const newMin = isLogScale
          ? safeLogMin === 0
            ? 1
            : safeLogMin
          : Math.pow(10, vmin);

        const newMax = isLogScale ? safeLog(vmax) : Math.pow(10, vmax);

        const updatedActiveBaselayer = {
          ...activeBaselayer,
          vmin: newMin,
          vmax: newMax,
          isLogScale: action.isLogScale,
        };

        return {
          internalBaselayers: state.internalBaselayers?.map((layer) => {
            if (
              layer.layer_id ===
              (action.activeBaselayer as InternalBaselayer).layer_id
            ) {
              return updatedActiveBaselayer;
            } else {
              return layer;
            }
          }),
          activeBaselayer: updatedActiveBaselayer,
        };
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_ABSOLUTE_VALUE': {
      if (assertInternalBaselayer(action.activeBaselayer)) {
        const { vmin, vmax, recommendedCmapValuesRange } =
          action.activeBaselayer;

        let min = vmin;
        let max = vmax;

        if (action.isAbsoluteValue && vmin < 0) {
          min = 0;
        }

        if (action.isAbsoluteValue && vmax < 0) {
          max = recommendedCmapValuesRange * 0.1;
        }

        const updatedActiveBaselayer = {
          ...action.activeBaselayer,
          isAbsoluteValue: action.isAbsoluteValue,
          vmin: min,
          vmax: max,
        };

        return {
          internalBaselayers: state.internalBaselayers?.map((layer) => {
            if (
              layer.layer_id ===
              (action.activeBaselayer as InternalBaselayer).layer_id
            ) {
              return updatedActiveBaselayer;
            } else {
              return layer;
            }
          }),
          activeBaselayer: updatedActiveBaselayer,
        };
      } else {
        return {
          ...state,
        };
      }
    }
    case 'CHANGE_CMAP_VALUES': {
      if (assertInternalBaselayer(action.activeBaselayer)) {
        const updatedActiveBaselayer = {
          ...action.activeBaselayer,
          vmin: action.vmin,
          vmax: action.vmax,
        };
        return {
          internalBaselayers: state.internalBaselayers?.map((layer) => {
            if (
              layer.layer_id ===
              (action.activeBaselayer as InternalBaselayer).layer_id
            ) {
              return updatedActiveBaselayer;
            } else {
              return layer;
            }
          }),
          activeBaselayer: updatedActiveBaselayer,
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
