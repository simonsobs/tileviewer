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
import { BaselayersState, Box, SourceList, SubmapData } from '../types/maps';
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
import { generateSearchContent } from '../utils/externalSearchUtils';
import './styles/highlight-controls.css';
import './styles/area-selection.css';
import { assertBand } from '../reducers/baselayersReducer';
import {
  getBaselayerResolutions,
  transformCoords,
  transformGraticuleCoords,
} from '../utils/layerUtils';
import { ToggleSwitch } from './ToggleSwitch';

export type MapProps = {
  baselayersState: BaselayersState;
  onBaseLayerChange: (baselayerId: string) => void;
  sourceLists?: SourceList[];
  activeSourceListIds: number[];
  onSelectedSourceListsChange: (e: ChangeEvent<HTMLInputElement>) => void;
  highlightBoxes: Box[] | undefined;
  setBoxes: (boxes: Box[]) => void;
  activeBoxIds: number[];
  setActiveBoxIds: React.Dispatch<React.SetStateAction<number[]>>;
  onSelectedHighlightBoxChange: (e: ChangeEvent<HTMLInputElement>) => void;
  submapData?: SubmapData;
  addOptimisticHighlightBox: (action: Box) => void;
};

export function OpenLayersMap({
  baselayersState,
  onBaseLayerChange,
  sourceLists = [],
  onSelectedSourceListsChange,
  activeSourceListIds,
  highlightBoxes,
  setBoxes,
  activeBoxIds,
  setActiveBoxIds,
  onSelectedHighlightBoxChange,
  submapData,
  addOptimisticHighlightBox,
}: MapProps) {
  const mapRef = useRef<Map | null>(null);
  const drawBoxRef = useRef<VectorLayer | null>(null);
  const externalSearchRef = useRef<HTMLDivElement | null>(null);
  const externalSearchMarkerRef = useRef<Feature | null>(null);
  const previousSearchOverlayHandlerRef =
    useRef<(e: MapBrowserEvent<any>) => void | null>(null);
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [isNewBoxDrawn, setIsNewBoxDrawn] = useState(false);
  const [flipTiles, setFlipTiles] = useState(false);

  const { activeBaselayer, internalBaselayersState } = baselayersState;

  const tileLayers = useMemo(() => {
    return internalBaselayersState?.map((band) => {
      return new TileLayer({
        properties: { id: 'baselayer-' + band.id },
        source: new XYZ({
          url: `${SERVICE_URL}/maps/${band.map_id}/${band.id}/{z}/{-y}/{x}/tile.png?cmap=${band.cmap}&vmin=${band.cmapValues.min}&vmax=${band.cmapValues.max}&flip=${flipTiles}`,
          tileGrid: new TileGrid({
            extent: [-180, -90, 180, 90],
            origin: [-180, 90],
            tileSize: band.tile_size,
            resolutions: getBaselayerResolutions(
              180,
              band.tile_size,
              band.levels
            ),
          }),
          interpolate: false,
          projection: 'EPSG:4326',
          tilePixelRatio: band.tile_size / 256,
        }),
      });
    });
  }, [internalBaselayersState, flipTiles]);

  const externalTileLayers = useMemo(() => {
    return EXTERNAL_BASELAYERS.map((b) => {
      return new TileLayer({
        properties: { id: b.id },
        source: new XYZ({
          url: typeof b.url === 'string' ? b.url : undefined,
          tileUrlFunction: typeof b.url !== 'string' ? b.url : undefined,
          projection: b.projection,
          tileGrid: new TileGrid({
            extent: b.extent,
            resolutions: getBaselayerResolutions(
              b.extent[2] - b.extent[0],
              256,
              9
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
      if (e.originalEvent.metaKey) {
        const simbadOverlay = e.map.getOverlayById('simbad-search-overlay');
        if (simbadOverlay) {
          if (externalSearchRef.current) {
            while (externalSearchRef.current.firstChild) {
              externalSearchRef.current.removeChild(
                externalSearchRef.current.firstChild
              );
            }
          }
          const overlayCoords = e.coordinate;
          const searchCoords = transformGraticuleCoords(
            overlayCoords,
            flipTiles
          );
          externalSearchRef.current?.append(
            generateSearchContent(searchCoords)
          );
          simbadOverlay.setPosition(overlayCoords);
          externalSearchMarkerRef.current?.setGeometry(
            new Point(overlayCoords)
          );
        }
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
   * Updates tilelayers when new baselayer is selected and/or color map settings change
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
      if (assertBand(activeBaselayer)) {
        const activeLayer = tileLayers!.find(
          (t) => t.get('id') === 'baselayer-' + activeBaselayer!.id
        )!;
        mapRef.current.addLayer(activeLayer);
      } else {
        const externalBaselayer = EXTERNAL_BASELAYERS.find(
          (b) => b.id === activeBaselayer.id
        );
        const activeLayer = externalTileLayers.find(
          (t) => t.get('id') === activeBaselayer.id
        )!;

        if (!externalBaselayer || !activeLayer) return;

        mapRef.current.addLayer(activeLayer);
      }
    }
  }, [activeBaselayer, tileLayers]);

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
        disabled={!assertBand(activeBaselayer) || disableToggleForNewBox}
        disabledMessage={
          disableToggleForNewBox
            ? 'You cannot switch when drawing a new highlight region.'
            : 'You cannot switch to an incompatible RA range.'
        }
      />
      <div ref={externalSearchRef} className="ol-popup"></div>
      <div className="ol-zoom ol-control draw-box-btn-container">
        <button
          type="button"
          className="draw-box-btn"
          title="Draw a region on the map"
          onClick={() => setIsDrawing(true)}
          disabled={isDrawing}
        >
          <CropIcon />
        </button>
      </div>
      <SourcesLayer
        sourceLists={sourceLists}
        activeSourceListIds={activeSourceListIds}
        mapRef={mapRef}
        flipped={flipTiles}
      />
      <HighlightBoxLayer
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        mapRef={mapRef}
        setActiveBoxIds={setActiveBoxIds}
        setBoxes={setBoxes}
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
        setBoxes={setBoxes}
        setActiveBoxIds={setActiveBoxIds}
        addOptimisticHighlightBox={addOptimisticHighlightBox}
        flipped={flipTiles}
      />
      <LayerSelector
        internalBaselayers={internalBaselayersState}
        onBaseLayerChange={onBaseLayerChange}
        activeBaselayerId={activeBaselayer?.id}
        sourceLists={sourceLists}
        activeSourceListIds={activeSourceListIds}
        onSelectedSourceListsChange={onSelectedSourceListsChange}
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        onSelectedHighlightBoxChange={onSelectedHighlightBoxChange}
        isFlipped={flipTiles}
      />
      <GraticuleLayer mapRef={mapRef} flipped={flipTiles} />
      {coordinates && (
        <CoordinatesDisplay coordinates={coordinates} flipped={flipTiles} />
      )}
    </div>
  );
}
