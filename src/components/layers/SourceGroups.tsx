import { useRef, useEffect, useCallback, useState } from 'react';
import { Feature, Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import LayerGroup from 'ol/layer/Group';
import { Circle } from 'ol/geom';
import { getCatalogMarkerColor, transformCoords } from '../../utils/layerUtils';
import { SourceData, SourceGroup } from '../../types/sources';
import { SourceOverlay, SourcePopupData } from './SourceOverlay';
import Select, { SelectEvent } from 'ol/interaction/Select';
import { click } from 'ol/events/condition';

type SourceGroupsProps = {
  sourceGroups: SourceGroup[] | undefined;
  activeSourceGroupIds: string[];
  mapRef: React.RefObject<Map | null>;
  flipped: boolean;
};

export function SourceGroups({
  sourceGroups = [],
  activeSourceGroupIds,
  mapRef,
  flipped,
}: SourceGroupsProps) {
  const sourceGroupRef = useRef<LayerGroup | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const handleSourceClickRef = useRef<(e: SelectEvent) => void | null>(null);
  const [sourcePopupData, setSourcePopupData] = useState<
    SourcePopupData | undefined
  >();

  // Create/reuse the source group layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up old layer if needed
    if (sourceGroupRef.current) {
      map.removeLayer(sourceGroupRef.current);
    }

    const newLayers = sourceGroups
      .filter((sg) => activeSourceGroupIds.includes(sg.source_group_id))
      .map((sg) => {
        return new VectorLayer({
          source: new VectorSource({
            features: sg.sources.map((source) => {
              const originalCoords = [source.ra, source.dec];
              const syncedCoords = flipped
                ? transformCoords(originalCoords, flipped, 'layer')
                : originalCoords;
              return new Feature({
                geometry: new Circle(syncedCoords, 1 / 6),
                data: {
                  id: `${source.ra},${source.dec}`,
                  ...source,
                } as SourceData,
              });
            }),
            wrapX: true,
          }),
          style: {
            'stroke-width': 2,
            'stroke-color': getCatalogMarkerColor(sg.clientId),
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
  }, [mapRef, sourceGroups, activeSourceGroupIds, flipped]);

  // Remove active source popup if the user flips the RA; ignore lint warning
  // re: sourcePopupData bc functionality fails when including it in dep array
  useEffect(() => {
    if (sourcePopupData !== undefined) {
      setSourcePopupData(undefined);
    }
  }, [flipped]);

  // Set up interaction
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
      map.removeInteraction(select);
    };
  }, [mapRef]);

  const handleSourceClick = useCallback((e: SelectEvent) => {
    const select = selectInteractionRef.current;
    if (!select) return;

    const selectedFeatures = e.selected;
    const clickedMapCoords = e.mapBrowserEvent.coordinate;
    if (selectedFeatures.length === 0) {
      setSourcePopupData(undefined);
    } else {
      selectedFeatures.forEach((feature) => {
        const data = feature.get('data');
        setSourcePopupData({
          ...data,
          offsetX: clickedMapCoords[0],
          offsetY: clickedMapCoords[1],
        });
      });
    }
  }, []);

  // Update select event when handleSourceClick changes
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
  }, [mapRef, handleSourceClick, selectInteractionRef]);

  return (
    <SourceOverlay
      mapRef={mapRef}
      flipped={flipped}
      sourcePopupData={sourcePopupData}
    />
  );
}
