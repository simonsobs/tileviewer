import { Feature, Map, Overlay, View } from 'ol';
import { TileGrid } from 'ol/tilegrid';
import { Tile as TileLayer, Graticule } from 'ol/layer';
import { XYZ } from 'ol/source';
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  FormEvent,
  useCallback,
} from 'react';
import { Band, BaselayerState, Box, Source, SourceList } from '../types/maps';
import { DEFAULT_MAP_SETTINGS, SERVICE_URL } from '../configs/mapSettings';
import 'ol/ol.css';
import Stroke from 'ol/style/Stroke.js';
import { CoordinatesDisplay } from './CoordinatesDisplay';
import { LayerSelector } from './LayerSelector';
import ScaleLine from 'ol/control/ScaleLine.js';
import LayerGroup from 'ol/layer/Group';
import { Circle } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Select from 'ol/interaction/Select.js';
import { click } from 'ol/events/condition';
import { fromExtent } from 'ol/geom/Polygon.js';
import './styles/highlight-controls.css';
import './styles/area-selection.css';
import { MenuIcon } from './icons/MenuIcon';
import { SubmapData } from './AreaSelection';
import { SUBMAP_DOWNLOAD_OPTIONS } from '../configs/submapConfigs';
import {
  deleteSubmapBox,
  downloadSubmap,
  addSubmapAsBox,
} from '../utils/fetchUtils';
import { CropIcon } from './icons/CropIcon';
import Draw, { createBox } from 'ol/interaction/Draw.js';
import { Dialog } from './Dialog';

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

