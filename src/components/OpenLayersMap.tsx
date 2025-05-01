import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Map, View, Feature } from 'ol';
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
  Band,
  BaselayerState,
  Box,
  SourceList,
  SubmapData,
} from '../types/maps';
import { DEFAULT_MAP_SETTINGS, SERVICE_URL } from '../configs/mapSettings';
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

export type MapProps = {
  bands: Band[];
  baselayerState: BaselayerState;
  onBaseLayerChange: (baselayerId: number) => void;
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
  bands,
  baselayerState,
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
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [isDrawing, setIsDrawing] = useState(false);

  const { activeBaselayer, cmap, cmapValues } = baselayerState;

  const tileLayers = useMemo(() => {
    return bands.map((band) => {
      const resolutionZ0 = 180 / band.tile_size;
      const levels = band.levels;
      const resolutions = [];
      for (let i = 0; i < levels; i++) {
        resolutions.push(resolutionZ0 / 2 ** i);
      }
      return new TileLayer({
        properties: { id: 'baselayer-' + band.id },
        source: new XYZ({
          url: `${SERVICE_URL}/maps/${band.map_id}/${band.id}/{z}/{-y}/{x}/tile.png?cmap=${cmap}&vmin=${cmapValues?.min}&vmax=${cmapValues?.max}`,
          tileGrid: new TileGrid({
            extent: [-180, -90, 180, 90],
            origin: [-180, 90],
            tileSize: band.tile_size,
            resolutions,
          }),
          interpolate: false,
          projection: 'EPSG:4326',
          tilePixelRatio: band.tile_size / 256,
        }),
      });
    });
  }, [bands]);

  /**
   * Create the map with a scale control, a layer for the "add box" functionality
   * and a 'pointermove' interaction for the coordinate display
   */
  useEffect(() => {
    const stableMapRef = mapRef.current;
    if (!stableMapRef) {
      mapRef.current = new Map({
        target: 'map',
        view: new View(DEFAULT_MAP_SETTINGS),
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

      const externalSearchMarkerSource = new VectorSource({
        features: [externalSearchMarker],
      });

      const externalSearchMarkerLayer = new VectorLayer({
        source: externalSearchMarkerSource,
        zIndex: 2000,
      });

      mapRef.current.addLayer(externalSearchMarkerLayer);

      // Create the click handler that displays/hides the marker and the popup
      mapRef.current.on('click', (e) => {
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
            externalSearchRef.current?.append(
              generateSearchContent(e.coordinate)
            );
            simbadOverlay.setPosition(e.coordinate);
            externalSearchMarker.setGeometry(new Point(e.coordinate));
          }
        } else {
          const simbadOverlay = e.map.getOverlayById('simbad-search-overlay');
          if (simbadOverlay) {
            externalSearchRef.current!.innerHTML = '';
            simbadOverlay.setPosition(undefined);
            externalSearchMarker.setGeometry(undefined);
          }
        }
      });
      /**
       * END
       */

      mapRef.current.addControl(
        new ScaleLine({
          className: 'scale-control',
          units: 'degrees',
        })
      );

      // create a source and layer for the "add box" functionality
      const boxSource = new VectorSource();
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

  /**
   * Updates tilelayers when new baselayer is selected and/or color map settings change
   */
  useEffect(() => {
    if (mapRef.current && activeBaselayer) {
      mapRef.current.getAllLayers().forEach((layer) => {
        const layerId = layer.get('id');
        if (!layerId) return;
        if (layerId.includes('baselayer')) {
          mapRef.current?.removeLayer(layer);
        }
      });
      const resolutionZ0 = 180 / activeBaselayer.tile_size;
      const levels = activeBaselayer.levels;
      const resolutions = [];
      for (let i = 0; i < levels; i++) {
        resolutions.push(resolutionZ0 / 2 ** i);
      }
      const source = new XYZ({
        url: `${SERVICE_URL}/maps/${activeBaselayer.map_id}/${activeBaselayer.id}/{z}/{-y}/{x}/tile.png?cmap=${cmap}&vmin=${cmapValues?.min}&vmax=${cmapValues?.max}`,
        tileGrid: new TileGrid({
          extent: [-180, -90, 180, 90],
          origin: [-180, 90],
          tileSize: activeBaselayer.tile_size,
          resolutions,
        }),
        interpolate: false,
        projection: 'EPSG:4326',
        tilePixelRatio: activeBaselayer.tile_size / 256,
      });
      const activeLayer = tileLayers.find(
        (t) => t.get('id') === 'baselayer-' + activeBaselayer!.id
      )!;
      activeLayer.setSource(source);
      mapRef.current.addLayer(activeLayer);
    }
  }, [activeBaselayer, cmap, cmapValues, tileLayers]);

  return (
    <div id="map" style={{ cursor: isDrawing ? 'crosshair' : 'auto' }}>
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
      />
      <HighlightBoxLayer
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        mapRef={mapRef}
        setActiveBoxIds={setActiveBoxIds}
        setBoxes={setBoxes}
        submapData={submapData}
      />
      <AddHighlightBoxLayer
        mapRef={mapRef}
        drawBoxRef={drawBoxRef}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        submapData={submapData}
        setBoxes={setBoxes}
        setActiveBoxIds={setActiveBoxIds}
        addOptimisticHighlightBox={addOptimisticHighlightBox}
      />
      <LayerSelector
        bands={bands}
        onBaseLayerChange={onBaseLayerChange}
        activeBaselayerId={activeBaselayer?.id}
        sourceLists={sourceLists}
        activeSourceListIds={activeSourceListIds}
        onSelectedSourceListsChange={onSelectedSourceListsChange}
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        onSelectedHighlightBoxChange={onSelectedHighlightBoxChange}
      />
      <GraticuleLayer mapRef={mapRef} />
      {coordinates && <CoordinatesDisplay coordinates={coordinates} />}
    </div>
  );
}
