import { useCallback, useMemo, useState, useReducer } from 'react';
import { DefaultData } from './types/layers';
import { ColorMapControls } from './components/ColorMapControls';
import { fetchInitialState, getHistogramData } from './utils/fetchUtils';
import {
  assertInternalBaselayer,
  baselayersReducer,
  CHANGE_CMAP_TYPE,
  CHANGE_CMAP_VALUES,
  CHANGE_LOG_SCALE,
  CHANGE_ABSOLUTE_VALUE,
  initialBaselayersState,
  SET_BASELAYERS_STATE,
} from './reducers/baselayersReducer';
import { useQuery } from './hooks/useQuery';
import { OpenLayersMap } from './components/OpenLayersMap';
import { Login } from './components/Login';
import { LoadingOverlay } from './components/LoadingOverlay';

function App() {
  /** contains useful state of the baselayer for tile requests and matplotlib color mapping */
  const [baselayersState, dispatchBaselayersChange] = useReducer(
    baselayersReducer,
    initialBaselayersState
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  /** Fetch the default state to use as the initial baselayer and layer menu  hierarchy */
  const { data: defaultData, isLoading: isInitializing } = useQuery<
    DefaultData | undefined
  >({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      const {
        defaultMenuState,
        defaultLayer,
        defaultMapGroupId,
        defaultBandId,
        defaultMapId,
      } = await fetchInitialState();

      if (!defaultLayer) {
        // If default state errors or is null, SET_BASELAYERS_STATE will fall back to an external baselayer as its default initial baselayer
        dispatchBaselayersChange({
          type: SET_BASELAYERS_STATE,
          defaultInternalBaselayer: undefined,
          histogramData: undefined,
        });
      } else {
        // Otherwise, get what will be the default baselayer's histogram data to set in the reducer state
        const histogramData = await getHistogramData(defaultLayer.layer_id);

        // Check if the default baselayer has an undefined vmin or vmax; if so, set the
        // vmin and vmax for the baselayer
        if (
          defaultLayer.vmin === undefined ||
          defaultLayer.vmax === undefined
        ) {
          defaultLayer.vmin = histogramData.vmin;
          defaultLayer.vmax = histogramData.vmax;
        }

        // Set the baselayersState with the default baselayer; note that this action will also set the
        // activeBaselayer to be the default baselayer
        dispatchBaselayersChange({
          type: SET_BASELAYERS_STATE,
          defaultInternalBaselayer: defaultLayer,
          histogramData,
        });
      }

      return {
        defaultMenuState,
        defaultLayer,
        defaultMapId,
        defaultMapGroupId,
        defaultBandId,
      };
    },
  });

  const onCmapValuesChange = useCallback(
    (values: number[]) => {
      if (baselayersState.activeBaselayer) {
        dispatchBaselayersChange({
          type: CHANGE_CMAP_VALUES,
          activeBaselayer: baselayersState.activeBaselayer,
          vmin: values[0],
          vmax: values[1],
        });
      }
    },
    [baselayersState.activeBaselayer]
  );

  const onCmapChange = useCallback(
    (cmap: string) => {
      if (baselayersState.activeBaselayer) {
        dispatchBaselayersChange({
          type: CHANGE_CMAP_TYPE,
          activeBaselayer: baselayersState.activeBaselayer,
          cmap,
        });
      }
    },
    [baselayersState.activeBaselayer]
  );

  /** Creates an object of data needed by the submap endpoints to download and to add regions. Since it's 
    composed from state at this level, we must construct it here and pass it down. */
  const submapData = useMemo(() => {
    if (assertInternalBaselayer(baselayersState.activeBaselayer)) {
      const { layer_id, cmap, vmin, vmax, isLogScale, isAbsoluteValue } =
        baselayersState.activeBaselayer;
      return {
        layer_id,
        vmin,
        vmax,
        cmap,
        isLogScale,
        isAbsoluteValue,
      };
    }
  }, [baselayersState.activeBaselayer]);

  const onLogScaleChange = useCallback(
    (checked: boolean) => {
      if (baselayersState.activeBaselayer) {
        dispatchBaselayersChange({
          type: CHANGE_LOG_SCALE,
          activeBaselayer: baselayersState.activeBaselayer,
          isLogScale: checked,
        });
      }
    },
    [baselayersState.activeBaselayer]
  );

  const onAbsoluteValueChange = useCallback(
    (checked: boolean) => {
      if (baselayersState.activeBaselayer) {
        dispatchBaselayersChange({
          type: CHANGE_ABSOLUTE_VALUE,
          activeBaselayer: baselayersState.activeBaselayer,
          isAbsoluteValue: checked,
        });
      }
    },
    [baselayersState.activeBaselayer]
  );

  const { activeBaselayer, internalBaselayers, histogramData } =
    baselayersState;

  return (
    <>
      <Login
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />
      {isAuthenticated !== null &&
        activeBaselayer &&
        internalBaselayers &&
        defaultData && (
          <OpenLayersMap
            defaultData={defaultData}
            baselayersState={baselayersState}
            dispatchBaselayersChange={dispatchBaselayersChange}
            submapData={submapData}
            isAuthenticated={isAuthenticated}
          />
        )}
      {isAuthenticated !== null &&
        assertInternalBaselayer(activeBaselayer) &&
        activeBaselayer.vmin !== undefined &&
        activeBaselayer.vmax !== undefined &&
        histogramData && (
          <ColorMapControls
            values={[activeBaselayer.vmin, activeBaselayer.vmax]}
            cmapRange={histogramData.vmax - histogramData.vmin}
            onCmapValuesChange={onCmapValuesChange}
            cmap={activeBaselayer.cmap}
            onCmapChange={onCmapChange}
            activeBaselayerId={activeBaselayer.layer_id}
            units={activeBaselayer.units}
            quantity={activeBaselayer.quantity}
            isLogScale={activeBaselayer.isLogScale}
            isAbsoluteValue={activeBaselayer.isAbsoluteValue}
            onLogScaleChange={onLogScaleChange}
            onAbsoluteValueChange={onAbsoluteValueChange}
            histogramData={histogramData}
          />
        )}
      <LoadingOverlay isLoading={isInitializing} />
    </>
  );
}

export default App;