export type BoxWithPositionalData = Box & {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type NewBoxData = Omit<Box, 'id' | 'name' | 'description'> & {
  top: number;
  left: number;
  width: number;
  height: number;
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
  const popupRef = useRef<HTMLDivElement | null>(null);
  const boxOverlayRef = useRef<HTMLDivElement | null>(null);
  const drawBoxRef = useRef<VectorLayer | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [selectedSourceData, setSelectedSourceData] = useState<
    Source | undefined
  >(undefined);
  const [selectedBoxData, setSelectedBoxData] = useState<
    BoxWithPositionalData | undefined
  >(undefined);
  const [newBoxData, setNewBoxData] = useState<NewBoxData | undefined>(
    undefined
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showNewBoxMenu, setShowNewBoxMenu] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAddBoxDialog, setShowAddBoxDialog] = useState(false);

  const { activeBaselayer, cmap, cmapValues } = baselayerState;

  const mapConfig = useMemo(
    () => ({
      target: 'map',
      view: new View(DEFAULT_MAP_SETTINGS),
    }),
    []
  );

  const scale = useMemo(
    () =>
      new ScaleLine({
        className: 'scale-control',
        units: 'degrees',
      }),
    []
  );

  const graticule1 = useMemo(() => {
    return new Graticule({
      strokeStyle: new Stroke({
        color: 'rgba(198,198,198,0.5)',
        width: 2,
      }),
      zIndex: 1000,
      showLabels: true,
      lonLabelPosition: 0,
      latLabelPosition: 0.999,
      latLabelFormatter: (lat) => String(lat),
      lonLabelFormatter: (lon) => String(lon),
      wrapX: false,
      properties: {
        id: 'graticule-1',
      },
    });
  }, []);

  const graticule2 = useMemo(() => {
    return new Graticule({
      strokeStyle: new Stroke({
        color: 'rgba(198,198,198,0.5)',
        width: 2,
      }),
      zIndex: 1000,
      showLabels: true,
      lonLabelPosition: 1,
      latLabelPosition: 0.012,
      latLabelFormatter: (lat) => String(lat),
      lonLabelFormatter: (lon) => String(lon),
      wrapX: false,
      properties: {
        id: 'graticule-2',
      },
    });
  }, []);

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

  const sourceOverlays = useMemo(() => {
    if (!sourceLists.length) return [];
    return sourceLists
      .filter((sl) => activeSourceListIds.includes(sl.id))
      .map(
        (sl) =>
          new LayerGroup({
            properties: {
              id: 'sourcelist-group-' + sl.id,
            },
            layers: [
              new VectorLayer({
                source: new VectorSource({
                  features: sl.sources.map(
                    (source) =>
                      new Feature({
                        geometry: new Circle([source.ra, source.dec], 1),
                        sourceData: source,
                      })
                  ),
                }),
                style: {
                  'stroke-width': 2,
                  'stroke-color': '#3388FF',
                  'fill-color': [51, 136, 255, 0.2],
                },
              }),
            ],
            zIndex: 500,
          })
      );
  }, [sourceLists, activeSourceListIds]);

  const highlightBoxOverlays = useMemo(() => {
    if (!highlightBoxes) return [];
    return highlightBoxes
      .filter((box) => activeBoxIds.includes(box.id))
      .map(
        (box) =>
          new VectorLayer({
            properties: {
              id: 'highlight-box-' + box.id,
            },
            source: new VectorSource({
              features: [
                new Feature({
                  geometry: fromExtent([
                    box.top_left_ra,
                    box.bottom_right_dec,
                    box.bottom_right_ra,
                    box.top_left_dec,
                  ]), // minX, minY, maxX, maxY
                  boxData: box,
                }),
              ],
            }),
            zIndex: 500,
          })
      );
  }, [highlightBoxes, activeBoxIds]);

  useEffect(() => {
    const stableMapRef = mapRef.current;
    if (!stableMapRef) {
      mapRef.current = new Map(mapConfig);
      mapRef.current.on('pointermove', (e) => {
        setCoordinates(e.coordinate);
      });
      mapRef.current.addControl(scale);

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
  }, [mapConfig]);

  useEffect(() => {
    if (mapRef.current && activeBaselayer) {
      mapRef.current.getAllLayers().forEach((layer) => {
        const layerId = layer.get('id');
        if (!layerId) return;
        if (layerId.includes('baselayer') || layerId.includes('graticule')) {
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
      mapRef.current.addLayer(graticule1);
      mapRef.current.addLayer(graticule2);
    }
  }, [activeBaselayer, cmap, cmapValues, tileLayers, graticule1, graticule2]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getLayers().forEach((l) => {
      const id = l.get('id') as string;
      if (typeof id === 'string' && id.includes('sourcelist-group')) {
        l.setVisible(false);
      }
    });
    sourceOverlays.forEach((so) => {
      mapRef.current?.addLayer(so);
    });
  }, [sourceOverlays]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (popupRef.current) {
      const popupOverlay = new Overlay({
        element: popupRef.current,
      });
      mapRef.current.addOverlay(popupOverlay);
      const select = new Select({
        condition: click,
        layers: (layer) => {
          return sourceOverlays.some((group) =>
            group.getLayers().getArray().includes(layer)
          );
        },
      });
      mapRef.current.addInteraction(select);
      select.on('select', (e) => {
        const selectedFeatures = e.selected;

        if (selectedFeatures.length === 0) {
          // user clicked on empty space, so clear popup data
          popupOverlay.setPosition(undefined);
          setSelectedSourceData(undefined);
          return;
        }

        selectedFeatures.forEach((feature) => {
          const sourceData = feature.get('sourceData') as Source;
          popupOverlay.setPosition([sourceData.ra, sourceData.dec]);
          setSelectedSourceData(sourceData);
        });
      });
    }
  }, [mapRef.current, popupRef.current, sourceOverlays, activeSourceListIds]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getLayers().forEach((l) => {
      const id = l.get('id') as string;
      if (typeof id === 'string' && id.includes('highlight-box')) {
        l.setVisible(false);
      }
    });
    highlightBoxOverlays.forEach((box) => {
      mapRef.current?.addLayer(box);
    });
  }, [highlightBoxOverlays]);

  useEffect(() => {
    if (!mapRef.current) return;
    const doesOverlayExist = mapRef.current.getOverlayById('box-overlay');
    if (!doesOverlayExist && boxOverlayRef.current) {
      const boxOverlay = new Overlay({
        element: boxOverlayRef.current,
        id: 'box-overlay',
      });
      mapRef.current.addOverlay(boxOverlay);
      mapRef.current.on('pointermove', (e) => {
        if (!e.map.hasFeatureAtPixel(e.pixel)) {
          boxOverlay.setPosition(undefined);
          setSelectedBoxData(undefined);
          setShowMenu(false);
          return;
        }
        e.map.forEachFeatureAtPixel(e.pixel, function (f) {
          const boxData = f.get('boxData') as Box;
          if (!boxData) return;
          const topLeftBoxPosition = e.map.getPixelFromCoordinate([
            boxData.top_left_ra,
            boxData.top_left_dec,
          ]);
          const bottomRightBoxPosition = e.map.getPixelFromCoordinate([
            boxData.bottom_right_ra,
            boxData.bottom_right_dec,
          ]);
          const boxWidth = Math.abs(
            topLeftBoxPosition[0] - bottomRightBoxPosition[0]
          );
          const boxHeight = Math.abs(
            topLeftBoxPosition[1] - bottomRightBoxPosition[1]
          );
          boxOverlay.setPosition([boxData.top_left_ra, boxData.top_left_dec]);
          setSelectedBoxData({
            ...boxData,
            top: topLeftBoxPosition[1],
            left: topLeftBoxPosition[0],
            width: boxWidth,
            height: boxHeight,
          });
        });
      });
    }
  }, [mapRef.current, boxOverlayRef.current]);

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
      <div ref={popupRef} className="source-popup">
        {selectedSourceData && (
          <div className="source-popup-content">
            {selectedSourceData.name ? (
              <h3>{selectedSourceData.name}</h3>
            ) : null}
            <p>
              <span>RA, Dec:</span> ({selectedSourceData.ra},{' '}
              {selectedSourceData.dec})
            </p>
            <p>
              <span>Flux:</span> {selectedSourceData.flux}
            </p>
          </div>
        )}
      </div>
      <div
        ref={boxOverlayRef}
        className="highlight-box-hover-container"
        style={{
          width: selectedBoxData && selectedBoxData.width,
          height: selectedBoxData && selectedBoxData.height,
        }}
      >
        {!showMenu && selectedBoxData && (
          <div>
            <div className="highlight-box-header">
              <button
                className={'menu-button highlight-box-menu-btn'}
                onClick={() => setShowMenu(!showMenu)}
              >
                <MenuIcon />
              </button>
              <h3>{selectedBoxData.name}</h3>
            </div>
            <p>{selectedBoxData.description}</p>
          </div>
        )}
      </div>
      {showMenu && selectedBoxData && (
        <BoxMenu
          isNewBox={false}
          boxData={selectedBoxData}
          setShowMenu={setShowMenu}
          showMenu={showMenu}
          additionalButtons={[
            <button
              className="area-select-button highlight-box-button"
              key="hide-box"
              onClick={() => {
                setActiveBoxIds((prev) =>
                  prev.filter((id) => selectedBoxData.id !== id)
                );
                setShowMenu(false);
                setSelectedBoxData(undefined);
                mapRef.current
                  ?.getOverlayById('box-overlay')
                  ?.setPosition(undefined);
              }}
            >
              Hide Box
            </button>,
            <button
              key="delete-box"
              className="area-select-button highlight-box-button delete-box-button"
              onClick={() => {
                deleteSubmapBox(selectedBoxData.id, setBoxes, setActiveBoxIds);
                setShowMenu(false);
                setSelectedBoxData(undefined);
                mapRef.current
                  ?.getOverlayById('box-overlay')
                  ?.setPosition(undefined);
              }}
            >
              Delete Box
            </button>,
          ]}
          submapData={submapData}
        />
      )}
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
      {coordinates && <CoordinatesDisplay coordinates={coordinates} />}
    </div>
  );
}

