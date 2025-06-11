import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {
  get as getProjection,
  getPointResolution,
  transform,
  toLonLat,
  getTransform,
} from 'ol/proj.js';
import 'ol/ol.css';
import {
  Band,
  BaselayerState,
  Box,
  SourceList,
  SubmapData,
} from '../types/maps';
import {
  CAR_BBOX,
  DEFAULT_INTERNAL_MAP_SETTINGS,
  EXTERNAL_BASELAYERS,
  MERCATOR_BBOX,
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
import { assertBand } from '../reducers/baselayerReducer';
import { getBaselayerResolutions } from '../utils/layerUtils';
import { applyTransform } from 'ol/extent';

export type MapProps = {
  bands: Band[];
  baselayerState: BaselayerState;
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
  const [flipTiles, setFlipTiles] = useState(false);

  const { activeBaselayer, cmap, cmapValues } = baselayerState;

  const tileLayers = useMemo(() => {
    return bands.map((band) => {
      return new TileLayer({
        properties: { id: 'baselayer-' + band.id },
        source: new XYZ({
          url: `${SERVICE_URL}/maps/${band.map_id}/${band.id}/{z}/{-y}/{x}/tile.png?cmap=${cmap}&vmin=${cmapValues?.min}&vmax=${cmapValues?.max}&flip=${flipTiles}`,
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
  }, [bands]);

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
        const units = mapRef.current?.getView().getProjection().getUnits();
        if (units === 'm') {
          const lonLat = toLonLat(e.coordinate);
          setCoordinates(lonLat);
        } else {
          setCoordinates(e.coordinate);
        }
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
            const mapProj = e.map.getView().getProjection();
            let searchCoords = e.coordinate;
            let mapPosition = e.coordinate;
            if (mapProj.getCode() === 'EPSG:3857') {
              searchCoords = toLonLat(e.coordinate);
            }
            externalSearchRef.current?.append(
              generateSearchContent(searchCoords)
            );
            simbadOverlay.setPosition(mapPosition);
            externalSearchMarker.setGeometry(new Point(mapPosition));
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

  const onChangeProjection = useCallback(
    (projection: string) => {
      // (projection: string, extent: number[]) => {
      if (mapRef.current) {
        const currentView = mapRef.current.getView();
        const currentProjection = currentView.getProjection();
        const newProjection = getProjection(projection)!;
        const fromLonLat = getTransform('EPSG:4326', newProjection);
        const bbox = projection === 'EPSG:4326' ? CAR_BBOX : MERCATOR_BBOX;
        newProjection.setWorldExtent(bbox);

        // approximate calculation of projection extent,
        // checking if the world extent crosses the dateline
        if (bbox[0] > bbox[2]) {
          bbox[2] += 360;
        }

        const extent = applyTransform(bbox, fromLonLat, undefined, 8);

        const currentResolution = currentView.getResolution();
        const currentCenter = currentView.getCenter() ?? [0, 0];
        const currentRotation = currentView.getRotation();
        const newCenter = transform(
          currentCenter,
          currentProjection,
          newProjection
        );
        const currentMPU = currentProjection.getMetersPerUnit();
        const newMPU = newProjection!.getMetersPerUnit();
        const currentPointResolution =
          getPointResolution(
            currentProjection,
            1 / currentMPU!,
            currentCenter,
            'm'
          ) * currentMPU!;
        const newPointResolution =
          getPointResolution(newProjection!, 1 / newMPU!, newCenter, 'm') *
          newMPU!;
        const newResolution =
          (currentResolution! * currentPointResolution) / newPointResolution;

        newProjection.setExtent(extent);

        const newView = new View({
          center: newCenter,
          resolution: newResolution,
          rotation: currentRotation,
          projection: newProjection,
          extent,
          showFullExtent: true,
          multiWorld: true,
        });

        mapRef.current.setView(newView);
        newView.fit(extent);
        newView.setCenter(newCenter);
      }
    },
    [mapRef.current]
  );

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
        const resolutionZ0 = 180 / activeBaselayer.tile_size;
        const levels = activeBaselayer.levels;
        const resolutions = [];
        for (let i = 0; i < levels; i++) {
          resolutions.push(resolutionZ0 / 2 ** i);
        }
        const source = new XYZ({
          url: `${SERVICE_URL}/maps/${activeBaselayer.map_id}/${activeBaselayer.id}/{z}/{-y}/{x}/tile.png?cmap=${cmap}&vmin=${cmapValues?.min}&vmax=${cmapValues?.max}&flip=${flipTiles}`,
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
        // onChangeProjection(
        //   DEFAULT_INTERNAL_MAP_SETTINGS.projection
        //   // DEFAULT_INTERNAL_MAP_SETTINGS.extent,
        // );
      } else {
        const externalBaselayer = EXTERNAL_BASELAYERS.find(
          (b) => b.id === activeBaselayer.id
        );
        const activeLayer = externalTileLayers.find(
          (t) => t.get('id') === activeBaselayer.id
        )!;

        if (!externalBaselayer || !activeLayer) return;

        // onChangeProjection(
        //   externalBaselayer.projection
        //   // externalBaselayer.extent,
        // );
        mapRef.current.addLayer(activeLayer);
      }
    }
  }, [activeBaselayer, cmap, cmapValues, tileLayers, flipTiles]);

  return (
    <div id="map" style={{ cursor: isDrawing ? 'crosshair' : 'auto' }}>
      <div style={{ position: 'absolute', left: 50, top: 10, zIndex: 5000 }}>
        <label style={{ display: 'flex', flexDirection: 'row', gap: 5 }}>
          <input
            type="checkbox"
            checked={flipTiles}
            onChange={(e) => {
              console.log(e.target.checked);
              setFlipTiles(!flipTiles);
            }}
          />
          {flipTiles ? '360 < ra < 0' : '-180 < ra < 180'}
        </label>
      </div>
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
