import { useCallback, useMemo, useState, useReducer, ChangeEvent } from 'react';
import { MapGroupResponse, SourceList, Box } from './types/maps';
import { ColorMapControls } from './components/ColorMapControls';
import { fetchBoxes, fetchMaps, fetchSources } from './utils/fetchUtils';
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
import { handleSelectChange } from './utils/layerUtils';
import { Login } from './components/Login';

function App() {
  /** contains useful state of the baselayer for tile requests and matplotlib color mapping */
  const [baselayersState, dispatchBaselayersChange] = useReducer(
    baselayersReducer,
    initialBaselayersState
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  /** query the map groups to use as the baselayers of the map */
  const { data: mapGroups } = useQuery<MapGroupResponse[] | undefined>({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      // Fetch the maps and the map metadata in order to get the list of bands used as
      // map baselayers
      const { mapGroups, internalBaselayers } = await fetchMaps();

      // // If we end up with no maps for some reason, return early
      if (!mapGroups.length || !internalBaselayers.length) return;

      // Set the baselayersState with the finalBands; note that this action will also set the
      // activeBaselayer to be finalBands[0]
      dispatchBaselayersChange({
        type: SET_BASELAYERS_STATE,
        internalBaselayers: internalBaselayers,
      });

      return mapGroups;
    },
  });

  /** sourceLists are used as FeatureGroups in the map, which can be toggled on/off in the map legend */
  const { data: sourceLists } = useQuery<SourceList[] | undefined>({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      // Fetch the source catalogs and sources
      const { catalogs, sources } = await fetchSources();

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

  /** highlight boxes allow users to download submaps and to highlight regions of the map */
  const { data: highlightBoxes } = useQuery<Box[] | undefined>({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      // Fetch the highlight boxes
      const boxes = await fetchBoxes();

      return boxes;
    },
  });

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
      const { layer_id, cmap, vmin, vmax } = baselayersState.activeBaselayer;
      return {
        layer_id,
        vmin,
        vmax,
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

  const { activeBaselayer, internalBaselayers } = baselayersState;
  return (
    <>
      <Login
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />
      {isAuthenticated !== null &&
        activeBaselayer &&
        internalBaselayers &&
        mapGroups && (
          <OpenLayersMap
            mapGroups={mapGroups}
            baselayersState={baselayersState}
            dispatchBaselayersChange={dispatchBaselayersChange}
            sourceLists={sourceLists}
            activeSourceListIds={activeSourceListIds}
            onSelectedSourceListsChange={onSelectedSourceListsChange}
            highlightBoxes={highlightBoxes}
            activeBoxIds={activeBoxIds}
            setActiveBoxIds={setActiveBoxIds}
            onSelectedHighlightBoxChange={onSelectedHighlightBoxChange}
            submapData={submapData}
          />
        )}
      {isAuthenticated !== null && assertInternalBaselayer(activeBaselayer) && (
        <ColorMapControls
          values={[activeBaselayer.vmin, activeBaselayer.vmax]}
          cmapRange={activeBaselayer.recommendedCmapValuesRange}
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
        />
      )}
    </>
  );
}

export default App;
