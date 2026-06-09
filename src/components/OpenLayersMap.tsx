import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, View, Feature, MapBrowserEvent } from 'ol';
import { Overlay } from 'ol';
import ScaleLine from 'ol/control/ScaleLine.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Circle as CircleStyle, Style, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';
import { BaselayersState, DefaultData } from '../types/layers';
import {
  DEFAULT_INTERNAL_MAP_SETTINGS,
  SERVICE_URL,
} from '../configs/mapConfigs';
import { CoordinatesDisplay } from './CoordinatesDisplay';
import { LayerSelector } from './LayerSelector';
import { CropIcon } from './icons/CropIcon';
import { GraticuleLayer } from './layers/GraticuleLayer';
import { SourcesLayer } from './layers/SourcesLayer';
import {
  generateSearchContent,
  searchOverlayHelper,
} from '../utils/externalSearchUtils';
import './styles/highlight-box.css';
import {
  assertInternalBaselayer,
  BaselayersAction,
} from '../reducers/baselayersReducer';
import { transformCoords, transformGraticuleCoords } from '../utils/layerUtils';
import { ToggleSwitch } from './ToggleSwitch';
import { CenterMapFeature } from './CenterMapFeature';
import { AperturesLayer } from './layers/AperturesLayer';
import { LoadingOverlay } from './LoadingOverlay';
import { useTileLoading } from '../hooks/useTileLoading';
import { useLayerRegistry } from '../hooks/useLayerRegistry';
import { useBaselayerChange } from '../hooks/useBaselayerChange';
import { useOverlayData } from '../hooks/useOverlayData';
import { BoxLayers } from './layers/BoxLayers';

export type MapProps = {
  isAuthenticated: boolean;
  defaultData: DefaultData;
  baselayersState: BaselayersState;
  dispatchBaselayersChange: React.ActionDispatch<[BaselayersAction]>;
};

export function OpenLayersMap({
  isAuthenticated,
  defaultData,
  baselayersState,
  dispatchBaselayersChange,
}: MapProps) {
  const mapRef = useRef<Map | null>(null);
  const drawBoxRef = useRef<VectorLayer | null>(null);
  const externalSearchRef = useRef<HTMLDivElement | null>(null);
  const externalSearchMarkerRef = useRef<Feature | null>(null);
  const previousSearchOverlayHandlerRef =
    useRef<
      (
        e: MapBrowserEvent<KeyboardEvent | PointerEvent | WheelEvent>
      ) => void | null
    >(null);
  const previousKeyboardHandlerRef = useRef<(e: KeyboardEvent) => void>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isNewBoxDrawn, setIsNewBoxDrawn] = useState(false);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [flipTiles, setFlipTiles] = useState(true);

  const isLoadingTiles = useTileLoading(mapRef);

  const { activeBaselayer } = baselayersState;

  const { getOrCreateLayer } = useLayerRegistry();

  const {
    changeBaselayer,
    goBack,
    goForward,
    optimisticBaselayerId,
    isPending,
    disableGoBack,
    disableGoForward,
  } = useBaselayerChange(
    baselayersState,
    dispatchBaselayersChange,
    flipTiles,
    setFlipTiles
  );

  const {
    sourceGroups,
    activeSourceGroupIds,
    areSourceGroupsLoading,
    onSelectedSourceGroupsChange,
    highlightBoxes,
    activeBoxIds,
    areHighlightBoxesLoading,
    setActiveBoxIds,
    onSelectedHighlightBoxChange,
  } = useOverlayData(isAuthenticated);

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

      setIsMapInitialized(true);

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
    [externalSearchMarkerRef, flipTiles]
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

      const isInternal = assertInternalBaselayer(activeBaselayer);

      const activeLayer = getOrCreateLayer(
        activeBaselayer,
        isInternal
          ? `${SERVICE_URL}/layers/${activeBaselayer.layer_id}/{z}/{-y}/{x}/tile.png?cmap=${activeBaselayer.cmap}&vmin=${activeBaselayer.isLogScale ? Math.pow(10, activeBaselayer.vmin!) : activeBaselayer.vmin}&vmax=${activeBaselayer.isLogScale ? Math.pow(10, activeBaselayer.vmax!) : activeBaselayer.vmax}&flip=${flipTiles}&log_norm=${activeBaselayer.isLogScale}&abs=${activeBaselayer.isAbsoluteValue}`
          : undefined
      );
      mapRef.current.addLayer(activeLayer);
    }
  }, [activeBaselayer, flipTiles, getOrCreateLayer]);

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
      if (!disableGoBack && e.key === 'h') {
        goBack();
      }
      if (!disableGoForward && e.key === 'l') {
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
  }, [disableGoBack, disableGoForward, goBack, goForward]);

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
  }, [setFlipTiles, flipTiles, mapRef]);

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
      <AperturesLayer
        mapRef={mapRef}
        activeBaselayerId={activeBaselayer?.layer_id}
        flipped={flipTiles}
      />
      <SourcesLayer
        sourceGroups={sourceGroups}
        activeSourceGroupIds={activeSourceGroupIds}
        mapRef={mapRef}
        flipped={flipTiles}
      />
      <BoxLayers
        mapRef={mapRef}
        drawBoxRef={drawBoxRef}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        setIsNewBoxDrawn={setIsNewBoxDrawn}
        flipped={flipTiles}
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        setActiveBoxIds={setActiveBoxIds}
        activeBaselayer={activeBaselayer}
      />
      <LayerSelector
        defaultData={defaultData}
        onBaselayerChange={changeBaselayer}
        selectedBaselayerId={optimisticBaselayerId}
        activeBaselayer={activeBaselayer}
        sourceGroups={sourceGroups}
        activeSourceGroupIds={activeSourceGroupIds}
        onSelectedSourceGroupsChange={onSelectedSourceGroupsChange}
        areSourceGroupsLoading={areSourceGroupsLoading}
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        onSelectedHighlightBoxChange={onSelectedHighlightBoxChange}
        areHighlightBoxesLoading={areHighlightBoxesLoading}
        isFlipped={flipTiles}
        disableGoBack={disableGoBack}
        disableGoForward={disableGoForward}
        goBack={goBack}
        goForward={goForward}
      />
      <GraticuleLayer
        mapRef={mapRef}
        flipped={flipTiles}
        isMapInitialized={isMapInitialized}
      />
      <CoordinatesDisplay
        flipped={flipTiles}
        mapRef={mapRef}
        externalSearchRef={externalSearchRef}
        externalSearchMarkerRef={externalSearchMarkerRef}
        isMapInitialized={isMapInitialized}
      />
      <LoadingOverlay isLoading={isPending || isLoadingTiles} />
    </div>
  );
}