type BoxMenuProps = {
  isNewBox: boolean;
  boxData: BoxWithPositionalData | NewBoxData;
  setShowMenu: (showMenu: boolean) => void;
  showMenu: boolean;
  additionalButtons?: ReactNode[];
  submapData?: SubmapData;
};

function BoxMenu({
  isNewBox,
  boxData,
  setShowMenu,
  showMenu,
  additionalButtons = [],
  submapData,
}: BoxMenuProps) {
  return (
    <div
      className="highlight-box-hover-container no-background"
      style={{
        top: boxData.top,
        left: boxData.left,
      }}
    >
      <div>
        <div className="highlight-box-header">
          <button
            className={'menu-button highlight-box-menu-btn'}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MenuIcon />
          </button>
          {showMenu && (
            <div className="menu-btns-container highlight-box-menu-btns-container">
              {SUBMAP_DOWNLOAD_OPTIONS.map((option) => (
                <button
                  className="area-select-button highlight-box-button"
                  key={option.display}
                  onClick={() => {
                    if (submapData) {
                      downloadSubmap(
                        {
                          ...submapData,
                          top: boxData.top_left_dec,
                          left: boxData.top_left_ra,
                          bottom: boxData.bottom_right_dec,
                          right: boxData.bottom_right_ra,
                        },
                        option.ext
                      );
                    }
                  }}
                >
                  Download {option.display}
                </button>
              ))}
              {...additionalButtons}
            </div>
          )}
          {!isNewBox && 'name' in boxData && <h3>{boxData.name}</h3>}
        </div>
        {!isNewBox && 'description' in boxData && <p>{boxData.description}</p>}
      </div>
    </div>
  );
}

