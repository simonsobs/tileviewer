import { useCallback, useMemo, useState, useReducer, ChangeEvent } from 'react';
import { MapMetadataResponseWithClientBand, SourceList } from './types/maps';
import { ColorMapControls } from './components/ColorMapControls';
import { fetchProducts } from './utils/fetchUtils';
import {
  assertBand,
  baselayersReducer,
  CHANGE_CMAP_TYPE,
  CHANGE_CMAP_VALUES,
  CHANGE_LOG_SCALE,
  initialBaselayersState,
  SET_BASELAYERS_STATE,
} from './reducers/baselayersReducer';
import { useQuery } from './hooks/useQuery';
import { useHighlightBoxes } from './hooks/useHighlightBoxes';
import { OpenLayersMap } from './components/OpenLayersMap';
import { handleSelectChange } from './utils/layerUtils';
import { Login } from './components/Login';

function App() {
  /** contains useful state of the baselayer for tile requests and matplotlib color mapping */
  const [baselayersState, dispatchBaselayersChange] = useReducer(
    baselayersReducer,
    initialBaselayersState
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  /** query the bands to use as the baselayers of the map */
  useQuery<MapMetadataResponseWithClientBand[] | undefined>({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      // Fetch the maps and the map metadata in order to get the list of bands used as
      // map baselayers
      const mapsMetadata = await fetchProducts('maps');

      // // If we end up with no maps for some reason, return early
      if (!mapsMetadata.length) return;

      // Set the baselayersState with the finalBands; note that this action will also set the
      // activeBaselayer to be finalBands[0]
      dispatchBaselayersChange({
        type: SET_BASELAYERS_STATE,
        baselayerMaps: mapsMetadata,
      });

      return mapsMetadata;
    },
  });

  /** sourceLists are used as FeatureGroups in the map, which can be toggled on/off in the map legend */
  const { data: sourceLists } = useQuery<SourceList[] | undefined>({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      // Fetch the source catalogs and sources
      const { catalogs, sources } = await fetchProducts('sources');

      // Map through the source catalogs in order to link the appropriate sources
      // to each catalog
      const finalSourceLists: SourceList[] = catalogs.map((catalog) => ({
        ...catalog,
        // Create a sources attribute that consists of sources associated with the catalog
        sources: sources.filter((src) => src.source_list_id == catalog.id),
      }));

      return finalSourceLists;
    },
  });

  const {
    // Regions users have added to a map
    highlightBoxes,
    updateHighlightBoxes,
    // The optimistic version of highlightBoxes for when we add boxes in the UI
    optimisticHighlightBoxes,
    addOptimisticHighlightBox,
  } = useHighlightBoxes(isAuthenticated);

  /** tracks highlight boxes that are "checked" and visible on the map  */
  const [activeBoxIds, setActiveBoxIds] = useState<number[]>([]);

  const [activeSourceListIds, setActiveSourceListIds] = useState<number[]>([]);

  const onSelectedSourceListsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!sourceLists) return;
      handleSelectChange(e, setActiveSourceListIds);
    },
    [sourceLists]
  );

  const onSelectedHighlightBoxChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!highlightBoxes) return;
      handleSelectChange(e, setActiveBoxIds);
    },
    [highlightBoxes]
  );

  const onCmapValuesChange = useCallback(
    (values: number[]) => {
      if (baselayersState.activeBaselayer) {
        dispatchBaselayersChange({
          type: CHANGE_CMAP_VALUES,
          activeBaselayer: baselayersState.activeBaselayer,
          cmapValues: {
            min: values[0],
            max: values[1],
          },
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
    if (assertBand(baselayersState.activeBaselayer)) {
      const {
        map_id: mapId,
        id: bandId,
        cmap,
        cmapValues,
      } = baselayersState.activeBaselayer;
      return {
        mapId,
        bandId,
        vmin: cmapValues?.min,
        vmax: cmapValues?.max,
        cmap,
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

  const { activeBaselayer, internalBaselayerMaps } = baselayersState;
  return (
    <>
      <Login
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />
      {isAuthenticated !== null && activeBaselayer && internalBaselayerMaps && (
        <OpenLayersMap
          baselayersState={baselayersState}
          dispatchBaselayersChange={dispatchBaselayersChange}
          sourceLists={sourceLists}
          activeSourceListIds={activeSourceListIds}
          onSelectedSourceListsChange={onSelectedSourceListsChange}
          highlightBoxes={optimisticHighlightBoxes}
          setBoxes={updateHighlightBoxes}
          activeBoxIds={activeBoxIds}
          setActiveBoxIds={setActiveBoxIds}
          onSelectedHighlightBoxChange={onSelectedHighlightBoxChange}
          submapData={submapData}
          addOptimisticHighlightBox={addOptimisticHighlightBox}
        />
      )}
      {isAuthenticated !== null &&
        assertBand(activeBaselayer) &&
        activeBaselayer.cmap &&
        activeBaselayer.cmapValues && (
          <ColorMapControls
            values={[
              activeBaselayer.cmapValues.min,
              activeBaselayer.cmapValues.max,
            ]}
            cmapRange={activeBaselayer.cmapValues.recommendedRange}
            onCmapValuesChange={onCmapValuesChange}
            cmap={activeBaselayer.cmap}
            onCmapChange={onCmapChange}
            activeBaselayerId={activeBaselayer.id}
            units={activeBaselayer.units}
            quantity={activeBaselayer.quantity}
            isLogScale={activeBaselayer.isLogScale}
            onLogScaleChange={onLogScaleChange}
          />
        )}
    </>
  );
}

export default App;
