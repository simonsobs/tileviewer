import { useRef, useState, useEffect, useMemo } from 'react';
import { Source } from '../../types/maps';
import { Feature, Map, Overlay } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import LayerGroup from 'ol/layer/Group';
import { Circle } from 'ol/geom';
import Select from 'ol/interaction/Select.js';
import { click } from 'ol/events/condition';
import { MapProps } from '../OpenLayersMap';
import { transform } from 'ol/proj';

type SourcesLayerProps = {
  sourceLists: MapProps['sourceLists'];
  activeSourceListIds: MapProps['activeSourceListIds'];
  mapRef: React.RefObject<Map | null>;
};

export function SourcesLayer({
  sourceLists = [],
  activeSourceListIds,
  mapRef,
}: SourcesLayerProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [selectedSourceData, setSelectedSourceData] = useState<
    Source | undefined
  >(undefined);

  const sourceOverlays = useMemo(() => {
    if (!sourceLists.length) return [];
    const projection = mapRef.current?.getView().getProjection();
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
                  features: sl.sources.map((source) => {
                    let coords = [source.ra, source.dec];
                    let rad = 1;
                    if (projection && projection.getCode() === 'EPSG:3857') {
                      coords = transform(coords, 'EPSG:4326', 'EPSG:3857');
                      rad = 100000;
                    }
                    return new Feature({
                      geometry: new Circle(coords, rad),
                      sourceData: source,
                    });
                  }),
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

        const projection = mapRef.current?.getView().getProjection();

        selectedFeatures.forEach((feature) => {
          const sourceData = feature.get('sourceData') as Source;
          let coords = [sourceData.ra, sourceData.dec];
          if (projection && projection.getCode() === 'EPSG:3857') {
            coords = transform(coords, 'EPSG:4326', 'EPSG:3857');
          }
          popupOverlay.setPosition(coords);
          setSelectedSourceData(sourceData);
        });
      });
    }
  }, [mapRef.current, popupRef.current, sourceOverlays, activeSourceListIds]);

  return (
    <div ref={popupRef} className="source-popup">
      {selectedSourceData && (
        <div className="source-popup-content">
          {selectedSourceData.name ? <h3>{selectedSourceData.name}</h3> : null}
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
  );
}
