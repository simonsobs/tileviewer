import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, BoxWithDimensions } from '../../types/maps';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature, Map, MapBrowserEvent, Overlay } from 'ol';
import Polygon, { fromExtent } from 'ol/geom/Polygon';
import { MenuIcon } from '../icons/MenuIcon';
import { MapProps } from '../OpenLayersMap';
import { deleteSubmapBox } from '../../utils/fetchUtils';
import { BoxMenu } from '../BoxMenu';
import { transformBoxes, isBoxSynced } from '../../utils/layerUtils';

type HightlightBoxLayerProps = {
  highlightBoxes: MapProps['highlightBoxes'];
  activeBoxIds: MapProps['activeBoxIds'];
  mapRef: React.RefObject<Map | null>;
  setActiveBoxIds: MapProps['setActiveBoxIds'];
  setBoxes: MapProps['setBoxes'];
  submapData: MapProps['submapData'];
  flipped: boolean;
};

export function HighlightBoxLayer({
  highlightBoxes,
  activeBoxIds,
  mapRef,
  setActiveBoxIds,
  setBoxes,
  submapData,
  flipped,
}: HightlightBoxLayerProps) {
  const boxOverlayRef = useRef<HTMLDivElement | null>(null);
  const [selectedBoxData, setSelectedBoxData] = useState<
    BoxWithDimensions | undefined
  >(undefined);
  const [showMenu, setShowMenu] = useState(false);
  const addedLayerIdsRef = useRef<Set<string>>(new Set());
  const overlayRef = useRef<Overlay>(null);
  const handleBoxHoverRef = useRef<(e: MapBrowserEvent) => void>(null);

  const handleBoxHover = useCallback(
    (e: MapBrowserEvent) => {
      if (!e.map.hasFeatureAtPixel(e.pixel)) {
        overlayRef.current?.setPosition(undefined);
        setSelectedBoxData(undefined);
        setShowMenu(false);
        return;
      }

      e.map.forEachFeatureAtPixel(e.pixel, (f) => {
        const boxData = f.get('boxData') as Box;
        if (!boxData) return;

        const topLeft = e.map.getPixelFromCoordinate([
          boxData.top_left_ra,
          boxData.top_left_dec,
        ]);
        const bottomRight = e.map.getPixelFromCoordinate([
          boxData.bottom_right_ra,
          boxData.bottom_right_dec,
        ]);

        const width = Math.abs(topLeft[0] - bottomRight[0]);
        const height = Math.abs(topLeft[1] - bottomRight[1]);

        overlayRef.current!.setPosition([
          boxData.top_left_ra,
          boxData.top_left_dec,
        ]);

        setSelectedBoxData({
          ...boxData,
          width,
          height,
        });
      });
    },
    [flipped]
  );

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const existingLayers = map.getLayers().getArray();

    // Build a Set of current valid highlight box IDs
    const validBoxIds = new Set(
      highlightBoxes
        ?.filter((b) => activeBoxIds.includes(b.id))
        .map((b) => b.id)
    );

    // Remove old layers not in current valid list
    existingLayers.forEach((layer) => {
      const id = layer.get('id');
      if (typeof id === 'string' && id.startsWith('highlight-box-')) {
        const boxId = id.replace('highlight-box-', '');
        if (!validBoxIds.has(Number(boxId))) {
          map.removeLayer(layer);
          addedLayerIdsRef.current.delete(id);
        }
      }
    });

    // Add new layers for valid boxes not yet added
    highlightBoxes?.forEach((box) => {
      const layerId = `highlight-box-${box.id}`;
      if (!activeBoxIds.includes(box.id)) return;
      if (addedLayerIdsRef.current.has(layerId)) return;

      const boxPosition = transformBoxes(
        {
          top_left_ra: box.top_left_ra,
          top_left_dec: box.top_left_dec,
          bottom_right_ra: box.bottom_right_ra,
          bottom_right_dec: box.bottom_right_dec,
        },
        flipped
      );

      const layer = new VectorLayer({
        properties: { id: layerId },
        source: new VectorSource({
          features: [
            new Feature({
              geometry: fromExtent([
                boxPosition.top_left_ra,
                boxPosition.bottom_right_dec,
                boxPosition.bottom_right_ra,
                boxPosition.top_left_dec,
              ]),
              boxData: {
                ...box,
                ...boxPosition,
              },
            }),
          ],
          wrapX: false,
        }),
        zIndex: 500,
      });

      map?.addLayer(layer);
      addedLayerIdsRef.current.add(layerId);
    });
  }, [mapRef.current, highlightBoxes, activeBoxIds, flipped]);

  useEffect(() => {
    if (!mapRef.current || !boxOverlayRef.current) return;
    if (!overlayRef.current) {
      overlayRef.current = new Overlay({
        element: boxOverlayRef.current,
        id: 'box-overlay',
      });
      mapRef.current.addOverlay(overlayRef.current);
    }
  }, [mapRef.current, boxOverlayRef.current]);

  useEffect(() => {
    if (mapRef.current) {
      if (handleBoxHoverRef.current) {
        mapRef.current.un('pointermove', handleBoxHoverRef.current);
      }
      handleBoxHoverRef.current = handleBoxHover;
      mapRef.current.on('pointermove', handleBoxHover);
    }
  }, [mapRef.current, handleBoxHover]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getAllLayers().forEach((l) => {
      const layerId = l.getProperties()['id'] as string;
      if (addedLayerIdsRef.current.has(layerId)) {
        const vectorSource = l.getSource();
        if (vectorSource instanceof VectorSource) {
          const feature = vectorSource.getFeatures()[0];
          const box = feature.getGeometry() as Polygon;
          const currentData = feature.get('boxData');
          const id = Number(layerId.replace('highlight-box-', ''));
          const originalBox = highlightBoxes?.find((b) => b.id === id);

          if (!originalBox) return;

          const originalExtent = {
            top_left_ra: originalBox.top_left_ra,
            bottom_right_dec: originalBox.bottom_right_dec,
            bottom_right_ra: originalBox.bottom_right_ra,
            top_left_dec: originalBox.top_left_dec,
          };

          if (!flipped) {
            box.setCoordinates([
              [
                [originalBox.top_left_ra, originalBox.top_left_dec],
                [originalBox.bottom_right_ra, originalBox.top_left_dec],
                [originalBox.bottom_right_ra, originalBox.bottom_right_dec],
                [originalBox.top_left_ra, originalBox.bottom_right_dec],
                [originalBox.top_left_ra, originalBox.top_left_dec],
              ],
            ]);
            const newData = {
              ...currentData,
              top_left_ra: originalBox.top_left_ra,
              top_left_dec: originalBox.top_left_dec,
              bottom_right_ra: originalBox.bottom_right_ra,
              bottom_right_dec: originalBox.bottom_right_dec,
            };
            feature.set('boxData', newData);
          } else {
            const currentExtentArray = box.getExtent();
            const currentExtent = {
              top_left_ra: currentExtentArray[0],
              bottom_right_dec: currentExtentArray[1],
              bottom_right_ra: currentExtentArray[2],
              top_left_dec: currentExtentArray[3],
            };

            if (!isBoxSynced(currentExtent, originalExtent)) {
              return;
            }

            const newExtent = transformBoxes(currentExtent, flipped);
            box.setCoordinates([
              [
                [newExtent.top_left_ra, newExtent.top_left_dec],
                [newExtent.bottom_right_ra, newExtent.top_left_dec],
                [newExtent.bottom_right_ra, newExtent.bottom_right_dec],
                [newExtent.top_left_ra, newExtent.bottom_right_dec],
                [newExtent.top_left_ra, newExtent.top_left_dec],
              ],
            ]);
            const newData = {
              ...currentData,
              top_left_ra: newExtent.top_left_ra,
              top_left_dec: newExtent.top_left_dec,
              bottom_right_ra: newExtent.bottom_right_ra,
              bottom_right_dec: newExtent.bottom_right_dec,
            };
            feature.set('boxData', newData);
          }
        }
      }
    });
  }, [flipped, highlightBoxes]);

  return (
    <>
      <div
        ref={boxOverlayRef}
        className="box-menu-hover-container"
        style={{
          width: selectedBoxData && selectedBoxData.width,
          height: selectedBoxData && selectedBoxData.height,
        }}
      >
        {!showMenu && selectedBoxData && (
          <div>
            <div className="box-menu-header">
              <button
                className={'map-btn menu-btn'}
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
          mapRef={mapRef}
          isNewBox={false}
          flipped={flipped}
          boxData={selectedBoxData}
          setShowMenu={setShowMenu}
          showMenu={showMenu}
          additionalButtons={[
            <button
              className="map-btn menu-btn"
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
              className="map-btn menu-btn danger-action"
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
    </>
  );
}
