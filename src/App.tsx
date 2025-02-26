import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useOptimistic,
} from 'react';
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
  Box,
} from './types/maps';
import { MapEvents } from './components/MapEvents';
import { ColorMapControls } from './components/ColorMapControls';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { AstroScale } from './components/AstroScale';
import { AreaSelection } from './components/AreaSelection';
import { GraticuleLayer } from './components/layers/GraticuleLayer';
import { fetchBoxes, fetchProducts } from './utils/fetchUtils';
import { HighlightBoxLayer } from './components/layers/HighlightBoxLayer';
import { SourceListOverlays } from './components/layers/SourceListOverlays';
import { MapBaselayers } from './components/layers/MapBaselayers';
import { getCustomCRS } from './configs/CustomCRS';

function App() {
  /** vmin, vmax, and cmap are matplotlib parameters used in the histogram components
    and the tile request URLs */
  const [vmin, setVMin] = useState<number | undefined>(undefined);
  const [vmax, setVMax] = useState<number | undefined>(undefined);
  const [cmap, setCmap] = useState<string | undefined>(undefined);

  /** the active baselayer selected in the map's legend */
  const [activeBaselayer, setActiveBaselayer] = useState<Band | undefined>(
    undefined
  );
  /** bands are used as the baselayers of the map */
  const [bands, setBands] = useState<Band[] | undefined>(undefined);
  /** sourceLists are used as FeatureGroups in the map, which can be toggled on/off in the map legend */
  const [sourceLists, setSourceLists] = useState<SourceList[] | undefined>(
    undefined
  );
  /** highlightBoxes are regions user's have added to a map via the AreaSelection tooling */
  const [highlightBoxes, setHighlightBoxes] = useState<Box[] | undefined>(
    undefined
  );
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

  /** wrap highlightBoxes state in a useOptimistic hook so we can optimistically render new boxes */
  const [optimisticHighlightBoxes, addOptimisticHighlightBox] = useOptimistic(
    highlightBoxes,
    (state, newHighlightBox: Box) => {
      if (state) {
        return [...state, newHighlightBox];
      } else {
        return [newHighlightBox];
      }
    }
  );

  /** used as a hack to mount a new MapContainer when the tileSize changes in order to set a new custom CRS */
  const [mapKey, setMapKey] = useState<number>(1);
  /** tracks the tileSize defined by tilemaker for the active baselayer so we can reset the MapContainer in the
    event it changes, thus needed to "refresh" the custom CRS with the new tileSize */
  const [tileSize, setTileSize] = useState<number | undefined>(undefined);
  /** tracks the map's viewport bounds before unmounting the MapContainer so that we can try to preserve the viewport
    as best as possible when we mount a new MapContainer */
  const [mapBounds, setMapBounds] = useState<LatLngBounds | undefined>(
    undefined
  );

  /**
   * On mount, fetch the maps and the map metadata in order to get the list of bands used as
   * map baselayers. Also, set the first band, if any exist, as the activeLayer and set the
   * color map attributes according to its recommended properties.
   */
  useEffect(() => {
    async function getMapsAndMetadata() {
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
      setBands(finalBands);

      // If we end up with no bands for some reason, return early
      if (!finalBands.length) return;

      // Default the active layer to be the first band of finalBands and set
      // the color map properties to its recommended values
      setActiveBaselayer(finalBands[0]);
      setVMin(finalBands[0].recommended_cmap_min);
      setVMax(finalBands[0].recommended_cmap_max);
      setCmap(finalBands[0].recommended_cmap);
      setTileSize(finalBands[0].tile_size);
    }
    getMapsAndMetadata();
  }, []);

  /**
   * On mount, fetch the source catalogs and each catalog's source in order to
   * set the sourceLists state
   */
  useEffect(() => {
    async function getSourceLists() {
      const { catalogs, sources } = await fetchProducts('sources');

      // Map through the source catalogs in order to link the appropriate sources
      // to each catalog
      const finalSourceLists: SourceList[] = catalogs.map((catalog) => ({
        ...catalog,
        // create a sources attribute that consists of sources associated with the catalog
        sources: sources.filter((src) => src.source_list_id == catalog.id),
      }));
      setSourceLists(finalSourceLists);
    }
    getSourceLists();
  }, []);

  useEffect(() => {
    async function getHighlightBoxes() {
      const boxes = await fetchBoxes();
      setHighlightBoxes(boxes);
    }
    getHighlightBoxes();
  }, []);

  /**
   * Handler fires when user changes map layers. If the units of the new
   * layer are the same as the active layer, then we just set a new active
   * layer. If the units differ, we set new values for vmin, vmax, and cmap
   * from the band's recommended values in order to prevent nonsensical
   * TileLayer requests.
   */
  const onBaseLayerChange = useCallback(
    (layer: L.TileLayer, map: L.Map) => {
      const currentBaselayerUnits = activeBaselayer?.units;
      const newActiveBaselayer = bands?.find(
        (b) => b.id === Number(layer.options.id)
      );

      if (currentBaselayerUnits != newActiveBaselayer?.units) {
        setVMin(newActiveBaselayer?.recommended_cmap_min);
        setVMax(newActiveBaselayer?.recommended_cmap_max);
        setCmap(newActiveBaselayer?.recommended_cmap);
      }

      if (newActiveBaselayer?.tile_size !== tileSize) {
        setMapBounds(map.getBounds());
        setTileSize(newActiveBaselayer!.tile_size);
        setMapKey((prevKey) => ++prevKey);
      }

      setActiveBaselayer(newActiveBaselayer);
    },
    [bands, activeBaselayer, tileSize]
  );

  const onCmapValuesChange = useCallback(
    (values: number[]) => {
      setVMin(values[0]);
      setVMax(values[1]);
    },
    [setVMin, setVMax]
  );

  const onCmapChange = useCallback(
    (cmap: string) => {
      setCmap(cmap);
    },
    [setCmap]
  );

  /** Creates an object of data needed by the submap endpoints to download and to add regions. Since it's 
    composed from state at this level, we must construct it here and pass it down to the AreaSelection and
    HighlightBoxLayer components. */
  const submapData = useMemo(() => {
    if (activeBaselayer) {
      const { map_id: mapId, id: bandId } = activeBaselayer;
      return {
        mapId,
        bandId,
        vmin,
        vmax,
        cmap,
      };
    }
  }, [activeBaselayer, vmin, vmax, cmap]);

  return (
    <>
      {tileSize && (
        <MapContainer
          id="map"
          key={mapKey}
          crs={getCustomCRS(tileSize)}
          bounds={mapBounds}
          center={mapBounds ? undefined : DEFAULT_MAP_CENTER}
          zoom={mapBounds ? undefined : DEFAULT_MAP_ZOOM_LEVEL}
        >
          <LayersControl>
            {bands && (
              <MapBaselayers
                bands={bands}
                activeBaselayerId={activeBaselayer?.id}
                cmap={cmap}
                vmin={vmin}
                vmax={vmax}
              />
            )}
            {sourceLists && <SourceListOverlays sources={sourceLists} />}
            {submapData &&
              optimisticHighlightBoxes?.map((box) => (
                <HighlightBoxLayer
                  key={`${box.name}-${box.id}`}
                  box={box}
                  submapData={submapData}
                  setBoxes={setHighlightBoxes}
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
            setBoxes={setHighlightBoxes}
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
      {vmin !== undefined && vmax !== undefined && cmap && activeBaselayer && (
        <ColorMapControls
          values={[vmin, vmax]}
          onCmapValuesChange={onCmapValuesChange}
          cmap={cmap}
          onCmapChange={onCmapChange}
          activeBaselayerId={activeBaselayer.id}
          units={activeBaselayer.units}
          quantity={activeBaselayer.quantity}
        />
      )}
    </>
  );
}

export default App;
