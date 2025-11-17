import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Map, View, Feature, MapBrowserEvent } from 'ol';
import { TileGrid } from 'ol/tilegrid';
import { Tile as TileLayer } from 'ol/layer';
import { XYZ } from 'ol/source';
import { Overlay } from 'ol';
import ScaleLine from 'ol/control/ScaleLine.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Circle as CircleStyle, Style, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';
import {
  InternalBaselayer,
  BaselayersState,
  Box,
  ExternalBaselayer,
  SourceGroup,
  SubmapData,
  MapGroupResponse,
} from '../types/maps';
import {
  DEFAULT_INTERNAL_MAP_SETTINGS,
  EXTERNAL_BASELAYERS,
  SERVICE_URL,
} from '../configs/mapSettings';
import { CoordinatesDisplay } from './CoordinatesDisplay';
import { LayerSelector } from './LayerSelector';
import { CropIcon } from './icons/CropIcon';
import { HighlightBoxLayer } from './layers/HighlightBoxLayer';
import { GraticuleLayer } from './layers/GraticuleLayer';
import { SourcesLayer } from './layers/SourcesLayer';
import { AddHighlightBoxLayer } from './layers/AddHighlightBoxLayer';
import {
  generateSearchContent,
  searchOverlayHelper,
} from '../utils/externalSearchUtils';
import './styles/highlight-box.css';
import {
  Action,
  assertInternalBaselayer,
  CHANGE_BASELAYER,
} from '../reducers/baselayersReducer';
import {
  getBaselayerResolutions,
  transformCoords,
  transformGraticuleCoords,
} from '../utils/layerUtils';
import { ToggleSwitch } from './ToggleSwitch';
import { CenterMapFeature } from './CenterMapFeature';
import { getHistogramData } from '../utils/fetchUtils';

export type MapProps = {
  mapGroups: MapGroupResponse[];
  baselayersState: BaselayersState;
  dispatchBaselayersChange: React.ActionDispatch<[action: Action]>;
  sourceGroups?: SourceGroup[];
  activeSourceGroupIds: string[];
  onSelectedSourceGroupsChange: (e: ChangeEvent<HTMLInputElement>) => void;
  highlightBoxes: Box[] | undefined;
  activeBoxIds: number[];
  setActiveBoxIds: React.Dispatch<React.SetStateAction<number[]>>;
  onSelectedHighlightBoxChange: (e: ChangeEvent<HTMLInputElement>) => void;
  submapData?: SubmapData;
};

