import { useRef, useState, useEffect, useCallback } from 'react';
import { Feature, Map, Overlay } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import LayerGroup from 'ol/layer/Group';
import { Circle } from 'ol/geom';
import Select, { SelectEvent } from 'ol/interaction/Select.js';
import { click } from 'ol/events/condition';
import { MapProps } from '../OpenLayersMap';
import {
  createSourcePopupContent,
  transformCoords,
  transformSources,
} from '../../utils/layerUtils';

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
  const [selectedSourceId, setSelectedSourceId] = useState<number | undefined>(
    undefined
  );

  const sourceGroupRef = useRef<LayerGroup | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const handleSourceClickRef = useRef<(e: SelectEvent) => void | null>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);

  const handleSourceClick = useCallback(
    (e: SelectEvent) => {
      const select = selectInteractionRef.current;
      const popupOverlay = popupOverlayRef.current;
      const popupDiv = popupRef.current;
      if (!select || !popupOverlay) return;
      const selectedFeatures = e.selected;
      if (selectedFeatures.length === 0) {
        popupOverlay.setPosition(undefined);
        setSelectedSourceId(undefined);
        if (popupDiv) {
          popupDiv.innerHTML = '';
        }
        return;
      }
      selectedFeatures.forEach((feature) => {
        const { newOverlayCoords, newSourceData } = transformSources(
          feature,
          flipped
        );
        popupOverlay.setPosition(newOverlayCoords);
        if (popupDiv) {
          createSourcePopupContent(popupDiv, newSourceData);
        }
        setSelectedSourceId(newSourceData.id);
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
            'fill-color': [0, 0, 0, 0],
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
    if (!map) return;

    const popupElement = document.createElement('div');
    popupElement.className = 'source-popup';
    popupRef.current = popupElement;

    // Add popup overlay
    const popupOverlay = new Overlay({
      element: popupElement,
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
            if (newSourceData.id === selectedSourceId) {
              popupOverlayRef.current?.setPosition(newOverlayCoords);
              setSelectedSourceId(newSourceData.id);
              if (popupRef.current) {
                createSourcePopupContent(popupRef.current, newSourceData);
              }
            }
          }
        });
      }
    });
  }, [flipped]);

  return null;
}
