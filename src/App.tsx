import { useState, useReducer } from 'react';
import { DefaultData } from './types/layers';
import { ColorMapControls } from './components/ColorMapControls';
import { fetchInitialState, getHistogramData } from './utils/fetchUtils';
import {
  assertInternalBaselayer,
  baselayersReducer,
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

  const { activeBaselayer, histogramData } = baselayersState;

  return (
    <>
      <Login
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />
      {isAuthenticated !== null && activeBaselayer && defaultData && (
        <OpenLayersMap
          defaultData={defaultData}
          baselayersState={baselayersState}
          dispatchBaselayersChange={dispatchBaselayersChange}
          isAuthenticated={isAuthenticated}
        />
      )}
      {isAuthenticated !== null &&
        assertInternalBaselayer(activeBaselayer) &&
        histogramData && (
          <ColorMapControls
            activeBaselayer={activeBaselayer}
            dispatchBaselayersChange={dispatchBaselayersChange}
            histogramData={histogramData}
          />
        )}
      <LoadingOverlay isLoading={isInitializing} />
    </>
  );
}

export default App;