export function OpenLayersMap({
  mapGroups,
  baselayersState,
  dispatchBaselayersChange,
  sourceGroups = [],
  onSelectedSourceGroupsChange,
  activeSourceGroupIds,
  highlightBoxes,
  activeBoxIds,
  setActiveBoxIds,
  onSelectedHighlightBoxChange,
  submapData,
}: MapProps) {
  const mapRef = useRef<Map | null>(null);
  const drawBoxRef = useRef<VectorLayer | null>(null);
  const externalSearchRef = useRef<HTMLDivElement | null>(null);
  const externalSearchMarkerRef = useRef<Feature | null>(null);
  const previousSearchOverlayHandlerRef =
    useRef<(e: MapBrowserEvent<any>) => void | null>(null);
  const previousKeyboardHandlerRef = useRef<(e: KeyboardEvent) => void>(null);
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [isNewBoxDrawn, setIsNewBoxDrawn] = useState(false);
  const [flipTiles, setFlipTiles] = useState(true);

  const [backHistoryStack, setBackHistoryStack] = useState<
    { id: string; flipped: boolean }[]
  >([]);
  const [forwardHistoryStack, setForwardHistoryStack] = useState<
    { id: string; flipped: boolean }[]
  >([]);

  const { activeBaselayer } = baselayersState;

  /**
   * Handler fires when user changes map layers. If the units of the new
   * layer are the same as the active layer, then we just set a new active
   * layer. If the units differ, we set new values for vmin, vmax, and cmap
   * from the band's recommended values in order to prevent nonsensical
   * TileLayer requests.
   */
  const onBaselayerChange = useCallback(
    async (
      selectedBaselayerId: string,
      context: 'layerMenu' | 'goBack' | 'goForward',
      flipped?: boolean
    ) => {
      const isExternalBaselayer = selectedBaselayerId.includes('external');

      const { activeBaselayer, internalBaselayers } = baselayersState;

      let newActiveBaselayer:
        | ExternalBaselayer
        | InternalBaselayer
        | undefined = undefined;

      if (isExternalBaselayer) {
        newActiveBaselayer = EXTERNAL_BASELAYERS.find(
          (b) => b.layer_id === selectedBaselayerId
        );
      } else {
        newActiveBaselayer = internalBaselayers?.find(
          (b) => b.layer_id === selectedBaselayerId
        );
      }

      if (!newActiveBaselayer) return;

      if (context === 'goBack') {
        setBackHistoryStack((prev) => prev.slice(0, -1));
        setForwardHistoryStack((prev) =>
          [...prev].concat({
            id: String(activeBaselayer?.layer_id),
            flipped: flipTiles,
          })
        );
      } else if (context === 'goForward') {
        setBackHistoryStack((prev) =>
          [...prev].concat({
            id: String(activeBaselayer?.layer_id),
            flipped: flipTiles,
          })
        );
        setForwardHistoryStack((prev) => prev.slice(0, -1));
      } else {
        setBackHistoryStack((prev) =>
          [...prev].concat({
            id: String(activeBaselayer?.layer_id),
            flipped: flipTiles,
          })
        );
        setForwardHistoryStack([]);
      }

      if (flipped !== undefined) {
        setFlipTiles(flipped);
      }

      // If we switch to an internal baselayer, we need to fetch its histogram data
      // in order to update it in the reducer
      if (assertInternalBaselayer(newActiveBaselayer)) {
        const histogramData = await getHistogramData(
          newActiveBaselayer.layer_id
        );

        // If the new layer doesn't yet have vmin or vmax set, set it with the
        // histogram data
        if (!newActiveBaselayer.vmin || !newActiveBaselayer.vmax) {
          dispatchBaselayersChange({
            type: CHANGE_BASELAYER,
            newBaselayer: {
              ...newActiveBaselayer,
              vmin: histogramData.vmin,
              vmax: histogramData.vmax,
            },
            histogramData,
          });
        } else {
          dispatchBaselayersChange({
            type: CHANGE_BASELAYER,
            newBaselayer: newActiveBaselayer,
            histogramData,
          });
        }
      } else {
        dispatchBaselayersChange({
          type: CHANGE_BASELAYER,
          newBaselayer: newActiveBaselayer,
        });
      }
    },
    [
      baselayersState.internalBaselayers,
      baselayersState.activeBaselayer,
      backHistoryStack,
      flipTiles,
      setFlipTiles,
    ]
  );

  const goBack = useCallback(() => {
    const baselayer = backHistoryStack[backHistoryStack.length - 1];
    onBaselayerChange(baselayer.id, 'goBack', baselayer.flipped);
  }, [onBaselayerChange, backHistoryStack]);

  const goForward = useCallback(() => {
    const baselayer = forwardHistoryStack[forwardHistoryStack.length - 1];
    onBaselayerChange(baselayer.id, 'goForward', baselayer.flipped);
  }, [onBaselayerChange, forwardHistoryStack]);

  const activeInternalTileLayer = useMemo(() => {
    if (assertInternalBaselayer(activeBaselayer)) {
      return new TileLayer({
        properties: { id: 'baselayer-' + activeBaselayer.layer_id },
        source: new XYZ({
          url: `${SERVICE_URL}/maps/${activeBaselayer.layer_id}/{z}/{-y}/{x}/tile.png?cmap=${activeBaselayer.cmap}&vmin=${activeBaselayer.isLogScale ? Math.pow(10, activeBaselayer.vmin!) : activeBaselayer.vmin}&vmax=${activeBaselayer.isLogScale ? Math.pow(10, activeBaselayer.vmax!) : activeBaselayer.vmax}&flip=${flipTiles}&log_norm=${activeBaselayer.isLogScale}&abs=${activeBaselayer.isAbsoluteValue}`,
          tileGrid: new TileGrid({
            extent: [-180, -90, 180, 90],
            origin: [-180, 90],
            tileSize: activeBaselayer.tile_size,
            resolutions: getBaselayerResolutions(
              180,
              activeBaselayer.tile_size,
              activeBaselayer.number_of_levels - 1
            ),
          }),
          interpolate: false,
          projection: 'EPSG:4326',
          tilePixelRatio: activeBaselayer.tile_size / 256,
        }),
      });
    } else {
      return undefined;
    }
  }, [activeBaselayer, flipTiles]);

  const externalTileLayers = useMemo(() => {
    return EXTERNAL_BASELAYERS.map((b) => {
      return new TileLayer({
        properties: { id: b.layer_id },
        source: new XYZ({
          url: typeof b.url === 'string' ? b.url : undefined,
          tileUrlFunction: typeof b.url !== 'string' ? b.url : undefined,
          projection: b.projection,
          tileGrid: new TileGrid({
            extent: b.extent,
            resolutions: getBaselayerResolutions(
              b.extent[2] - b.extent[0],
              256,
              b.maxZoom
            ),
            origin: [b.extent[0], b.extent[3]],
          }),
          wrapX: true,
        }),
      });
    });
  }, []);

  /**
   * Create the map with a scale control, a layer for the "add box" functionality
   * and a 'pointermove' interaction for the coordinate display
   */
  useEffect(() => {
    const stableMapRef = mapRef.current;
    if (!stableMapRef) {
      mapRef.current = new Map({
        target: 'map',
        view: new View(DEFAULT_INTERNAL_MAP_SETTINGS),
      });

      mapRef.current.on('pointermove', (e) => {
        setCoordinates(e.coordinate);
      });

      /**
       * BEGIN
       * Set up overlay, markers, and events for the external searches functionality
       */

      // Add the popup overlay to the map that will contain the links
      if (externalSearchRef.current) {
        const popupOverlay = new Overlay({
          element: externalSearchRef.current,
          id: 'simbad-search-overlay',
        });
        mapRef.current.addOverlay(popupOverlay);
      }

      // Set up the feature, styles, and layers for the "marker"
      const externalSearchMarker = new Feature({
        geometry: undefined,
      });

      externalSearchMarker.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: [10, 10, 10, 0.2] }),
            stroke: new Stroke({ color: '#000000', width: 2 }),
          }),
        })
      );

      externalSearchMarkerRef.current = externalSearchMarker;

      const externalSearchMarkerSource = new VectorSource({
        features: [externalSearchMarker],
        wrapX: false,
      });

      const externalSearchMarkerLayer = new VectorLayer({
        source: externalSearchMarkerSource,
        zIndex: 2000,
      });

      mapRef.current.addLayer(externalSearchMarkerLayer);

      mapRef.current.addControl(
        new ScaleLine({
          className: 'scale-control',
          units: 'degrees',
        })
      );

      // create a source and layer for the "add box" functionality
      const boxSource = new VectorSource({
        wrapX: false,
      });
      const boxVector = new VectorLayer({
        source: boxSource,
        properties: {
          id: 'draw-box-vector',
        },
      });
      boxVector.setZIndex(1000);
      // assign the vector layer to the box ref
      drawBoxRef.current = boxVector;
      mapRef.current.addLayer(boxVector);
    }
    return () => {
      stableMapRef?.setTarget(undefined);
    };
  }, []);

  const handleSearchOverlay = useCallback(
    (e: MapBrowserEvent) => {
      if (e.originalEvent.altKey) {
        searchOverlayHelper(
          e.map,
          externalSearchRef,
          externalSearchMarkerRef,
          e.coordinate,
          transformGraticuleCoords(e.coordinate, flipTiles)
        );
      } else {
        const simbadOverlay = e.map.getOverlayById('simbad-search-overlay');
        if (simbadOverlay) {
          externalSearchRef.current!.innerHTML = '';
          simbadOverlay.setPosition(undefined);
          externalSearchMarkerRef.current?.setGeometry(undefined);
        }
      }
    },
    [externalSearchMarkerRef.current, flipTiles]
  );

  useEffect(() => {
    if (mapRef.current) {
      if (previousSearchOverlayHandlerRef.current) {
        mapRef.current.un('click', previousSearchOverlayHandlerRef.current);
      }
      previousSearchOverlayHandlerRef.current = handleSearchOverlay;
      mapRef.current.on('click', handleSearchOverlay);
    }
  }, [handleSearchOverlay]);

  useEffect(() => {
    if (mapRef.current) {
      const simbadOverlay = mapRef.current.getOverlayById(
        'simbad-search-overlay'
      );
      if (simbadOverlay) {
        const coords = simbadOverlay.getPosition();
        if (coords) {
          if (externalSearchRef.current) {
            while (externalSearchRef.current.firstChild) {
              externalSearchRef.current.removeChild(
                externalSearchRef.current.firstChild
              );
            }
          }
          const searchCoords = transformCoords(coords, flipTiles, 'search');
          const overlayCoords = transformCoords(coords, flipTiles, 'layer');
          externalSearchRef.current?.append(
            generateSearchContent(searchCoords)
          );
          simbadOverlay.setPosition(overlayCoords);
          externalSearchMarkerRef.current?.setGeometry(
            new Point(overlayCoords)
          );
        }
      }
    }
  }, [flipTiles]);

  /**
   * Updates map layer when new baselayer is selected and/or color map settings change
   */
  useEffect(() => {
    if (mapRef.current && activeBaselayer) {
      mapRef.current.getAllLayers().forEach((layer) => {
        const layerId = layer.get('id');
        if (!layerId) return;
        if (layerId.includes('baselayer') || layerId.includes('external')) {
          mapRef.current?.removeLayer(layer);
        }
      });
      if (assertInternalBaselayer(activeBaselayer) && activeInternalTileLayer) {
        mapRef.current.addLayer(activeInternalTileLayer);
      } else {
        const externalBaselayer = EXTERNAL_BASELAYERS.find(
          (b) => b.layer_id === activeBaselayer.layer_id
        );
        const activeLayer = externalTileLayers.find(
          (t) => t.get('id') === activeBaselayer.layer_id
        )!;

        if (!externalBaselayer || !activeLayer) return;

        mapRef.current.addLayer(activeLayer);
      }
    }
  }, [activeBaselayer, activeInternalTileLayer]);

  /**
   * Add keyboard support for switching baselayers
   */
  useEffect(() => {
    // Remove old handler if exists
    if (previousKeyboardHandlerRef.current) {
      document.removeEventListener(
        'keypress',
        previousKeyboardHandlerRef.current
      );
    }

    // Create new handler
    const newHandler = (e: KeyboardEvent) => {
      // Return early if target is in an input
      if ((e.target as HTMLElement)?.closest('input')) {
        return;
      }
      if (backHistoryStack.length && e.key === 'h') {
        goBack();
      }
      if (forwardHistoryStack.length && e.key === 'l') {
        goForward();
      }
    };

    // Add new handler and update the ref
    document.addEventListener('keypress', newHandler);
    previousKeyboardHandlerRef.current = newHandler;

    // Remove handler when component unmounts
    return () =>
      document.removeEventListener(
        'keypress',
        previousKeyboardHandlerRef.current ?? newHandler
      );
  }, [backHistoryStack, forwardHistoryStack, goBack, goForward]);

  const disableToggleForNewBox = isDrawing || isNewBoxDrawn;

  /**
   * Toggles the state of flipTiles and also preserves the center
   * of the map's view
   */
  const handleFlipTiles = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      const view = map.getView();
      const center = view.getCenter();
      const newCenter = transformCoords(center ?? [0, 0], flipTiles, 'layer');
      view.setCenter(newCenter);
    }
    setFlipTiles(!flipTiles);
  }, [setFlipTiles, flipTiles, mapRef.current]);

  return (
    <div id="map" style={{ cursor: isDrawing ? 'crosshair' : 'auto' }}>
      <ToggleSwitch
        checked={flipTiles}
        onChange={handleFlipTiles}
        disabled={
          !assertInternalBaselayer(activeBaselayer) || disableToggleForNewBox
        }
        disabledMessage={
          disableToggleForNewBox
            ? 'You cannot switch when drawing a new highlight region.'
            : 'You cannot switch to an incompatible RA range.'
        }
      />
      <div ref={externalSearchRef} className="ol-popup"></div>
      <div className="draw-box-btn-container">
        <button
          type="button"
          className="map-btn"
          title="Draw a region on the map"
          onClick={() => setIsDrawing(true)}
          disabled={isDrawing}
        >
          <CropIcon />
        </button>
      </div>
      <CenterMapFeature
        mapRef={mapRef}
        externalSearchRef={externalSearchRef}
        externalSearchMarkerRef={externalSearchMarkerRef}
        flipped={flipTiles}
      />
      <SourcesLayer
        sourceGroups={sourceGroups}
        activeSourceGroupIds={activeSourceGroupIds}
        mapRef={mapRef}
        flipped={flipTiles}
      />
      <HighlightBoxLayer
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        mapRef={mapRef}
        setActiveBoxIds={setActiveBoxIds}
        submapData={submapData}
        flipped={flipTiles}
      />
      <AddHighlightBoxLayer
        mapRef={mapRef}
        drawBoxRef={drawBoxRef}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        setIsNewBoxDrawn={setIsNewBoxDrawn}
        submapData={submapData}
        flipped={flipTiles}
      />
      <LayerSelector
        mapGroups={mapGroups}
        onBaselayerChange={onBaselayerChange}
        activeBaselayerId={activeBaselayer?.layer_id}
        sourceGroups={sourceGroups}
        activeSourceGroupIds={activeSourceGroupIds}
        onSelectedSourceGroupsChange={onSelectedSourceGroupsChange}
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        onSelectedHighlightBoxChange={onSelectedHighlightBoxChange}
        isFlipped={flipTiles}
        disableGoBack={!backHistoryStack.length}
        disableGoForward={!forwardHistoryStack.length}
        goBack={goBack}
        goForward={goForward}
      />
      <GraticuleLayer mapRef={mapRef} flipped={flipTiles} />
      {coordinates && (
        <CoordinatesDisplay
          coordinates={coordinates}
          flipped={flipTiles}
          mapRef={mapRef}
          externalSearchRef={externalSearchRef}
          externalSearchMarkerRef={externalSearchMarkerRef}
        />
      )}
    </div>
  );
}
