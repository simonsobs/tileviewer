import { useCallback, useMemo, useState, useReducer } from 'react';
import { LayersControl, MapContainer } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM_LEVEL,
} from './configs/mapSettings';
import {
  GraticuleDetails,
  MapMetadataResponse,
  Band,
  SourceList,
} from './types/maps';
import { MapEvents } from './components/MapEvents';
import { ColorMapControls } from './components/ColorMapControls';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { AstroScale } from './components/AstroScale';
import { AreaSelection } from './components/AreaSelection';
import { GraticuleLayer } from './components/layers/GraticuleLayer';
import { fetchProducts } from './utils/fetchUtils';
import { HighlightBoxLayer } from './components/layers/HighlightBoxLayer';
import { SourceListOverlays } from './components/layers/SourceListOverlays';
import { MapBaselayers } from './components/layers/MapBaselayers';
import { getCustomCRS } from './configs/customCrs';
import {
  baselayerReducer,
  CHANGE_BASELAYER,
  CHANGE_CMAP_TYPE,
  CHANGE_CMAP_VALUES,
  initialBaselayerState,
} from './reducers/baselayerReducer';
import { useQuery } from './hooks/useQuery';
import { useHighlightBoxes } from './hooks/useHighlightBoxes';

function App() {
  /** contains useful state of the baselayer for tile requests and matplotlib color mapping */
  const [baselayerState, dispatch] = useReducer(
    baselayerReducer,
    initialBaselayerState
  );

  /** bands are used as the baselayers of the map */
  const { data: bands } = useQuery<Band[] | undefined>({
    initialData: undefined,
    queryKey: [],
    queryFn: async () => {
      // Fetch the maps and the map metadata in order to get the list of bands used as
      // map baselayers
      const mapsMetadata = await fetchProducts('maps');

      // Loop through each map's metadata and reduce the map's bands
      // into a single array
      const finalBands = mapsMetadata.reduce(
        (prev: Band[], curr: MapMetadataResponse) => {
          if (curr.bands.length) {
            return prev.concat(curr.bands);
          } else {
            return prev;
          }
        },
        []
      );

      // If we end up with no bands for some reason, return early
      if (!finalBands.length) return;

      // Default the active layer to be the first band of finalBands
      dispatch({
        type: CHANGE_BASELAYER,
        newBaselayer: finalBands[0],
      });

      return finalBands;
    },
  });

  /** sourceLists are used as FeatureGroups in the map, which can be toggled on/off in the map legend */
  const { data: sourceLists } = useQuery<SourceList[] | undefined>({
    initialData: undefined,
    queryKey: [],
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
  } = useHighlightBoxes();

  /** sets the bounds of the rectangular "select region" box */
  const [selectionBounds, setSelectionBounds] = useState<
    LatLngBounds | undefined
  >(undefined);

  /** used to set the AstroScale component to the same width and interval as the graticule layer */
  const [graticuleDetails, setGraticuleDetails] = useState<
    undefined | GraticuleDetails
  >(undefined);

  /** tracks highlight boxes that are "checked" and visible on the map  */
  const [activeBoxIds, setActiveBoxIds] = useState<number[]>([]);

  /** used as a hack to mount a new MapContainer when the tileSize changes in order to set a new custom CRS */
  const [mapKey, setMapKey] = useState<number>(1);

  /** tracks the map's viewport bounds before unmounting the MapContainer so that we can try to preserve the viewport
    as best as possible when we mount a new MapContainer */
  const [mapBounds, setMapBounds] = useState<LatLngBounds | undefined>(
    undefined
  );

  /**
   * Handler fires when user changes map layers. If the units of the new
   * layer are the same as the active layer, then we just set a new active
   * layer. If the units differ, we set new values for vmin, vmax, and cmap
   * from the band's recommended values in order to prevent nonsensical
   * TileLayer requests.
   */
  const onBaseLayerChange = useCallback(
    (layer: L.TileLayer, map: L.Map) => {
      const newActiveBaselayer = bands?.find(
        (b) => b.id === Number(layer.options.id)
      );

      if (!newActiveBaselayer) return;

      if (
        newActiveBaselayer.tile_size !==
        baselayerState.activeBaselayer?.tile_size
      ) {
        setMapBounds(map.getBounds());
        setMapKey((prevKey) => ++prevKey);
      }

      dispatch({
        type: CHANGE_BASELAYER,
        newBaselayer: newActiveBaselayer,
      });
    },
    [bands, baselayerState]
  );

  const onCmapValuesChange = useCallback((values: number[]) => {
    dispatch({
      type: CHANGE_CMAP_VALUES,
      cmapValues: {
        min: values[0],
        max: values[1],
      },
    });
  }, []);

  const onCmapChange = useCallback((cmap: string) => {
    dispatch({
      type: CHANGE_CMAP_TYPE,
      cmap,
    });
  }, []);

  /** Creates an object of data needed by the submap endpoints to download and to add regions. Since it's 
    composed from state at this level, we must construct it here and pass it down to the AreaSelection and
    HighlightBoxLayer components. */
  const submapData = useMemo(() => {
    if (baselayerState.activeBaselayer) {
      const { map_id: mapId, id: bandId } = baselayerState.activeBaselayer;
      const { cmap, cmapValues } = baselayerState;
      return {
        mapId,
        bandId,
        vmin: cmapValues?.min,
        vmax: cmapValues?.max,
        cmap,
      };
    }
  }, [baselayerState]);

  if (
    !baselayerState.activeBaselayer ||
    !baselayerState.cmap ||
    !baselayerState.cmapValues
  ) {
    return null;
  } else {
    const { activeBaselayer, cmap, cmapValues } = baselayerState;
    return (
      <>
        {baselayerState.activeBaselayer && (
          <MapContainer
            id="map"
            key={mapKey}
            crs={getCustomCRS(baselayerState.activeBaselayer.tile_size)}
            bounds={mapBounds}
            center={mapBounds ? undefined : DEFAULT_MAP_CENTER}
            zoom={mapBounds ? undefined : DEFAULT_MAP_ZOOM_LEVEL}
          >
            <LayersControl>
              {bands && (
                <MapBaselayers bands={bands} baselayerState={baselayerState} />
              )}
              {sourceLists && <SourceListOverlays sources={sourceLists} />}
              {submapData &&
                optimisticHighlightBoxes?.map((box) => (
                  <HighlightBoxLayer
                    key={`${box.name}-${box.id}`}
                    box={box}
                    submapData={submapData}
                    setBoxes={updateHighlightBoxes}
                    activeBoxIds={activeBoxIds}
                    setActiveBoxIds={setActiveBoxIds}
                  />
                ))}
            </LayersControl>
            <GraticuleLayer setGraticuleDetails={setGraticuleDetails} />
            <CoordinatesDisplay />
            {graticuleDetails && (
              <AstroScale graticuleDetails={graticuleDetails} />
            )}
            <AreaSelection
              handleSelectionBounds={setSelectionBounds}
              selectionBounds={selectionBounds}
              submapData={submapData}
              setBoxes={updateHighlightBoxes}
              setActiveBoxIds={setActiveBoxIds}
              addOptimisticHighlightBox={addOptimisticHighlightBox}
            />
            <MapEvents
              onBaseLayerChange={onBaseLayerChange}
              selectionBounds={selectionBounds}
              boxes={highlightBoxes}
              activeBoxIds={activeBoxIds}
              setActiveBoxIds={setActiveBoxIds}
            />
          </MapContainer>
        )}
        <ColorMapControls
          values={[cmapValues.min, cmapValues.max]}
          onCmapValuesChange={onCmapValuesChange}
          cmap={cmap}
          onCmapChange={onCmapChange}
          activeBaselayerId={activeBaselayer.id}
          units={activeBaselayer.units}
          quantity={activeBaselayer.quantity}
        />
      </>
    );
  }
}

export default App;
