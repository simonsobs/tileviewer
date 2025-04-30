import { Map, View } from 'ol';
import { TileGrid } from 'ol/tilegrid';
import { Tile as TileLayer } from 'ol/layer';
import { XYZ } from 'ol/source';
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  Band,
  BaselayerState,
  Box,
  SourceList,
  SubmapData,
  NewBoxData,
} from '../types/maps';
import { DEFAULT_MAP_SETTINGS, SERVICE_URL } from '../configs/mapSettings';
import 'ol/ol.css';
import { CoordinatesDisplay } from './CoordinatesDisplay';
import { LayerSelector } from './LayerSelector';
import ScaleLine from 'ol/control/ScaleLine.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import './styles/highlight-controls.css';
import './styles/area-selection.css';
import { CropIcon } from './icons/CropIcon';
import Draw, { createBox } from 'ol/interaction/Draw.js';
import { HighlightBoxLayer } from './layers/HighlightBoxLayer';
import { AddBoxDialog } from './AddBoxDialog';
import { BoxMenu } from './BoxMenu';
import { GraticuleLayer } from './layers/GraticuleLayer';
import { SourcesLayer } from './layers/SourcesLayer';

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
  const drawRef = useRef<Draw | null>(null);
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [newBoxData, setNewBoxData] = useState<NewBoxData | undefined>(
    undefined
  );
  const [showNewBoxMenu, setShowNewBoxMenu] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAddBoxDialog, setShowAddBoxDialog] = useState(false);

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

  /**
   * Handles adding/removing Draw interaction in response to isDrawing state
   */
  useEffect(() => {
    const map = mapRef.current;
    const source = drawBoxRef.current?.getSource();
    if (map && source) {
      if (isDrawing) {
        source.clear();
        setNewBoxData(undefined);
        setShowNewBoxMenu(false);

        const draw = new Draw({
          source: source,
          type: 'Circle',
          geometryFunction: createBox(),
        });

        draw.on('drawend', (e) => {
          const extent = e.feature.getGeometry()?.getExtent();

          if (extent) {
            const [
              top_left_ra,
              bottom_right_dec,
              bottom_right_ra,
              top_left_dec,
            ] = extent;
            const topLeftBoxPosition = map.getPixelFromCoordinate([
              top_left_ra,
              top_left_dec,
            ]);
            const bottomRightBoxPosition = map.getPixelFromCoordinate([
              bottom_right_ra,
              bottom_right_dec,
            ]);
            const boxWidth = Math.abs(
              topLeftBoxPosition[0] - bottomRightBoxPosition[0]
            );
            const boxHeight = Math.abs(
              topLeftBoxPosition[1] - bottomRightBoxPosition[1]
            );
            setNewBoxData({
              top_left_ra,
              top_left_dec,
              bottom_right_ra,
              bottom_right_dec,
              top: topLeftBoxPosition[1],
              left: topLeftBoxPosition[0],
              width: boxWidth,
              height: boxHeight,
            });
          }

          setIsDrawing(false);
        });

        map.addInteraction(draw);
        drawRef.current = draw;
      } else {
        if (drawRef.current) {
          map.removeInteraction(drawRef.current);
          drawRef.current = null;
          setNewBoxData(undefined);
          setShowNewBoxMenu(false);
        }
      }

      return () => {
        if (drawRef.current) {
          map.removeInteraction(drawRef.current);
          drawRef.current = null;
        }
      };
    }
  }, [mapRef.current, isDrawing]);

  const handleAddBoxCleanup = useCallback(() => {
    setNewBoxData(undefined);
    const source = drawBoxRef.current?.getSource();
    if (source) {
      source.clear();
    }
  }, [drawBoxRef.current]);

  return (
    <div id="map" style={{ cursor: isDrawing ? 'crosshair' : 'auto' }}>
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
      {newBoxData && (
        <BoxMenu
          isNewBox={true}
          boxData={newBoxData}
          setShowMenu={setShowNewBoxMenu}
          showMenu={showNewBoxMenu}
          submapData={submapData}
          additionalButtons={[
            <button
              key="add-new-box"
              className="area-select-button highlight-box-button"
              onClick={() => setShowAddBoxDialog(true)}
            >
              Add as Box
            </button>,
            <button
              key="remove-region"
              className="area-select-button highlight-box-button"
              onClick={handleAddBoxCleanup}
            >
              Remove Region
            </button>,
          ]}
        />
      )}
      <AddBoxDialog
        showAddBoxDialog={showAddBoxDialog}
        setShowAddBoxDialog={setShowAddBoxDialog}
        newBoxData={newBoxData}
        setBoxes={setBoxes}
        setActiveBoxIds={setActiveBoxIds}
        addOptimisticHighlightBox={addOptimisticHighlightBox}
        handleAddBoxCleanup={handleAddBoxCleanup}
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
