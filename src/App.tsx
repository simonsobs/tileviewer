import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
  CircleMarker,
  FeatureGroup,
} from 'react-leaflet';
import { latLng, LatLngBounds, latLngBounds } from 'leaflet';
import {
  mapOptions,
  SERVICE_URL,
  DEFAULT_MIN_ZOOM,
} from './configs/mapSettings';
import {
  GraticuleDetails,
  MapMetadataResponse,
  Band,
  SourceList,
  Box,
} from './types/maps';
import { makeLayerName } from './utils/layerUtils';
import { MapEvents } from './components/MapEvents';
import { ColorMapControls } from './components/ColorMapControls';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { AstroScale } from './components/AstroScale';
import { AreaSelection } from './components/AreaSelection';
import { GraticuleLayer } from './components/GraticuleLayer';
import { fetchBoxes, fetchProducts } from './utils/fetchUtils';
import { HighlightBoxLayer } from './components/HighlightBoxLayer';

function App() {
  /** vmin, vmax, and cmap are matplotlib parameters used in the histogram components
    and the tile request URLs */
  const [vmin, setVMin] = useState<number | undefined>(undefined);
  const [vmax, setVMax] = useState<number | undefined>(undefined);
  const [cmap, setCmap] = useState<string | undefined>(undefined);

  /** the active baselayer selected in the map's legend */
  const [activeLayer, setActiveLayer] = useState<Band | undefined>(undefined);
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
      if (!activeLayer) {
        setActiveLayer(finalBands[0]);
        setVMin(finalBands[0].recommended_cmap_min);
        setVMax(finalBands[0].recommended_cmap_max);
        setCmap(finalBands[0].recommended_cmap);
      } else {
        // If somehow activeLayer is truthy, sync up the color map properties
        // to the active band's recommendations
        const activeBand = finalBands.find(
          (band) => band.id === activeLayer.id
        );
        setVMin(activeBand!.recommended_cmap_min);
        setVMin(activeBand!.recommended_cmap_max);
        setCmap(activeBand!.recommended_cmap);
      }
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
    (layer: L.TileLayer) => {
      const currentLayerUnits = activeLayer?.units;
      const newActiveLayer = bands?.find(
        (b) => b.id === Number(layer.options.id)
      );
      if (currentLayerUnits != newActiveLayer?.units) {
        setVMin(newActiveLayer?.recommended_cmap_min);
        setVMax(newActiveLayer?.recommended_cmap_max);
        setCmap(newActiveLayer?.recommended_cmap);
      }
      setActiveLayer(newActiveLayer);
    },
    [bands, setActiveLayer, activeLayer, setVMin, setVMax, setCmap]
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
    if (activeLayer) {
      const { map_id: mapId, id: bandId } = activeLayer;
      return {
        mapId,
        bandId,
        vmin,
        vmax,
        cmap,
      };
    }
  }, [activeLayer?.id, activeLayer?.map_id, vmin, vmax, cmap]);

  return (
    <>
      <MapContainer id="map" {...mapOptions}>
        <LayersControl>
          {/** Set each band to be a baselayer and set up the TileLayer according to the band- and user-set attributes */}
          {bands?.map((band) => {
            return (
              <LayersControl.BaseLayer
                key={`${band.map_name}-${band.id}`}
                checked={band.id === activeLayer?.id}
                name={makeLayerName(band)}
              >
                <TileLayer
                  id={String(band.id)}
                  url={`${SERVICE_URL}/maps/${band.map_id}/${band.id}/{z}/{y}/{x}/tile.png?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}`}
                  tms
                  noWrap
                  bounds={latLngBounds(
                    latLng(band.bounding_top, band.bounding_left),
                    latLng(band.bounding_bottom, band.bounding_right)
                  )}
                  minZoom={DEFAULT_MIN_ZOOM}
                  maxZoom={band.levels + 3}
                  minNativeZoom={band.levels - 4}
                  maxNativeZoom={band.levels - 1}
                />
              </LayersControl.BaseLayer>
            );
          })}
          {/** Set each sourceList as an overlay, with each of its sources contained within a FeatureGroup and displayed as a 
              circle that, when clicked, shows a popup with the source details */}
          {sourceLists?.map((sourceList) => {
            return (
              <LayersControl.Overlay
                key={`${sourceList.name}-${sourceList.id}`}
                name={sourceList.name}
              >
                <FeatureGroup>
                  {sourceList.sources.map((source) => {
                    return (
                      <CircleMarker
                        key={`marker-${sourceList.id}-${source.id}`}
                        center={[source.dec, source.ra]}
                        radius={5}
                      >
                        <Popup>
                          <div className="source-popup">
                            {source.name ? <h3>{source.name}</h3> : null}
                            <p>
                              <span>RA, Dec:</span> ({source.ra}, {source.dec})
                            </p>
                            <p>
                              <span>Flux:</span> {source.flux}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </FeatureGroup>
              </LayersControl.Overlay>
            );
          })}
          {submapData &&
            highlightBoxes?.map((box) => (
              <HighlightBoxLayer
                key={`${box.name}-${box.id}`}
                box={box}
                submapData={submapData}
                setBoxes={setHighlightBoxes}
                activeBoxIds={activeBoxIds}
              />
            ))}
        </LayersControl>
        <GraticuleLayer setGraticuleDetails={setGraticuleDetails} />
        <CoordinatesDisplay />
        {graticuleDetails && <AstroScale graticuleDetails={graticuleDetails} />}
        <AreaSelection
          handleSelectionBounds={setSelectionBounds}
          selectionBounds={selectionBounds}
          submapData={submapData}
          setBoxes={setHighlightBoxes}
          setActiveBoxIds={setActiveBoxIds}
        />
        <MapEvents
          onBaseLayerChange={onBaseLayerChange}
          selectionBounds={selectionBounds}
          boxes={highlightBoxes}
          activeBoxIds={activeBoxIds}
          setActiveBoxIds={setActiveBoxIds}
        />
      </MapContainer>
      {vmin !== undefined && vmax !== undefined && cmap && activeLayer && (
        <ColorMapControls
          values={[vmin, vmax]}
          onCmapValuesChange={onCmapValuesChange}
          cmap={cmap}
          onCmapChange={onCmapChange}
          activeLayerId={activeLayer.id}
          units={activeLayer.units}
          quantity={activeLayer.quantity}
        />
      )}
    </>
  );
}

export default App;
