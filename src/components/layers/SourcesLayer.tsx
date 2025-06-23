import { useRef, useState, useEffect, useCallback } from 'react';
import { Source } from '../../types/maps';
import { Feature, Map, Overlay } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import LayerGroup from 'ol/layer/Group';
import { Circle } from 'ol/geom';
import Select, { SelectEvent } from 'ol/interaction/Select.js';
import { click } from 'ol/events/condition';
import { MapProps } from '../OpenLayersMap';
import { transformCoords, transformSources } from '../../utils/layerUtils';

type SourcesLayerProps = {
  sourceLists: MapProps['sourceLists'];
  activeSourceListIds: MapProps['activeSourceListIds'];
  mapRef: React.RefObject<Map | null>;
  flipped: boolean;
};

export function SourcesLayer({
  sourceLists = [],
  activeSourceListIds,
  mapRef,
  flipped,
}: SourcesLayerProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [selectedSourceData, setSelectedSourceData] = useState<
    Source | undefined
  >(undefined);

  const sourceGroupRef = useRef<LayerGroup | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const handleSourceClickRef = useRef<(e: SelectEvent) => void | null>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);

  const handleSourceClick = useCallback(
    (e: SelectEvent) => {
      const select = selectInteractionRef.current;
      const popupOverlay = popupOverlayRef.current;
      if (!select || !popupOverlay) return;
      const selectedFeatures = e.selected;
      if (selectedFeatures.length === 0) {
        popupOverlay.setPosition(undefined);
        setSelectedSourceData(undefined);
        return;
      }
      selectedFeatures.forEach((feature) => {
        const { newOverlayCoords, newSourceData } = transformSources(
          feature,
          flipped
        );
        popupOverlay.setPosition(newOverlayCoords);
        setSelectedSourceData(newSourceData);
      });
    },
    [flipped]
  );

  // Create/reuse the source group layer
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clean up old layer if needed
    if (sourceGroupRef.current) {
      map.removeLayer(sourceGroupRef.current);
    }

    const newLayers = sourceLists
      .filter((sl) => activeSourceListIds.includes(sl.id))
      .map((sl) => {
        return new VectorLayer({
          source: new VectorSource({
            features: sl.sources.map((source) => {
              const originalCoords = [source.ra, source.dec];
              const syncedCoords = flipped
                ? transformCoords(originalCoords, flipped, 'layer')
                : originalCoords;
              return new Feature({
                geometry: new Circle(syncedCoords, 1 / 6),
                sourceData: source,
              });
            }),
            wrapX: false,
          }),
          style: {
            'stroke-width': 2,
            'stroke-color': '#3388FF',
            'fill-color': [51, 136, 255, 0.2],
          },
        });
      });

    const group = new LayerGroup({
      layers: newLayers,
      properties: { id: 'sourcelist-group' },
      zIndex: 500,
    });

    sourceGroupRef.current = group;
    map.addLayer(group);
  }, [sourceLists, activeSourceListIds, flipped]);

  // Set up interaction and popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !popupRef.current) return;

    // Add popup overlay
    const popupOverlay = new Overlay({
      element: popupRef.current,
    });
    popupOverlayRef.current = popupOverlay;
    map.addOverlay(popupOverlay);

    // Set up click interaction
    const select = new Select({
      condition: click,
      layers: (layer) => {
        const group = sourceGroupRef.current;
        return group ? group.getLayers().getArray().includes(layer) : false;
      },
    });

    map.addInteraction(select);
    selectInteractionRef.current = select;

    return () => {
      map.removeOverlay(popupOverlay);
      map.removeInteraction(select);
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      if (handleSourceClickRef.current) {
        selectInteractionRef.current?.un(
          'select',
          handleSourceClickRef.current
        );
      }
      handleSourceClickRef.current = handleSourceClick;
      selectInteractionRef.current?.on('select', handleSourceClick);
    }
  }, [handleSourceClick]);

  useEffect(() => {
    const map = mapRef.current;
    const sourceGroup = sourceGroupRef.current;
    if (!sourceGroup || !map) return;
    sourceGroup.getLayers().forEach((l) => {
      const source = (l as VectorLayer).getSource();
      if (source instanceof VectorSource) {
        source.getFeatures().forEach((f: Feature) => {
          if (f) {
            const { newOverlayCoords, newSourceData } = transformSources(
              f,
              flipped
            );
            const circle = f.getGeometry() as Circle;
            circle.setCenter(newOverlayCoords);
            if (newSourceData.id === selectedSourceData?.id) {
              popupOverlayRef.current?.setPosition(newOverlayCoords);
              setSelectedSourceData(newSourceData);
            }
          }
        });
      }
    });
  }, [flipped]);

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