type AddBoxDialogProps = {
  showAddBoxDialog: boolean;
  setShowAddBoxDialog: (showDialog: boolean) => void;
  newBoxData?: NewBoxData;
  setBoxes: (boxes: Box[]) => void;
  setActiveBoxIds: React.Dispatch<React.SetStateAction<number[]>>;
  addOptimisticHighlightBox: (action: Box) => void;
  handleAddBoxCleanup: () => void;
};

function AddBoxDialog({
  showAddBoxDialog,
  setShowAddBoxDialog,
  newBoxData,
  setBoxes,
  setActiveBoxIds,
  addOptimisticHighlightBox,
  handleAddBoxCleanup,
}: AddBoxDialogProps) {
  const [boxName, setBoxName] = useState('');
  const [boxDescription, setBoxDescription] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      const formData = new FormData(e.target as HTMLFormElement);
      const params = new URLSearchParams();

      formData.forEach((val, key) => {
        params.append(key, val.toString());
      });

      if (!newBoxData) return;

      const { top_left_ra, top_left_dec, bottom_right_ra, bottom_right_dec } =
        newBoxData;

      const top_left = [top_left_ra, top_left_dec];
      const bottom_right = [bottom_right_ra, bottom_right_dec];

      const boxData = {
        params,
        top_left,
        bottom_right,
      };

      addSubmapAsBox(
        boxData,
        setBoxes,
        setActiveBoxIds,
        addOptimisticHighlightBox
      );

      // Reset applicable state after adding a new submap box
      setBoxName('');
      setBoxDescription('');
      setShowAddBoxDialog(false);
      handleAddBoxCleanup();
    },
    [
      newBoxData,
      handleAddBoxCleanup,
      setShowAddBoxDialog,
      addOptimisticHighlightBox,
      setActiveBoxIds,
      setBoxes,
    ]
  );

  return (
    <Dialog
      dialogKey="add-box-dialog"
      openDialog={showAddBoxDialog}
      setOpenDialog={setShowAddBoxDialog}
      headerText="Add New Box Layer"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }}
      >
        <label>
          Name
          <input
            name="name"
            type="text"
            value={boxName}
            onChange={(e) => setBoxName(e.target.value)}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={boxDescription}
            onChange={(e) => setBoxDescription(e.target.value)}
          />
        </label>
        <input type="submit" value="Add Box" />
      </form>
    </Dialog>
  );
}
