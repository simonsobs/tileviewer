import { Feature, Map, Overlay, View } from 'ol';
import { TileGrid } from 'ol/tilegrid';
import { Tile as TileLayer, Graticule } from 'ol/layer';
import { XYZ } from 'ol/source';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Band, BaselayerState, Box, Source, SourceList } from '../types/maps';
import { SERVICE_URL } from '../configs/mapSettings';
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

export type MapProps = {
  bands: Band[];
  baselayerState: BaselayerState;
  onBaseLayerChange: (baselayerId: number) => void;
  sourceLists?: SourceList[];
  activeSourceListIds: number[];
  onSelectedSourceListsChange: (e: ChangeEvent<HTMLInputElement>) => void;
  highlightBoxes: Box[] | undefined;
  activeBoxIds: number[];
  onSelectedHighlightBoxChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function OpenLayersMap({
  bands,
  baselayerState,
  onBaseLayerChange,
  sourceLists = [],
  onSelectedSourceListsChange,
  activeSourceListIds,
  highlightBoxes,
  activeBoxIds,
  onSelectedHighlightBoxChange,
}: MapProps) {
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [selectedSourceData, setSelectedSourceData] = useState<
    Source | undefined
  >(undefined);

  const { activeBaselayer, cmap, cmapValues } = baselayerState;

  const mapConfig = useMemo(
    () => ({
      target: 'map',
      view: new View({
        projection: 'EPSG:4326',
        center: [0, 0],
        zoom: 0,
        extent: [-180, -90, 180, 90],
        showFullExtent: true,
        multiWorld: true,
      }),
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
                new Feature(
                  fromExtent([
                    box.top_left_ra,
                    box.bottom_right_dec,
                    box.bottom_right_ra,
                    box.top_left_dec,
                  ]) // minX, minY, maxX, maxY
                ),
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
    const doesOverlayExist = mapRef.current.getOverlayById('source-popup');
    if (!doesOverlayExist && popupRef.current) {
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

  return (
    <div id="map">
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
