import { useRef, useState, useMemo, useEffect } from 'react';
import { Box, BoxWithPositionalData } from '../../types/maps';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature, Map, Overlay } from 'ol';
import { fromExtent } from 'ol/geom/Polygon';
import { MenuIcon } from '../icons/MenuIcon';
import { MapProps } from '../OpenLayersMap';
import { deleteSubmapBox } from '../../utils/fetchUtils';
import { BoxMenu } from '../BoxMenu';

type HightlightBoxLayerProps = {
  highlightBoxes: MapProps['highlightBoxes'];
  activeBoxIds: MapProps['activeBoxIds'];
  mapRef: React.RefObject<Map | null>;
  setActiveBoxIds: MapProps['setActiveBoxIds'];
  setBoxes: MapProps['setBoxes'];
  submapData: MapProps['submapData'];
};

export function HighlightBoxLayer({
  highlightBoxes,
  activeBoxIds,
  mapRef,
  setActiveBoxIds,
  setBoxes,
  submapData,
}: HightlightBoxLayerProps) {
  const boxOverlayRef = useRef<HTMLDivElement | null>(null);
  const [selectedBoxData, setSelectedBoxData] = useState<
    BoxWithPositionalData | undefined
  >(undefined);
  const [showMenu, setShowMenu] = useState(false);

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

  return (
    <>
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
    </>
  );
}
